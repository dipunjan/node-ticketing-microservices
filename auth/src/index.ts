import express from "express";
import { userRoutes } from "./routes/users-routes";
import { connectDB } from "./middlewares/db";
import { NotFoundError } from "./errors/not-found-error";
import { errorHandler } from "./middlewares/error-handler";

const app = express();

app.use(express.json());
app.use("/api/users", userRoutes);
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
