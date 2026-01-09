import express from "express";
import "express-async-errors";
import { body } from "express-validator";
import { requireAuth, validateRequest } from "@dip-university/common";
import * as ticketController from "../controllers/ticket-controller";

const router = express.Router();

router.post(
	"/create",
	requireAuth,
	[
		body("title").notEmpty().withMessage("Title is required"),
		body("price")
			.isFloat({ min: 0 })
			.withMessage("Price must be greater than 0"),
	],
	validateRequest,
	ticketController.createTicket
);

router.get("/:id", ticketController.getTicketById);

router.get("/", ticketController.getAllTickets);

router.put(
	"/:id",
	requireAuth,
	[
		body("title").isEmpty().withMessage("Title is required"),
		body("price")
			.isFloat({ min: 0 })
			.withMessage("Price must be greater than 0"),
	],
	ticketController.updateTicket
);

export { router as ticketRoutes };
