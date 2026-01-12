import { eventBus, Events } from "@dip-university/common";

// ============ PAYLOAD TYPES ============

interface OrderCreatedPayload {
	id: string;
	ticketId: string;
	userId: string;
	status: string;
}

interface OrderCancelledPayload {
	id: string;
	ticketId: string;
}

// ============ PUBLISHERS ============

export async function publishOrderCreated(
	data: OrderCreatedPayload
): Promise<void> {
	await eventBus.publish(Events.ORDER_CREATED, data);
}

export async function publishOrderCancelled(
	data: OrderCancelledPayload
): Promise<void> {
	await eventBus.publish(Events.ORDER_CANCELLED, data);
}
