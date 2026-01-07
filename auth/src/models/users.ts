import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { NextFunction } from "express";
import { httpError } from "../errors/http-error";

interface UserAttr {
	email: string;
	password: string;
}
// Interface for the User Model
interface UserModel extends mongoose.Model<UserDoc> {
	build(attrs: UserAttr): UserDoc;
}
// Interface for the User Document
interface UserDoc extends mongoose.Document {
	id: number;
	email: string;
	password: string;
}

const userSchema = new mongoose.Schema({
	email: { type: String, required: true, unique: true },
	password: { type: String, required: true },
});

userSchema.pre("save", async function () {
	const user = this;
	if (user.isModified("password")) {
		const hashed = await bcrypt.hash(user.password, 10);
		user.password = hashed;
	}
});

userSchema.statics.build = (attrs: UserAttr) => {
	return new User(attrs);
};

userSchema.set("toJSON", {
	transform(doc, ret: any) {
		ret.id = ret._id;
		delete ret._id;
		delete ret.__v;
		delete ret.password;
		return ret;
	},
});

export const User = mongoose.model<UserDoc, UserModel>("User", userSchema);
