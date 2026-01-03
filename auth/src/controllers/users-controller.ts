import { Request, Response, NextFunction } from "express";
import { RequestValidationError } from "../errors/request-validation-error";
import { User } from "../models/users";
// (httpError already imported above)
import { validationResult } from "express-validator";
import { httpError } from "../errors/http-error";

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

	const user = new User({ email, password });
	await user.save();

	res.status(201).send({ message: "User created" });
};
