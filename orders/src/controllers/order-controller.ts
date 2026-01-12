import { Request, Response } from "express";
import * as orderService from "../services/order-service";

export const createOrder = async (req: Request, res: Response) => {
	const order = await orderService.createOrder(
		req.body.ticketId,
		req.body.userId
	);
	res.status(201).send(order);
};

export const getOrders = async (req: Request, res: Response) => {
	res.status(200).send([]);
};
