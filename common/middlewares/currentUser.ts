import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { HttpError } from "../errors/http-error";

declare global {
	namespace Express {
		interface Request {
			currentUser?: { id: string; email: string };
		}
	}
}

export const currentUser = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	const token = req.headers.authorization?.replace("Bearer ", "");
	console.log("Token:", token);
	if (!token) {
		return next();
	}
	try {
		const decoded = jwt.verify(token, process.env.JWT_KEY!) as any;
		req.currentUser = { id: decoded.id, email: decoded.email };
		next();
	} catch (err) {
		throw new HttpError("Invalid token", 401);
	}
};
