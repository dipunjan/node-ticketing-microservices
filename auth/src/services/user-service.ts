import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { HttpError, NotFoundError } from "@dip-university/common";
import { User } from "../models/user";

/**
 * User Service - Business logic layer
 * Throws errors directly - caught by error-handler middleware
 */

/**
 * Register a new user
 */
export const signup = async (email: string, password: string) => {
	const existingUser = await User.findOne({ email });
	if (existingUser) {
		throw new HttpError("User already exists", 400);
	}

	const user = User.build({ email, password });
	await user.save();

	const token = jwt.sign(
		{ id: user.id, email: user.email },
		process.env.JWT_KEY!
	);

	return { user, token };
};

/**
 * Authenticate user
 */
export const signin = async (email: string, password: string) => {
	const user = await User.findOne({ email });
	if (!user) {
		throw new NotFoundError("User not found");
	}

	const isMatch = await bcrypt.compare(password, user.password);
	if (!isMatch) {
		throw new HttpError("Incorrect password", 400);
	}

	const token = jwt.sign(
		{ id: user.id, email: user.email },
		process.env.JWT_KEY!
	);

	return { user, token };
};

/**
 * Get all users
 */
export const getAllUsers = async () => {
	return User.find({});
};

/**
 * Get user by ID
 */
export const getUserById = async (id: string) => {
	return User.findById(id);
};
