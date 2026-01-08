import mongoose from "mongoose";

interface TicketAttr {
	title: string;
	price: string;
	userId: string;
}
// Interface for the Ticket Model
interface TicketModel extends mongoose.Model<TicketDoc> {
	build(attrs: TicketAttr): TicketDoc;
}
// Interface for the Ticket Document
interface TicketDoc extends mongoose.Document {
	title: string;
	price: string;
	userId: string;
}

const ticketSchema = new mongoose.Schema({
	title: { type: String, required: true },
	price: { type: String, required: true },
	userId: { type: String, required: true },
});

ticketSchema.statics.build = (attrs: TicketAttr) => {
	return new Ticket(attrs);
};

ticketSchema.set("toJSON", {
	transform(doc, ret: any) {
		ret.id = ret._id;
		delete ret._id;
		return ret;
	},
});

export const Ticket = mongoose.model<TicketDoc, TicketModel>(
	"Ticket",
	ticketSchema
);
