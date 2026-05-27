const Payment = require("../models/Payment.js");
const mpesaService = require("../services/mpesaServices.js");

/**
 * Initiate STK Push payment
 * Called when customer clicks "Pay" button
 */
async function initiatePayment(req, res) {
	try {
		const { phoneNumber, amount, orderId } = req.body;

		// Validate input
		if (!phoneNumber || !amount || !orderId) {
			return res.status(400).json({
				error: "Missing required fields: phoneNumber, amount, orderId",
			});
		}

		// Store payment as pending in database
		const payment = new Payment({
			orderId,
			amount,
			phoneNumber,
			status: "pending",
		});

		await payment.save();

		// Send STK push to customer's phone
		const result = await mpesaService.stkPush(phoneNumber, amount, orderId);

		if (result.success) {
			// Update payment record with the request IDs from Daraja
			payment.checkoutRequestID = result.checkoutRequestID;
			payment.merchantRequestID = result.merchantRequestID;
			await payment.save();

			res.json({
				success: true,
				message: "Payment prompt sent to your phone",
				checkoutRequestID: result.checkoutRequestID,
				paymentId: payment._id,
			});
		} else {
			payment.status = "failed";
			payment.resultDesc = result.message;
			await payment.save();

			res.status(400).json({
				success: false,
				error: result.message,
			});
		}
	} catch (error) {
		console.error("Initiate payment error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
}

/**
 * Callback endpoint - Safaricom sends payment result here
 * This is the most important endpoint - it tells you if payment succeeded
 */
async function handleCallback(req, res) {
	try {
		// The callback structure from Daraja
		// The actual data is nested inside Body.stkCallback
		const callbackData = req.body;

		console.log(
			"Received callback:",
			JSON.stringify(callbackData, null, 2),
		);

		const stkCallback = callbackData.Body?.stkCallback;

		if (!stkCallback) {
			console.error("Invalid callback structure");
			return res
				.status(200)
				.json({ ResultCode: "0", ResultDesc: "Accepted" });
		}

		const {
			MerchantRequestID,
			CheckoutRequestID,
			ResultCode,
			ResultDesc,
			CallbackMetadata,
		} = stkCallback;

		// Find the pending payment in your database
		const payment = await Payment.findOne({
			checkoutRequestID: CheckoutRequestID,
		});

		if (!payment) {
			console.error(
				`Payment not found for CheckoutRequestID: ${CheckoutRequestID}`,
			);
			return res
				.status(200)
				.json({ ResultCode: "0", ResultDesc: "Accepted" });
		}

		// ResultCode 0 means success, any other number means failure
		if (ResultCode === 0) {
			// Extract payment details from CallbackMetadata
			let mpesaReceiptNumber = "";
			let transactionDate = "";

			if (CallbackMetadata && CallbackMetadata.Item) {
				CallbackMetadata.Item.forEach((item) => {
					if (item.Name === "MpesaReceiptNumber") {
						mpesaReceiptNumber = item.Value;
					}
					if (item.Name === "TransactionDate") {
						transactionDate = item.Value;
					}
				});
			}

			// Update payment as successful
			payment.status = "completed";
			payment.resultCode = ResultCode;
			payment.resultDesc = ResultDesc;
			payment.mpesaReceiptNumber = mpesaReceiptNumber;
			payment.transactionDate = transactionDate
				? new Date(transactionDate)
				: null;

			await payment.save();

			console.log(
				`Payment completed: ${mpesaReceiptNumber} for order ${payment.orderId}`,
			);
		} else {
			// Payment failed
			payment.status = "failed";
			payment.resultCode = ResultCode;
			payment.resultDesc = ResultDesc;
			await payment.save();

			console.log(
				`Payment failed: ${ResultDesc} for order ${payment.orderId}`,
			);
		}

		// Always respond with success to acknowledge receipt of callback
		// If you don't respond properly, Safaricom will keep retrying
		res.status(200).json({ ResultCode: "0", ResultDesc: "Accepted" });
	} catch (error) {
		console.error("Callback processing error:", error);
		// Still return success to prevent retries
		res.status(200).json({ ResultCode: "0", ResultDesc: "Accepted" });
	}
}

/**
 * Check payment status - for frontend polling
 */
async function getPaymentStatus(req, res) {
	try {
		const { paymentId } = req.params;

		const payment = await Payment.findById(paymentId);

		if (!payment) {
			return res.status(404).json({ error: "Payment not found" });
		}

		res.json({
			status: payment.status,
			resultDesc: payment.resultDesc,
			mpesaReceiptNumber: payment.mpesaReceiptNumber,
		});
	} catch (error) {
		console.error("Status check error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
}

module.exports = { initiatePayment, handleCallback, getPaymentStatus };
