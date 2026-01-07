import bcrypt from "bcrypt";
import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import { RequestValidationError, NotFoundError } from "@dip-university/common";
import { User } from "../models/users";
import { httpError } from "@dip-university/common";
import jwt from "jsonwebtoken";

export const signup = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		throw new RequestValidationError(errors.array());
	}

	const { email, password } = req.body;

	const existingUser = await User.findOne({ email });
	if (existingUser) {
		throw new httpError("User already exists", 400);
	}

	const user = User.build({ email, password });
	await user.save();
	const token = jwt.sign(
		{ id: user.id, email: user.email },
		process.env.JWT_SECRET!
	);
	res.status(201).send({ user, token });
};

export const signin = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		throw new RequestValidationError(errors.array());
	}

	const { email, password } = req.body;

	const user = await User.findOne({ email });
	if (!user) {
		throw new NotFoundError("No User Found");
	}

	const isMatch = await bcrypt.compare(password, user.password);
	if (!isMatch) {
		throw new httpError("Incorrect Password", 400);
	}
	const token = jwt.sign(
		{ id: user.id, email: user.email },
		process.env.JWT_SECRET!
	);
	res.status(200).send({ user, token });
};
