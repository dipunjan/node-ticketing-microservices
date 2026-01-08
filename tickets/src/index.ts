import express from "express";
import { ticketRoutes } from "./routes/ticket-routes";
import { errorHandler, NotFoundError } from "@dip-university/common";
import { connectDB } from "./middlewares/db";

const app = express();
app.set("trust proxy", true);
app.use(express.json());
app.use("/api/tickets", ticketRoutes);
app.all("*", (req, res) => {
	throw new NotFoundError();
});

app.use(errorHandler);

const start = async () => {
	try {
		await connectDB();
		app.listen(3000, () => console.log("Listening on 3000"));
	} catch (err) {
		console.error("Startup failed", err);
	}
};
start();
