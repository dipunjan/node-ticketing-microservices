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
		console.log("[Auth] RabbitMQ connected");
	});

	rabbit.on("reconnected", () => {
		console.log("[Auth] RabbitMQ reconnected");
	});

	rabbit.on("error", (err) => {
		console.error("[Auth] RabbitMQ error:", err.message);
	});

	// Connect first
	await rabbit.connect();

	// Set up consumers for queues this service listens to
	await setupConsumers(rabbit);

	console.log("[Auth] RabbitMQ initialized");
}

/**
 * Set up message consumers for this service
 */
async function setupConsumers(rabbit: RabbitMQManager): Promise<void> {
	// Listen for ticket events (example)
	await rabbit.consume(
		QUEUES.TICKET_CREATED,
		async (msg) => {
			if (msg) {
				try {
					const data = JSON.parse(msg.content.toString());
					console.log(`[Auth] Received ticket:created event:`, data);
					// Handle the event (e.g., update user's ticket count)
					rabbit.ack(msg);
				} catch (err) {
					console.error("[Auth] Error processing ticket:created:", err);
					rabbit.nack(msg, false); // Don't requeue malformed messages
				}
			}
		},
		{ noAck: false }
	);

	console.log(`[Auth] Consuming from: ${QUEUES.TICKET_CREATED}`);
}

/**
 * Publish a user:created event
 */
export async function publishUserCreated(data: {
	id: string;
	email: string;
}): Promise<void> {
	const rabbit = getRabbitMQ();
	await rabbit.publish(QUEUES.USER_CREATED, {
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
	const rabbit = getRabbitMQ();
	await rabbit.publish(QUEUES.USER_UPDATED, {
		type: "user:updated",
		data,
		timestamp: new Date().toISOString(),
	});
	console.log(`[Auth] Published user:updated event for ${data.email}`);
}
