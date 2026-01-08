import { HttpError } from "./http-error";

export class NotAuthorizedError extends HttpError {
	constructor() {
		super("Not authorized", 401);
		Object.setPrototypeOf(this, NotAuthorizedError.prototype);
	}

	serializeErrors() {
		return [{ message: this.message }];
	}
}
