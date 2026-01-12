import { NotAuthorizedError, NotFoundError } from "@dip-university/common";
import { Ticket } from "../models/ticket";

/**
 * Ticket Service - Business logic layer
 * Called by HTTP controllers
 */

/**
 * Create ticket
 */
export const createTicket = async (
	title: string,
	price: string,
	userId: string
) => {
	const ticket = Ticket.build({ title, price, userId });
	await ticket.save();
	return ticket;
};

/**
 * Get ticket by ID
 */
export const getTicketById = async (id: string) => {
	return Ticket.findById(id);
};

/**
 * Get all tickets
 */
export const getAllTickets = async () => {
	return Ticket.find({});
};

/**
 * Update ticket (from HTTP)
 */
export const updateTicket = async (
	id: string,
	title: string,
	price: string,
	userId: string
) => {
	const ticket = await Ticket.findById(id);
	if (!ticket) throw new NotFoundError("Ticket not found");
	if (ticket.userId !== userId) throw new NotAuthorizedError();
	ticket.set({ title, price });
	await ticket.save();
	return ticket;
};
