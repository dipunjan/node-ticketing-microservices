import { eventBus, Events } from "@dip-university/common";

// ============ PAYLOAD TYPES ============

interface TicketCreatedPayload {
	id: string;
	title: string;
	price: string;
	userId: string;
}

interface TicketUpdatedPayload {
	id: string;
	title: string;
	price: string;
	changes: Record<string, unknown>;
}

// ============ PUBLISHERS ============

export async function publishTicketCreated(
	data: TicketCreatedPayload
): Promise<void> {
	await eventBus.publish(Events.TICKET_CREATED, data);
}

export async function publishTicketUpdated(
	data: TicketUpdatedPayload
): Promise<void> {
	await eventBus.publish(Events.TICKET_UPDATED, data);
}
