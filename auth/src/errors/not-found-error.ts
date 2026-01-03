import { httpError } from "./http-error";

export class NotFoundError extends httpError {
	statusCode = 404;

	constructor(message = "Not Found") {
		super(message, 404);
		Object.setPrototypeOf(this, NotFoundError.prototype);
	}

	serializeErrors() {
		return [{ message: this.message }];
	}
}
