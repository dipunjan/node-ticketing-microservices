import { httpError } from "./http-error";

interface ValidationErrorItem {
	msg: string;
	param?: string;
	location?: string;
}

export class RequestValidationError extends httpError {
	statusCode = 400;

	constructor(public errors: ValidationErrorItem[]) {
		super("Invalid request parameters", 400);
		Object.setPrototypeOf(this, RequestValidationError.prototype);
	}

	serializeErrors() {
		return this.errors.map((err) => ({ message: err.msg, field: err.param }));
	}
}
