import express from "express";
import "express-async-errors";
import { body } from "express-validator";
import * as userController from "../controllers/users-controller";

const router = express.Router();

router.get("/currentuser", (req, res) => {
  res.send("Hi There");
});

router.get("/signin", (req, res) => {
  throw new Error("This is Broken");
});

router.post("/signout", (req, res) => {
  res.send("Hi signout");
});

router.post(
  "/signup",
  [
    body("email").isEmail().withMessage("This email is not valid"),
    body("password").isLength({ min: 4 }).withMessage("Password is not minimum length"),
  ],
  userController.signup
);

export { router as userRoutes };
