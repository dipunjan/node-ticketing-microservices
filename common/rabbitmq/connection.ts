import amqp, {
	ChannelWrapper,
	AmqpConnectionManager,
} from "amqp-connection-manager";
import { ConsumeMessage, Channel } from "amqplib";

// Module-level state
let connection: AmqpConnectionManager | null = null;
let channelWrapper: ChannelWrapper | null = null;

export interface ConsumeOptions {
	noAck?: boolean;
}

type MessageHandler = (msg: ConsumeMessage | null) => void | Promise<void>;

/**
 * Connect to RabbitMQ with automatic reconnection
 */
export async function connect(url: string): Promise<ChannelWrapper> {
	if (channelWrapper && connection) {
		return channelWrapper;
	}

	connection = amqp.connect([url]);

	connection.on("connect", () => {
		console.log("[RabbitMQ] Connected successfully");
	});

	connection.on("disconnect", (err) => {
		console.warn(
			"[RabbitMQ] Disconnected, will reconnect...",
			err.err?.message
		);
	});

	connection.on("connectFailed", (err) => {
		console.error("[RabbitMQ] Connection attempt failed:", err.err?.message);
	});

	channelWrapper = connection.createChannel({
		json: true,
		setup: (channel: Channel) => {
			console.log("[RabbitMQ] Channel created");
			return Promise.resolve();
		},
	});

	// Wait for channel to be ready
	await channelWrapper.waitForConnect();
	return channelWrapper;
}

/**
 * Check if connected to RabbitMQ
 */
export function isConnected(): boolean {
	return connection?.isConnected() ?? false;
}

/**
 * Get the current channel wrapper
 */
export function getChannel(): ChannelWrapper | null {
	return channelWrapper;
}

/**
 * Publish a message to a queue
 */
export async function publish(
	queue: string,
	message: string | Buffer | object
): Promise<void> {
	if (!channelWrapper) {
		throw new Error("[RabbitMQ] Not connected. Call connect() first.");
	}

	await channelWrapper.addSetup((channel: Channel) => {
		return channel.assertQueue(queue, { durable: true });
	});

	await channelWrapper.sendToQueue(queue, message, { persistent: true });
}

/**
 * Consume messages from a queue
 */
export async function consume(
	queue: string,
	handler: MessageHandler,
	options: ConsumeOptions = {}
): Promise<string> {
	if (!channelWrapper) {
		throw new Error("[RabbitMQ] Not connected. Call connect() first.");
	}

	let consumerTag = "";

	await channelWrapper.addSetup(async (channel: Channel) => {
		await channel.assertQueue(queue, { durable: true });
		const result = await channel.consume(
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
						channel.nack(msg, false, true);
					}
				}
			},
			{ noAck: options.noAck ?? false }
		);
		consumerTag = result.consumerTag;
	});

	console.log(`[RabbitMQ] Consuming from queue: ${queue}`);
	return consumerTag;
}

/**
 * Acknowledge a message
 */
export function ack(msg: ConsumeMessage): void {
	channelWrapper?.ack(msg);
}

/**
 * Negative acknowledge a message
 */
export function nack(msg: ConsumeMessage, requeue = true): void {
	channelWrapper?.nack(msg, false, requeue);
}

/**
 * Close the connection gracefully
 */
export async function close(): Promise<void> {
	try {
		if (channelWrapper) {
			await channelWrapper.close();
			channelWrapper = null;
		}
		if (connection) {
			await connection.close();
			connection = null;
		}
		console.log("[RabbitMQ] Connection closed gracefully");
	} catch (err) {
		console.error("[RabbitMQ] Error closing connection:", err);
	}
}
