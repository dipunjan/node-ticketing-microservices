import express from "express";
import { setupSubscriptions } from "./events";
import { eventBus } from "@dip-university/common";

const app = express();
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

const start = async () => {
	try {
		// Connect to RabbitMQ (with auto-reconnect)
		await eventBus.connect();

		// Set up event subscriptions
		await setupSubscriptions();

		// Start HTTP server
		const server = app.listen(3000, () => {
			console.log("[Orders] ✅ Listening on 3000");
		});

		// Graceful shutdown
		const shutdown = async () => {
			console.log("[Orders] Shutting down...");
			await eventBus.close();
			server.close();
			process.exit(0);
		};
		process.on("SIGTERM", shutdown);
		process.on("SIGINT", shutdown);
	} catch (err) {
		console.error("[Orders] Startup failed", err);
		process.exit(1);
	}
};

start();
