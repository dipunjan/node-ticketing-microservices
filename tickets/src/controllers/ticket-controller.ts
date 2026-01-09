import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import {
	RequestValidationError,
	NotFoundError,
	NotAuthorizedError,
} from "@dip-university/common";
import { Ticket } from "../models/ticket";

export const createTicket = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	// Logic to create a ticket goes here
	debugger;
	const ticket = Ticket.build({
		title: req.body.title,
		price: req.body.price,
		userId: req.currentUser!.id,
	});
	await ticket.save();

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
	res.status(200).send(ticket);
};
