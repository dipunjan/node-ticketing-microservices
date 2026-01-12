/**
 * Order Service - Business logic layer
 * Called by both HTTP controllers and event consumers
 */

/**
 * Handle new ticket available (from Tickets service)
 */
export const handleTicketCreated = async (data: {
	id: string;
	title: string;
	price: string;
	userId: string;
}) => {
	console.log(
		`[OrderService] 📦 New ticket available: "${data.title}" - $${data.price}`
	);
	// Real logic: save ticket locally, notify users, etc.
};

/**
 * Handle ticket updated (from Tickets service)
 */
export const handleTicketUpdated = async (data: {
	id: string;
	title?: string;
	price?: string;
}) => {
	console.log(`[OrderService] 📦 Ticket ${data.id} updated`);
	// Real logic: update pending orders with new price
};

/**
 * Create new order (from HTTP)
 */
export const createOrder = async (ticketId: string, userId: string) => {
	console.log(`[OrderService] Creating order for ticket ${ticketId}`);
	// Real logic: check ticket exists, create order, produce event
	return { id: "order-123", ticketId, userId, status: "created" };
};
