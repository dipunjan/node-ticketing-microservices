import { httpError } from "./http-error";

export class DatabaseConnectionError extends httpError {
	statusCode = 500;
	reason = "Error connecting to database";

	constructor() {
		super("Error connecting to db", 500);
		Object.setPrototypeOf(this, DatabaseConnectionError.prototype);
	}

	serializeErrors() {
		return [{ message: this.reason }];
	}
}
