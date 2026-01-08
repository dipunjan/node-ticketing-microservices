import { HttpError } from "./http-error";

export class DatabaseConnectionError extends HttpError {
	constructor() {
		super("Error connecting to database", 500);
		Object.setPrototypeOf(this, DatabaseConnectionError.prototype);
	}

	serializeErrors() {
		return [{ message: this.message }];
	}
}
