import { eventBus, Events } from "@dip-university/common";
import * as orderService from "../services/order-service";

// ============ SUBSCRIBERS ============

export async function setupSubscriptions(): Promise<void> {
	// Subscribe to events from Tickets service
	await eventBus.subscribe(
		Events.TICKET_CREATED,
		orderService.handleTicketCreated
	);
	await eventBus.subscribe(
		Events.TICKET_UPDATED,
		orderService.handleTicketUpdated
	);

	console.log("[Orders] ✅ Event subscriptions ready");
}
