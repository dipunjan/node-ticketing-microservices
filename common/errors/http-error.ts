export class HttpError extends Error {
	statusCode: number;
	code?: string;

	constructor(message: string, statusCode = 400, code?: string) {
		super(message);

		this.statusCode = statusCode;
		if (code) this.code = code;

		Object.setPrototypeOf(this, HttpError.prototype);
	}

	serializeErrors(): { message: string; code?: string }[] {
		return [{ message: this.message, code: this.code }];
	}
}
