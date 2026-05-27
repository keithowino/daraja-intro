const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
	orderId: {
		type: String,
		required: true,
		index: true,
	},
	amount: {
		type: Number,
		required: true,
	},
	phoneNumber: {
		type: String,
		required: true,
	},
	checkoutRequestID: {
		type: String,
		unique: true,
		sparse: true,
	},
	merchantRequestID: String,
	status: {
		type: String,
		enum: ["pending", "completed", "failed", "cancelled"],
		default: "pending",
	},
	resultCode: {
		type: Number,
		default: null,
	},
	resultDesc: String,
	mpesaReceiptNumber: String,
	transactionDate: Date,
	createdAt: {
		type: Date,
		default: Date.now,
	},
});

module.exports = mongoose.model("Payment", paymentSchema);
