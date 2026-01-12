import express from "express";
import { ticketRoutes } from "./routes/ticket-routes";
import {
	currentUser,
	errorHandler,
	NotFoundError,
	eventBus,
} from "@dip-university/common";
import { connectDB } from "./middlewares/db";

const app = express();
app.set("trust proxy", true);
app.use(express.json());

app.get("/health/live", (req, res) => {
	res.status(200).json({ status: "alive" });
});

app.get("/health/ready", (req, res) => {
	if (eventBus.isConnected()) {
		res.status(200).json({ status: "ready", rabbitmq: "connected" });
	} else {
		res.status(503).json({ status: "not ready", rabbitmq: "disconnected" });
	}
});

app.use(currentUser);
app.use("/api/tickets", ticketRoutes);
app.all("*", (req, res) => {
	throw new NotFoundError();
});

app.use(errorHandler);

const start = async () => {
	try {
		// Connect to MongoDB
		await connectDB();

		// Connect to RabbitMQ (with auto-reconnect)
		await eventBus.connect();

		// Start HTTP server
		const server = app.listen(3000, () => {
			console.log("[Tickets] ✅ Listening on 3000");
		});

		// Graceful shutdown
		const shutdown = async () => {
			console.log("[Tickets] Shutting down...");
			await eventBus.close();
			server.close();
			process.exit(0);
		};
		process.on("SIGTERM", shutdown);
		process.on("SIGINT", shutdown);
	} catch (err) {
		console.error("[Tickets] Startup failed", err);
		process.exit(1);
	}
};
start();
