import { RabbitMQManager } from "@dip-university/common";

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://rabbitmq-srv:5672";

// Queue definitions - define all queues this service uses
export const QUEUES = {
	USER_CREATED: "user:created",
	USER_UPDATED: "user:updated",
	TICKET_CREATED: "ticket:created",
	TICKET_UPDATED: "ticket:updated",
} as const;

let rabbitInstance: RabbitMQManager | null = null;

/**
 * Get the RabbitMQ singleton instance
 */
export function getRabbitMQ(): RabbitMQManager {
	if (!rabbitInstance) {
		rabbitInstance = RabbitMQManager.getInstance({
			url: RABBITMQ_URL,
			maxRetries: 0, // Infinite retries
			initialRetryDelay: 1000,
			maxRetryDelay: 30000,
		});
	}
	return rabbitInstance;
}

/**
 * Initialize RabbitMQ connection and set up consumers
 */
export async function initRabbitMQ(): Promise<void> {
	const rabbit = getRabbitMQ();

	// Set up event handlers
	rabbit.on("connected", () => {
		console.log("[Tickets] RabbitMQ connected");
	});

	rabbit.on("reconnected", () => {
		console.log("[Tickets] RabbitMQ reconnected");
	});

	rabbit.on("error", (err) => {
		console.error("[Tickets] RabbitMQ error:", err.message);
	});

	// Connect first
	await rabbit.connect();

	// Set up consumers for queues this service listens to
	await setupConsumers(rabbit);

	console.log("[Tickets] RabbitMQ initialized");
}

/**
 * Set up message consumers for this service
 */
async function setupConsumers(rabbit: RabbitMQManager): Promise<void> {
	// Listen for user events
	await rabbit.consume(
		QUEUES.USER_CREATED,
		async (msg) => {
			if (msg) {
				try {
					const data = JSON.parse(msg.content.toString());
					console.log(`[Tickets] Received user:created event:`, data);
					// Handle the event (e.g., create user record for tickets)
					rabbit.ack(msg);
				} catch (err) {
					console.error("[Tickets] Error processing user:created:", err);
					rabbit.nack(msg, false); // Don't requeue malformed messages
				}
			}
		},
		{ noAck: false }
	);

	await rabbit.consume(
		QUEUES.USER_UPDATED,
		async (msg) => {
			if (msg) {
				try {
					const data = JSON.parse(msg.content.toString());
					console.log(`[Tickets] Received user:updated event:`, data);
					// Handle the event
					rabbit.ack(msg);
				} catch (err) {
					console.error("[Tickets] Error processing user:updated:", err);
					rabbit.nack(msg, false);
				}
			}
		},
		{ noAck: false }
	);

	console.log(
		`[Tickets] Consuming from: ${QUEUES.USER_CREATED}, ${QUEUES.USER_UPDATED}`
	);
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
	const rabbit = getRabbitMQ();
	await rabbit.publish(QUEUES.TICKET_CREATED, {
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
	const rabbit = getRabbitMQ();
	await rabbit.publish(QUEUES.TICKET_UPDATED, {
		type: "ticket:updated",
		data,
		timestamp: new Date().toISOString(),
	});
	console.log(`[Tickets] Published ticket:updated event for ${data.id}`);
}
