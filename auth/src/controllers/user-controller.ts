import { Request, Response, NextFunction } from "express";
import * as userService from "../services/user-service";
import { publishUserCreated } from "../events";

export const signup = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	const { email, password } = req.body;
	const result = await userService.signup(email, password);

	await publishUserCreated({ id: result.user.id, email: result.user.email });

	res.status(201).send(result);
};

export const signin = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	const { email, password } = req.body;
	const result = await userService.signin(email, password);

	res.status(200).send(result);
};

export const getAllUsers = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	const users = await userService.getAllUsers();
	res.status(200).send(users);
};
