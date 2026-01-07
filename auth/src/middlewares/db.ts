import mongoose from "mongoose";
import dotenv from "dotenv";
import { DatabaseConnectionError } from "../errors/database-connection-error";

dotenv.config();

export const connectDB = async (): Promise<void> => {
	try {
		await mongoose.connect(process.env.MONGO_URI!);
		console.log("Connected to MongoDB");
	} catch (error) {
		throw new DatabaseConnectionError();
	}
};
