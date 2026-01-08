import express from "express";
import { userRoutes } from "./routes/tickets-routes";
import { errorHandler, NotFoundError } from "@dip-university/common";
import { connectDB } from "./middlewares/db";

const app = express();
app.set("trust proxy", true);
app.use(express.json());
app.use("/api/tickets", userRoutes);
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
