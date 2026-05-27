const axios = require("axios");
require("dotenv").config();

// Determine which environment we're using
const env = process.env.MPESA_ENV === "production" ? "production" : "sandbox";

// Use the mock URL if available, otherwise use sandbox
const baseURL =
	process.env.MPESA_BASE_URL ||
	(env === "production"
		? "https://api.safaricom.co.ke"
		: "https://sandbox.safaricom.co.ke");

// // Daraja base URL - different for sandbox vs production
// const baseURL =
// 	env === "production"
// 		? "https://api.safaricom.co.ke"
// 		: "https://sandbox.safaricom.co.ke";

/**
 * STEP 1: Get OAuth Token from Daraja
 *
 * Every request to Daraja (except getting the token itself) needs a Bearer token.
 * This token expires after 1 hour, so in production you should cache it.
 *
 * How it works:
 * - You send your Consumer Key and Consumer Secret as Basic Authentication
 * - Daraja responds with an access_token
 */
async function getAccessToken() {
	const consumerKey = process.env.MPESA_CONSUMER_KEY;
	const consumerSecret = process.env.MPESA_CONSUMER_SECRET;

	// Combine key and secret with colon, then encode to Base64
	const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString(
		"base64",
	);

	try {
		const response = await axios.get(
			`${baseURL}/oauth/v1/generate?grant_type=client_credentials`,
			{
				headers: {
					Authorization: `Basic ${auth}`,
				},
			},
		);

		return response.data.access_token;
	} catch (error) {
		console.error(
			"Error getting access token:",
			error.response?.data || error.message,
		);
		throw new Error("Failed to authenticate with Daraja");
	}
}

/**
 * STEP 2: Generate Password for STK Push Request
 *
 * Daraja requires a password that combines:
 * - Shortcode (your Paybill/Till number)
 * - Passkey (from Safaricom developer portal)
 * - Timestamp (current time in format YYYYMMDDHHMMSS)
 *
 * These three are concatenated and then encoded in Base64.
 */
function generatePassword() {
	const timestamp = getTimestamp();
	const shortcode = process.env.MPESA_SHORTCODE;
	const passkey = process.env.MPESA_PASSKEY;

	const passwordString = `${shortcode}${passkey}${timestamp}`;
	const password = Buffer.from(passwordString).toString("base64");

	return { password, timestamp };
}

/**
 * Helper: Get current timestamp in format required by Daraja
 * Format: YYYYMMDDHHMMSS (e.g., 20251201143000 for Dec 1, 2025, 2:30:00 PM)
 */
function getTimestamp() {
	const date = new Date();
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	const hours = String(date.getHours()).padStart(2, "0");
	const minutes = String(date.getMinutes()).padStart(2, "0");
	const seconds = String(date.getSeconds()).padStart(2, "0");

	return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

/**
 * STEP 3: Initiate STK Push (Send payment prompt to customer's phone)
 *
 * This is the main function you'll call when a customer wants to pay.
 *
 * Parameters:
 * - phoneNumber: Customer's phone number (must start with 254, e.g., 254712345678)
 * - amount: Amount to charge in KES
 * - orderId: Your internal order/reference ID
 */
async function stkPush(phoneNumber, amount, orderId) {
	// First, get a valid access token
	const token = await getAccessToken();

	// Generate the required password and timestamp
	const { password, timestamp } = generatePassword();

	// Format phone number
	const formattedPhone = phoneNumber
		.toString()
		.replace(/^0+/, "")
		.replace(/^\+/, "");

	// Get your callback URL
	const callbackURL = `${process.env.BASE_URL}/api/mpesa/callback`;

	// Helper function to clean AccountReference
	function cleanReference(ref) {
		// Remove all non-alphanumeric characters
		let clean = String(ref).replace(/[^A-Za-z0-9]/g, "");
		// Max 12 characters
		if (clean.length > 12) {
			clean = clean.slice(0, 12);
		}
		// Ensure it's not empty
		if (clean.length === 0) {
			clean = "PAYMENT";
		}
		return clean;
	}

	const payload = {
		BusinessShortCode: process.env.MPESA_SHORTCODE,
		Password: password,
		Timestamp: timestamp,
		TransactionType: "CustomerPayBillOnline",
		Amount: Math.floor(Number(amount)),
		PartyA: formattedPhone,
		PartyB: process.env.MPESA_SHORTCODE,
		PhoneNumber: formattedPhone,
		CallBackURL: callbackURL,
		AccountReference: cleanReference(orderId), // CLEANED!
		TransactionDesc: "OrderPayment", // SHORT AND SIMPLE!
	};

	console.log("Sending payload to Daraja:", JSON.stringify(payload, null, 2));

	try {
		const response = await axios.post(
			`${baseURL}/mpesa/stkpush/v1/processrequest`,
			payload,
			{
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				},
			},
		);

		console.log("Daraja response:", response.data);

		return {
			success: response.data.ResponseCode === "0",
			checkoutRequestID: response.data.CheckoutRequestID,
			merchantRequestID: response.data.MerchantRequestID,
			message: response.data.ResponseDescription,
		};
	} catch (error) {
		console.error("STK Push error:", error.response?.data || error.message);
		throw new Error("Failed to initiate payment");
	}
}

/**
 * STEP 4: Query payment status (Optional - for polling)
 *
 * After initiating STK Push, you can check the status using the CheckoutRequestID.
 * This is useful for polling from the frontend while waiting for callback.
 */
async function queryStatus(checkoutRequestID) {
	const token = await getAccessToken();
	const { password, timestamp } = generatePassword();

	const payload = {
		BusinessShortCode: process.env.MPESA_SHORTCODE,
		Password: password,
		Timestamp: timestamp,
		CheckoutRequestID: checkoutRequestID,
	};

	try {
		const response = await axios.post(
			`${baseURL}/mpesa/stkpushquery/v1/query`,
			payload,
			{
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				},
			},
		);

		return response.data;
	} catch (error) {
		console.error(
			"Status query error:",
			error.response?.data || error.message,
		);
		return null;
	}
}

module.exports = { stkPush, queryStatus };
