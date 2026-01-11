import express from "express";
import { userRoutes } from "./routes/user-routes";
import { errorHandler, NotFoundError } from "@dip-university/common";
import { connectDB } from "./middlewares/db";
import { initRabbitMQ, isConnected } from "./rabbitmq";

const app = express();
app.set("trust proxy", true);
app.use(express.json());

// Health check endpoints for Kubernetes
app.get("/health/live", (req, res) => {
	res.status(200).json({ status: "alive" });
});

app.get("/health/ready", (req, res) => {
	if (isConnected()) {
		res.status(200).json({
			status: "ready",
			rabbitmq: "connected",
			message: "Service is ready to handle requests",
		});
	} else {
		res.status(503).json({
			status: "not ready",
			rabbitmq: "disconnected",
			message:
				"RabbitMQ connection unavailable - event publishing/consuming disabled",
		});
	}
});

app.use("/api/users", userRoutes);
app.all("*", (req, res) => {
	throw new NotFoundError();
});

app.use(errorHandler);

const start = async () => {
	try {
		// Connect to MongoDB (required)
		await connectDB();

		// Start HTTP server immediately
		const server = app.listen(3000, () => {
			console.log("[Auth] Listening on 3000");
		});

		// Initialize RabbitMQ (handles its own retries)
		initRabbitMQ().catch((err: unknown) => {
			console.error("[Auth] Failed to initialize RabbitMQ:", err);
		});

		// Graceful shutdown
		const shutdown = async () => {
			console.log("[Auth] Shutting down...");
			server.close();
			process.exit(0);
		};
		process.on("SIGTERM", shutdown);
		process.on("SIGINT", shutdown);
	} catch (err) {
		console.error("[Auth] Startup failed", err);
		process.exit(1);
	}
};
start();
