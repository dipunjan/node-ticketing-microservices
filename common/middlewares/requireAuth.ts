import { NextFunction, Response, Request } from "express";
import { httpError } from "../errors/http-error";

export const requireAuth = (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	if (!req.currentUser) {
		throw new httpError("Unauthorized", 401);
	}
	next();
};
