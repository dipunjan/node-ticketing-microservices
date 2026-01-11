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

	// Set up consumers for user events
	await rabbitmq.consume(
		QUEUES.USER_CREATED,
		async (msg) => {
			if (msg) {
				try {
					const data = JSON.parse(msg.content.toString());
					console.log(`[Tickets] Received user:created event:`, data);
					rabbitmq.ack(msg);
				} catch (err) {
					console.error("[Tickets] Error processing user:created:", err);
					rabbitmq.nack(msg, false);
				}
			}
		},
		{ noAck: false }
	);

	await rabbitmq.consume(
		QUEUES.USER_UPDATED,
		async (msg) => {
			if (msg) {
				try {
					const data = JSON.parse(msg.content.toString());
					console.log(`[Tickets] Received user:updated event:`, data);
					rabbitmq.ack(msg);
				} catch (err) {
					console.error("[Tickets] Error processing user:updated:", err);
					rabbitmq.nack(msg, false);
				}
			}
		},
		{ noAck: false }
	);

	console.log("[Tickets] RabbitMQ initialized");
}

/**
 * Publish a ticket:created event
 */
export async function publishTicketCreated(data: {
	id: string;
	title: string;
	price: string;
	userId: string;
}): Promise<void> {
	await rabbitmq.publish(QUEUES.TICKET_CREATED, {
		type: "ticket:created",
		data,
		timestamp: new Date().toISOString(),
	});
	console.log(`[Tickets] Published ticket:created event for ${data.title}`);
}

/**
 * Publish a ticket:updated event
 */
export async function publishTicketUpdated(data: {
	id: string;
	title?: string;
	price?: string;
	changes: Record<string, unknown>;
}): Promise<void> {
	await rabbitmq.publish(QUEUES.TICKET_UPDATED, {
		type: "ticket:updated",
		data,
		timestamp: new Date().toISOString(),
	});
	console.log(`[Tickets] Published ticket:updated event for ${data.id}`);
}
