import { eventBus, Events } from "@dip-university/common";

// ============ PAYLOAD TYPES ============

interface UserCreatedPayload {
	id: string;
	email: string;
}

interface UserUpdatedPayload {
	id: string;
	email: string;
	changes: Record<string, unknown>;
}

// ============ PUBLISHERS ============

export async function publishUserCreated(
	data: UserCreatedPayload
): Promise<void> {
	await eventBus.publish(Events.USER_CREATED, data);
}

export async function publishUserUpdated(
	data: UserUpdatedPayload
): Promise<void> {
	await eventBus.publish(Events.USER_UPDATED, data);
}
