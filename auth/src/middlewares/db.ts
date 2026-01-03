import mongoose from "mongoose";
import dotenv from "dotenv";
import { DatabaseConnectionError } from "../errors/database-connection-error";

dotenv.config();

export const connectDB = async (mongoUri?: string): Promise<void> => {
	const uri = mongoUri ?? process.env.MONGO_URI;
	if (!uri) {
		console.error("MONGO_URI is not defined");
		throw new DatabaseConnectionError();
	}

	try {
		await mongoose.connect(uri);
		mongoose.connection.on("error", (err) =>
			console.error("Mongo connection error", err)
		);
		console.log("Connected to MongoDB");
	} catch (error) {
		console.error("Error connecting to MongoDB", error);
		throw new DatabaseConnectionError();
	}
};

export const closeDB = async (): Promise<void> => {
	try {
		await mongoose.disconnect();
		console.log("MongoDB disconnected");
	} catch (err) {
		console.error("Error disconnecting MongoDB", err);
	}
};
