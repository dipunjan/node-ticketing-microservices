import { rabbitmq } from "@dip-university/common";

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://rabbitmq-srv:5672";

// Queue definitions
export const QUEUES = {
	USER_CREATED: "user:created",
	USER_UPDATED: "user:updated",
	TICKET_CREATED: "ticket:created",
	TICKET_UPDATED: "ticket:updated",
} as const;

/**
 * Check if connected
 */
export function isConnected(): boolean {
	return rabbitmq.isConnected();
}

/**
 * Initialize RabbitMQ connection and set up consumers
 */
export async function initRabbitMQ(): Promise<void> {
	await rabbitmq.connect(RABBITMQ_URL);

	// Set up consumers
	await rabbitmq.consume(
		QUEUES.TICKET_CREATED,
		async (msg) => {
			if (msg) {
				try {
					const data = JSON.parse(msg.content.toString());
					console.log(`[Auth] Received ticket:created event:`, data);
					rabbitmq.ack(msg);
				} catch (err) {
					console.error("[Auth] Error processing ticket:created:", err);
					rabbitmq.nack(msg, false);
				}
			}
		},
		{ noAck: false }
	);

	console.log("[Auth] RabbitMQ initialized");
}

/**
 * Publish a user:created event
 */
export async function publishUserCreated(data: {
	id: string;
	email: string;
}): Promise<void> {
	await rabbitmq.publish(QUEUES.USER_CREATED, {
		type: "user:created",
		data,
		timestamp: new Date().toISOString(),
	});
	console.log(`[Auth] Published user:created event for ${data.email}`);
}

/**
 * Publish a user:updated event
 */
export async function publishUserUpdated(data: {
	id: string;
	email: string;
	changes: Record<string, unknown>;
}): Promise<void> {
	await rabbitmq.publish(QUEUES.USER_UPDATED, {
		type: "user:updated",
		data,
		timestamp: new Date().toISOString(),
	});
	console.log(`[Auth] Published user:updated event for ${data.email}`);
}
