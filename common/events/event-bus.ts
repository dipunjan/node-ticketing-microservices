import amqp, {
	ChannelWrapper,
	AmqpConnectionManager,
} from "amqp-connection-manager";
import { ConsumeMessage, Options } from "amqplib";
import { IEventBus, EventHandler } from "./event-models";

/*
  Single exchange used by all services.
  Each event name is used as a routing key.
*/
const EXCHANGE_NAME = "ticketing-events";
const EXCHANGE_TYPE = "topic";

/*
  Prefetch = 1 ensures one in-flight message per consumer.
  Retry delay and max retries protect the system from poison messages.
  Handler timeout ensures a message is never left unacked forever.
*/
const PREFETCH_COUNT = 1;
const RETRY_DELAY_MS = 10_000;
const MAX_RETRIES = 5;
const HANDLER_TIMEOUT_MS = 30_000;

/*
  Module-level state.
  Because Node.js caches modules, this behaves like a singleton.
*/
let connection: AmqpConnectionManager | null = null;
let channel: ChannelWrapper | null = null;
let connected = false;

/*
  Wraps a promise with a hard timeout.
  This guarantees every message eventually ACKs or NACKs.
*/
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
	return Promise.race([
		promise,
		new Promise<T>((_, reject) =>
			setTimeout(() => reject(new Error("Handler timeout")), ms)
		),
	]);
}

class RabbitMQEventBus implements IEventBus {
	/*
    Establishes the RabbitMQ connection and channel.
    Safe to call multiple times; it only connects once.
  */
	async connect(): Promise<void> {
		if (connected && channel) return;

		const url = process.env.RABBITMQ_URL;
		if (!url) {
			throw new Error("[EventBus] RABBITMQ_URL not set");
		}

		return new Promise((resolve, reject) => {
			connection = amqp.connect([url], {
				heartbeatIntervalInSeconds: 5,
				reconnectTimeInSeconds: 3,
			});

			connection.on("connect", () => {
				connected = true;
				console.log("[EventBus] Connected to RabbitMQ");
			});

			connection.on("disconnect", (params) => {
				connected = false;
				console.warn("[EventBus] Disconnected:", params?.err?.message);
			});

			channel = connection.createChannel({
				json: false,
				setup: async (ch: any) => {
					// Limit to one unacked message per consumer
					await ch.prefetch(PREFETCH_COUNT);

					// Declare the shared topic exchange
					await ch.assertExchange(EXCHANGE_NAME, EXCHANGE_TYPE, {
						durable: true,
					});

					resolve();
				},
			});

			channel.on("error", reject);
		});
	}

	/*
    Publishes an event to the exchange.
    The event name is used as the routing key.
  */
	async publish<T>(event: string, payload: T): Promise<void> {
		await this.connect();

		const message = {
			event,
			data: payload,
			timestamp: new Date().toISOString(),
		};

		await channel!.publish(
			EXCHANGE_NAME,
			event,
			Buffer.from(JSON.stringify(message)),
			{ persistent: true }
		);
	}

	/*
    Subscribes the current service to an event.
    Creates:
      - main queue for processing
      - retry queue with delay
      - DLQ for poison messages
  */
	async subscribe<T>(event: string, handler: EventHandler<T>): Promise<void> {
		await this.connect();

		const service = process.env.SERVICE_NAME!;
		const mainQueue = `${service}.${event}`;
		const retryQueue = `${mainQueue}.retry`;
		const dlqQueue = `${mainQueue}.dlq`;

		await channel!.addSetup(async (ch: any) => {
			// Queue for messages that fail permanently
			await ch.assertQueue(dlqQueue, { durable: true });

			// Retry queue: holds failed messages for a fixed delay
			await ch.assertQueue(retryQueue, {
				durable: true,
				arguments: {
					"x-message-ttl": RETRY_DELAY_MS,
					"x-dead-letter-exchange": EXCHANGE_NAME,
					"x-dead-letter-routing-key": event,
				},
			});

			// Main processing queue
			await ch.assertQueue(mainQueue, {
				durable: true,
				arguments: {
					"x-dead-letter-exchange": "",
					"x-dead-letter-routing-key": retryQueue,
				},
			});

			await ch.bindQueue(mainQueue, EXCHANGE_NAME, event);

			await ch.consume(
				mainQueue,
				async (msg: ConsumeMessage | null) => {
					if (!msg) return;

					try {
						const { data } = JSON.parse(msg.content.toString());

						// Handler must either succeed or timeout
						await withTimeout(handler(data as T), HANDLER_TIMEOUT_MS);

						ch.ack(msg);
					} catch (err) {
						// x-death header tracks how many times the message was retried
						const deaths = msg.properties.headers?.["x-death"] ?? [];
						const retryCount =
							deaths.find((d: any) => d.queue === retryQueue)?.count ?? 0;

						if (retryCount >= MAX_RETRIES) {
							// Stop retrying and send to DLQ
							ch.reject(msg, false);
						} else {
							// Move message to retry queue
							ch.nack(msg, false, false);
						}
					}
				},
				{ noAck: false } as Options.Consume
			);
		});
	}

	/*
    Exposes connection state for health checks.
  */
	isConnected(): boolean {
		return connected;
	}

	/*
    Gracefully closes the connection.
    Useful for shutdown signals in containers.
  */
	async close(): Promise<void> {
		if (channel) await channel.close();
		if (connection) await connection.close();
		connected = false;
	}
}

/*
  Export a single shared instance.
  This is the only EventBus used in the process.
*/
export const eventBus: IEventBus = new RabbitMQEventBus();
