import { Request, Response, NextFunction } from "express";
import { NotFoundError } from "@dip-university/common";
import * as ticketService from "../services/ticket-service";
import { publishTicketCreated, publishTicketUpdated } from "../events";

export const createTicket = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	const ticket = await ticketService.createTicket(
		req.body.title,
		req.body.price,
		req.currentUser!.id
	);

	await publishTicketCreated({
		id: ticket.id,
		title: ticket.title,
		price: ticket.price,
		userId: ticket.userId,
	});

	res.status(201).send(ticket);
};

export const getTicketById = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	const ticket = await ticketService.getTicketById(req.params.id);
	if (!ticket) {
		throw new NotFoundError("Ticket not found");
	}
	res.status(200).send(ticket);
};

export const getAllTickets = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	const tickets = await ticketService.getAllTickets();
	res.status(200).send(tickets);
};

export const updateTicket = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	const ticket = await ticketService.updateTicket(
		req.params.id,
		req.body.title,
		req.body.price,
		req.currentUser!.id
	);

	await publishTicketUpdated({
		id: ticket.id,
		title: ticket.title,
		price: ticket.price,
		changes: { title: req.body.title, price: req.body.price },
	});

	res.status(200).send(ticket);
};
