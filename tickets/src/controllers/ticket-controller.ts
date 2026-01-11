import { Request, Response, NextFunction } from "express";
import { NotFoundError, NotAuthorizedError } from "@dip-university/common";
import { Ticket } from "../models/ticket";
import { publishTicketCreated, publishTicketUpdated } from "../rabbitmq";

export const createTicket = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	const ticket = Ticket.build({
		title: req.body.title,
		price: req.body.price,
		userId: req.currentUser!.id,
	});
	await ticket.save();

	// Publish ticket:created event to RabbitMQ
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
	const ticket = await Ticket.findById(req.params.id);
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
	const tickets = await Ticket.find({});
	res.status(200).send(tickets);
};

export const updateTicket = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	const ticket = await Ticket.findById(req.params.id);
	if (!ticket) {
		throw new NotFoundError("Ticket not found");
	}
	if (ticket.userId !== req.currentUser!.id) {
		throw new NotAuthorizedError();
	}
	ticket.set({
		title: req.body.title,
		price: req.body.price,
	});
	await ticket.save();

	// Publish ticket:updated event to RabbitMQ
	await publishTicketUpdated({
		id: ticket.id,
		title: ticket.title,
		price: ticket.price,
		changes: { title: req.body.title, price: req.body.price },
	});

	res.status(200).send(ticket);
};
