import { HttpError } from "./http-error";

export class NotFoundError extends HttpError {
	constructor(message = "Not Found") {
		super(message, 404);
		Object.setPrototypeOf(this, NotFoundError.prototype);
	}

	serializeErrors() {
		return [{ message: this.message }];
	}
}
