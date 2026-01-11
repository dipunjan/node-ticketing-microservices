import amqp, {
	Connection,
	Channel,
	ConsumeMessage,
	ChannelModel,
} from "amqplib";
import { EventEmitter } from "events";

export interface RabbitMQConfig {
	url: string;
	maxRetries?: number;
	initialRetryDelay?: number;
	maxRetryDelay?: number;
	heartbeat?: number;
}

export interface QueueOptions {
	durable?: boolean;
	exclusive?: boolean;
	autoDelete?: boolean;
	arguments?: Record<string, unknown>;
}

export interface ConsumeOptions {
	noAck?: boolean;
	exclusive?: boolean;
	priority?: number;
}

type MessageHandler = (msg: ConsumeMessage | null) => void | Promise<void>;

/**
 * Production-ready RabbitMQ connection manager with:
 * - Exponential backoff retry
 * - Automatic reconnection
 * - Connection pooling (singleton)
 * - Graceful shutdown
 * - Event-based status notifications
 */
class RabbitMQManager extends EventEmitter {
	private static instances: Map<string, RabbitMQManager> = new Map();

	private config: Required<RabbitMQConfig>;
	private connection: ChannelModel | null = null;
	private channel: Channel | null = null;
	private isConnecting: boolean = false;
	private isShuttingDown: boolean = false;
	private currentRetry: number = 0;
	private consumers: Map<
		string,
		{ queue: string; handler: MessageHandler; options: ConsumeOptions }
	> = new Map();

	private constructor(config: RabbitMQConfig) {
		super();
		this.config = {
			url: config.url,
			maxRetries: config.maxRetries ?? 0, // 0 = infinite
			initialRetryDelay: config.initialRetryDelay ?? 1000,
			maxRetryDelay: config.maxRetryDelay ?? 30000,
			heartbeat: config.heartbeat ?? 60,
		};
		this.setupGracefulShutdown();
	}

	/**
	 * Get or create a singleton instance for the given URL
	 */
	static getInstance(config: RabbitMQConfig): RabbitMQManager {
		const key = config.url;
		if (!RabbitMQManager.instances.has(key)) {
			RabbitMQManager.instances.set(key, new RabbitMQManager(config));
		}
		return RabbitMQManager.instances.get(key)!;
	}

	/**
	 * Connect to RabbitMQ with exponential backoff retry
	 */
	async connect(): Promise<Channel> {
		if (this.channel && this.connection) {
			return this.channel;
		}

		if (this.isConnecting) {
			// Wait for existing connection attempt
			return new Promise((resolve, reject) => {
				const onConnected = () => {
					this.off("error", onError);
					resolve(this.channel!);
				};
				const onError = (err: Error) => {
					this.off("connected", onConnected);
					reject(err);
				};
				this.once("connected", onConnected);
				this.once("error", onError);
			});
		}

		this.isConnecting = true;
		this.currentRetry = 0;

		while (!this.isShuttingDown) {
			try {
				const urlWithHeartbeat = this.addHeartbeat(this.config.url);
				console.log(
					`[RabbitMQ] Connecting to ${this.maskUrl(this.config.url)}...`
				);

				this.connection = await amqp.connect(urlWithHeartbeat);
				this.channel = await this.connection.createChannel();

				this.setupConnectionHandlers();

				this.isConnecting = false;
				this.currentRetry = 0;
				console.log("[RabbitMQ] Connected successfully");
				this.emit("connected");

				return this.channel;
			} catch (err) {
				this.currentRetry++;
				const delay = this.calculateRetryDelay();

				if (
					this.config.maxRetries > 0 &&
					this.currentRetry >= this.config.maxRetries
				) {
					this.isConnecting = false;
					const error = new Error(
						`[RabbitMQ] Failed to connect after ${this.currentRetry} attempts: ${err}`
					);
					this.emit("error", error);
					throw error;
				}

				console.log(
					`[RabbitMQ] Connection failed (attempt ${this.currentRetry}), retrying in ${delay}ms...`
				);
				await this.sleep(delay);
			}
		}

		this.isConnecting = false;
		throw new Error("[RabbitMQ] Connection aborted due to shutdown");
	}

	/**
	 * Assert a queue exists
	 */
	async assertQueue(queue: string, options: QueueOptions = {}): Promise<void> {
		const channel = await this.connect();
		await channel.assertQueue(queue, {
			durable: options.durable ?? true,
			exclusive: options.exclusive ?? false,
			autoDelete: options.autoDelete ?? false,
			arguments: options.arguments,
		});
	}

