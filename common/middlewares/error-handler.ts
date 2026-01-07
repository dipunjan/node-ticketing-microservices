import { NextFunction, Request, Response } from "express";
import { httpError } from "../errors/http-error";

export const errorHandler = (
	err: Error,
	req: Request,
	res: Response,
	next: NextFunction
) => {
	if (err instanceof httpError) {
		return res.status(err.statusCode).send({ errors: err.serializeErrors() });
	}

	console.error(err);
	res.status(500).send({ errors: [{ message: "Something went wrong" }] });
};
