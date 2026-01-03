export class httpError extends Error {
	statusCode: number;
	code?: string;

	constructor(message: string, statusCode = 400, code?: string) {
		super(message);

		this.statusCode = statusCode;
		if (code) this.code = code;

		Object.setPrototypeOf(this, httpError.prototype);
		Error.captureStackTrace(this, this.constructor);
	}

	serializeErrors(): { message: string; code?: string }[] {
		return [{ message: this.message, code: this.code }];
	}
}