	/**
	 * Publish a message to a queue
	 */
	async publish(
		queue: string,
		message: string | Buffer | object
	): Promise<boolean> {
		const channel = await this.connect();
		await this.assertQueue(queue);

		const content =
			typeof message === "object" && !Buffer.isBuffer(message)
				? Buffer.from(JSON.stringify(message))
				: Buffer.isBuffer(message)
				? message
				: Buffer.from(message);

		return channel.sendToQueue(queue, content, { persistent: true });
	}

	/**
	 * Consume messages from a queue
	 */
	async consume(
		queue: string,
		handler: MessageHandler,
		options: ConsumeOptions = {}
	): Promise<string> {
		const channel = await this.connect();
		await this.assertQueue(queue);

		const { consumerTag } = await channel.consume(
			queue,
			async (msg) => {
				try {
					await handler(msg);
				} catch (err) {
					console.error(
						`[RabbitMQ] Error processing message from ${queue}:`,
						err
					);
					if (msg && !options.noAck) {
						channel.nack(msg, false, true); // Requeue on error
					}
				}
			},
			{ noAck: options.noAck ?? false }
		);

		// Store consumer for reconnection
		this.consumers.set(consumerTag, { queue, handler, options });
		console.log(`[RabbitMQ] Consuming from queue: ${queue}`);

		return consumerTag;
	}

	/**
	 * Acknowledge a message
	 */
	ack(msg: ConsumeMessage): void {
		if (this.channel) {
			this.channel.ack(msg);
		}
	}

	/**
	 * Negative acknowledge a message
	 */
	nack(msg: ConsumeMessage, requeue: boolean = true): void {
		if (this.channel) {
			this.channel.nack(msg, false, requeue);
		}
	}

	/**
	 * Check if connected
	 */
	isConnected(): boolean {
		return this.connection !== null && this.channel !== null;
	}

	/**
	 * Close connection gracefully
	 */
	async close(): Promise<void> {
		this.isShuttingDown = true;

		try {
			if (this.channel) {
				await this.channel.close();
				this.channel = null;
			}
			if (this.connection) {
				await this.connection.close();
				this.connection = null;
			}
			console.log("[RabbitMQ] Connection closed gracefully");
		} catch (err) {
			console.error("[RabbitMQ] Error closing connection:", err);
		}

		RabbitMQManager.instances.delete(this.config.url);
		this.emit("closed");
	}

	private setupConnectionHandlers(): void {
		if (!this.connection || !this.channel) return;

		this.connection.on("error", (err) => {
			console.error("[RabbitMQ] Connection error:", err.message);
			this.emit("error", err);
		});

		this.connection.on("close", () => {
			if (!this.isShuttingDown) {
				console.log(
					"[RabbitMQ] Connection closed unexpectedly, reconnecting..."
				);
				this.connection = null;
				this.channel = null;
				this.reconnect();
			}
		});

		this.channel.on("error", (err) => {
			console.error("[RabbitMQ] Channel error:", err.message);
		});

		this.channel.on("close", () => {
			if (!this.isShuttingDown) {
				console.log("[RabbitMQ] Channel closed unexpectedly");
				this.channel = null;
			}
		});
	}

	private async reconnect(): Promise<void> {
		if (this.isShuttingDown) return;

		try {
			await this.connect();
			// Restore consumers after reconnection
			for (const [, consumer] of this.consumers) {
				await this.consume(consumer.queue, consumer.handler, consumer.options);
			}
			this.emit("reconnected");
		} catch (err) {
			console.error("[RabbitMQ] Reconnection failed:", err);
		}
	}

	private setupGracefulShutdown(): void {
		const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM", "SIGQUIT"];

		signals.forEach((signal) => {
			process.on(signal, async () => {
				console.log(`[RabbitMQ] Received ${signal}, closing connection...`);
				await this.close();
			});
		});
	}

	private calculateRetryDelay(): number {
		const delay = Math.min(
			this.config.initialRetryDelay * Math.pow(2, this.currentRetry - 1),
			this.config.maxRetryDelay
		);
		// Add jitter (±10%)
		const jitter = delay * 0.1 * (Math.random() * 2 - 1);
		return Math.floor(delay + jitter);
	}

	private addHeartbeat(url: string): string {
		const separator = url.includes("?") ? "&" : "?";
		return `${url}${separator}heartbeat=${this.config.heartbeat}`;
	}

	private maskUrl(url: string): string {
		return url.replace(/\/\/([^:]+):([^@]+)@/, "//***:***@");
	}

	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}

// Legacy export for backward compatibility
class RabbitMQ {
	private manager: RabbitMQManager;

	constructor(url: string) {
		this.manager = RabbitMQManager.getInstance({ url });
	}

	async connect(): Promise<Channel> {
		return this.manager.connect();
	}

	async close(): Promise<void> {
		return this.manager.close();
	}
}

export { RabbitMQManager, RabbitMQ };
export default RabbitMQ;
