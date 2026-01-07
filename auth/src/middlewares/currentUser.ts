import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { httpError } from "../errors/http-error";

declare global {
	namespace Express {
		interface Request {
			user?: { id: string; email: string };
		}
	}
}

export const currentUser = async (req: Request, res: Response, next: NextFunction) => {
	const token = req.headers.authorization?.replace("Bearer ", "");
	
	if (!token) {
		return next();
	}
	try {
		const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
		req.user = { id: decoded.id, email: decoded.email };
		next();
	} catch (err) {
		throw new httpError("Invalid token", 401);
	}
};
