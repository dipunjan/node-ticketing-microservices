import express from "express";
import "express-async-errors";
import { body } from "express-validator";
import * as userController from "../controllers/users-controller";
import { currentUser } from "../middlewares/currentUser";
import { httpError } from "../errors/http-error";
import { requireAuth } from "../middlewares/requireAuth";

const router = express.Router();

router.get("/currentuser", currentUser, requireAuth, (req, res) => {
	res.status(200).send(req.user);
});

router.post(
	"/signin",
	[
		body("email").isEmail().withMessage("This email is not valid"),
		body("password")
			.isLength({ min: 4 })
			.withMessage("Password is not minimum length"),
	],
	userController.signin
);

router.post("/signout", (req, res) => {
	res.status(200).send({ message: "Logged out successfully" });
});

router.post(
	"/signup",
	[
		body("email").isEmail().withMessage("This email is not valid"),
		body("password")
			.isLength({ min: 4 })
			.withMessage("Password is not minimum length"),
	],
	userController.signup
);

export { router as userRoutes };
