import amqp, { Channel, ChannelModel, ConsumeMessage } from "amqplib";

// Module-level state
let connection: ChannelModel | null = null;
let channel: Channel | null = null;
let isConnecting = false;
let currentUrl: string | null = null;

export interface ConsumeOptions {
	noAck?: boolean;
}

type MessageHandler = (msg: ConsumeMessage | null) => void | Promise<void>;

/**
 * Connect to RabbitMQ (with simple retry)
 */
export async function connect(url: string): Promise<Channel> {
	// Return existing channel if connected
	if (channel && connection) {
		return channel;
	}

	// Prevent multiple simultaneous connection attempts
	if (isConnecting) {
		return new Promise((resolve) => {
			const interval = setInterval(() => {
				if (channel) {
					clearInterval(interval);
					resolve(channel);
				}
			}, 100);
		});
	}

	isConnecting = true;
	currentUrl = url;

	let retryDelay = 1000;
	const maxDelay = 30000;

	while (true) {
		try {
			console.log("[RabbitMQ] Connecting...");
			connection = await amqp.connect(url);
			channel = await connection.createChannel();

			// Handle connection close
			connection.on("close", () => {
				console.log("[RabbitMQ] Connection closed");
				connection = null;
				channel = null;
			});

			connection.on("error", (err) => {
				console.error("[RabbitMQ] Connection error:", err.message);
			});

			isConnecting = false;
			console.log("[RabbitMQ] Connected");
			return channel;
		} catch (err) {
			console.log(
				`[RabbitMQ] Connection failed, retrying in ${retryDelay}ms...`
			);
			await sleep(retryDelay);
			retryDelay = Math.min(retryDelay * 2, maxDelay);
		}
	}
}

/**
 * Check if connected to RabbitMQ
 */
export function isConnected(): boolean {
	return connection !== null && channel !== null;
}

/**
 * Get the current channel (must call connect first)
 */
export function getChannel(): Channel | null {
	return channel;
}

/**
 * Publish a message to a queue
 */
export async function publish(
	queue: string,
	message: string | Buffer | object
): Promise<boolean> {
	if (!channel || !currentUrl) {
		throw new Error("[RabbitMQ] Not connected. Call connect() first.");
	}

	await channel.assertQueue(queue, { durable: true });

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
export async function consume(
	queue: string,
	handler: MessageHandler,
	options: ConsumeOptions = {}
): Promise<string> {
	if (!channel) {
		throw new Error("[RabbitMQ] Not connected. Call connect() first.");
	}

	await channel.assertQueue(queue, { durable: true });

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
					channel?.nack(msg, false, true);
				}
			}
		},
		{ noAck: options.noAck ?? false }
	);

	console.log(`[RabbitMQ] Consuming from queue: ${queue}`);
	return consumerTag;
}

/**
 * Acknowledge a message
 */
export function ack(msg: ConsumeMessage): void {
	channel?.ack(msg);
}

/**
 * Negative acknowledge a message
 */
export function nack(msg: ConsumeMessage, requeue = true): void {
	channel?.nack(msg, false, requeue);
}

/**
 * Close the connection
 */
export async function close(): Promise<void> {
	try {
		if (channel) {
			await channel.close();
			channel = null;
		}
		if (connection) {
			await connection.close();
			connection = null;
		}
		console.log("[RabbitMQ] Connection closed");
	} catch (err) {
		console.error("[RabbitMQ] Error closing connection:", err);
	}
}

// Helper
function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
