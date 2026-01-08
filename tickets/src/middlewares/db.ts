import mongoose from "mongoose";
import { DatabaseConnectionError } from "@dip-university/common";

export const connectDB = async (): Promise<void> => {
	console.log("Connecting to Tickets MongoDB...", process.env.MONGO_URI);
	try {
		await mongoose.connect(process.env.MONGO_URI!);
		console.log("Connected to Tickets MongoDB ");
	} catch (error) {
		throw new DatabaseConnectionError();
	}
};
