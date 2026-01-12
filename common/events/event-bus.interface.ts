/**
 * Event Bus - Abstraction layer for message brokers
 * Easily swap RabbitMQ for Azure Service Bus
 */

export interface EventHandler<T = unknown> {
	(data: T): Promise<void>;
}

export interface IEventBus {
	connect(): Promise<void>;
	publish<T = unknown>(event: string, payload: T): Promise<void>;
	subscribe<T = unknown>(
		event: string,
		handler: EventHandler<T>
	): Promise<void>;
	isConnected(): boolean;
	close(): Promise<void>;
}

// Event types for type safety
export const Events = {
	// Auth events
	USER_CREATED: "user.created",
	USER_UPDATED: "user.updated",

	// Ticket events
	TICKET_CREATED: "ticket.created",
	TICKET_UPDATED: "ticket.updated",

	// Order events
	ORDER_CREATED: "order.created",
	ORDER_CANCELLED: "order.cancelled",

	// Payment events
	PAYMENT_CREATED: "payment.created",
} as const;

export type EventName = (typeof Events)[keyof typeof Events];
