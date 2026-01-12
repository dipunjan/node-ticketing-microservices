import amqp, {
	ChannelWrapper,
	AmqpConnectionManager,
} from "amqp-connection-manager";
import { ConsumeMessage, Options } from "amqplib";
import { IEventBus, EventHandler } from "./event-bus.interface";

/**
 * RabbitMQ implementation of EventBus
 * Uses Topic Exchange pattern for fanout support
 *
 * Pattern: Producer → Exchange → [routing key] → Multiple Queues
 *
 * Example: order.created event
 *   - notifications-service listens on "notifications.order.created" queue
 *   - billing-service listens on "billing.order.created" queue
 *   - Both receive the same event!
 */

// Single exchange for all events
const EXCHANGE_NAME = "ticketing-events";
const EXCHANGE_TYPE = "topic"; // Supports pattern matching like "order.*"

class RabbitMQEventBus implements IEventBus {
	private connection: AmqpConnectionManager | null = null;
	private channel: ChannelWrapper | null = null;
	private connected = false;

	/**
	 * Connect to RabbitMQ - call at startup
	 */
	async connect(): Promise<void> {
		if (this.connected && this.channel) return;

		const url = process.env.RABBITMQ_URL;
		if (!url) {
			throw new Error(
				"[EventBus] RABBITMQ_URL environment variable is not set"
			);
		}

		return new Promise((resolve, reject) => {
			this.connection = amqp.connect([url], {
				heartbeatIntervalInSeconds: 5,
				reconnectTimeInSeconds: 3,
			});

			this.connection.on("connect", () => {
				console.log("[EventBus] ✅ Connected to RabbitMQ");
				this.connected = true;
			});

			this.connection.on("disconnect", (params) => {
				console.log("[EventBus] ⚠️ Disconnected:", params?.err?.message);
				this.connected = false;
			});

			this.connection.on("connectFailed", (params) => {
				console.log(
					"[EventBus] ❌ Connection attempt failed:",
					params?.err?.message
				);
			});

			this.channel = this.connection.createChannel({
				json: false,
				setup: async (channel: any) => {
					// Prefetch 1 message at a time for fair load balancing
					await channel.prefetch(1);

					// Assert the topic exchange
					await channel.assertExchange(EXCHANGE_NAME, EXCHANGE_TYPE, {
						durable: true,
					});

					console.log(`[EventBus] ✅ Exchange "${EXCHANGE_NAME}" ready`);
					resolve();
				},
			});

			this.channel.on("error", (err) => {
				console.error("[EventBus] Channel error:", err);
				reject(err);
			});
		});
	}

	/**
	 * Publish event to exchange
	 * All subscribers with matching routing key will receive it
	 */
	async publish<T = unknown>(event: string, payload: T): Promise<void> {
		const message = {
			event,
			data: payload,
			timestamp: new Date().toISOString(),
		};

		// Publish to exchange with event as routing key
		await this.channel!.publish(
			EXCHANGE_NAME,
			event, // routing key = event name (e.g., "order.created")
			Buffer.from(JSON.stringify(message)),
			{
				persistent: true,
			}
		);

		console.log(`[EventBus] 📤 Published: ${event}`);
	}

	/**
	 * Subscribe to event
	 * Creates a queue unique to this service and binds it to the exchange
	 * Multiple services can subscribe to same event = fanout!
	 */
	async subscribe<T = unknown>(
		event: string,
		handler: EventHandler<T>
	): Promise<void> {
		// Queue name: serviceName.eventName (e.g., "orders.ticket.created")
		const queueName = `${process.env.SERVICE_NAME}.${event}`;

		await this.channel!.addSetup(async (channel: any) => {
			// Assert queue for this service
			await channel.assertQueue(queueName, { durable: true });

			// Bind queue to exchange with routing key = event
			await channel.bindQueue(queueName, EXCHANGE_NAME, event);

			// Consume messages
			await channel.consume(
				queueName,
				async (msg: ConsumeMessage | null) => {
					if (!msg) return;

					try {
						const { data } = JSON.parse(msg.content.toString());
						await handler(data as T);
						channel.ack(msg);
						console.log(`[EventBus] ✅ Processed: ${event}`);
					} catch (err) {
						console.error(`[EventBus] ❌ Error processing ${event}:`, err);
						channel.nack(msg, false, true); // requeue
					}
				},
				{ noAck: false } as Options.Consume
			);
		});

		console.log(
			`[EventBus] 👂 Subscribed: ${process.env.SERVICE_NAME} → ${event}`
		);
	}

	isConnected(): boolean {
		return this.connected;
	}

	async close(): Promise<void> {
		if (this.channel) {
			await this.channel.close();
		}
		if (this.connection) {
			await this.connection.close();
		}
		this.connected = false;
	}
}

export const eventBus: IEventBus = new RabbitMQEventBus();
