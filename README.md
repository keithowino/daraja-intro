# Complete Guide: Integrating Daraja 3.0 with a MERN Stack App

This guide will walk you through integrating Safaricom's Daraja API (STK Push) into your MERN application. I'll explain every step in detail since this is your first payment integration.

## What is Daraja 3.0?

Daraja is Safaricom's API that allows developers to integrate M-Pesa payments into applications. The STK Push (commonly called "Lipa Na M-Pesa Online") sends a payment prompt directly to a customer's phone, asking them to enter their PIN to complete payment.

**Important:** Daraja 3.0 launched in November 2025 as a platform upgrade, but the core STK Push flow remains backward compatible with Daraja 2.0 integrations. The endpoints you'll use haven't changed, so existing guides and SDKs still work.

---

## Architecture Overview: How STK Push Works

Before writing code, understand the flow:

```
Frontend (React) → Backend (Node/Express) → Safaricom Daraja → Customer Phone
                                              ↓
                                    Callback to your server
                                              ↓
                                    Update payment status
```

The key thing to understand: **The payment happens asynchronously**. Your server sends a request to Daraja, Daraja immediately responds with "request accepted," then the customer enters their PIN on their phone, and finally Safaricom sends a callback to your server with the actual payment result.

Here's the complete sequence:

1. Customer clicks "Pay" button on your React frontend
2. Frontend sends payment details to your Express backend
3. Backend requests an OAuth token from Daraja
4. Backend sends STK Push request to Daraja
5. Daraja responds immediately (success/failure of request, not payment)
6. Customer receives phone prompt and enters PIN
7. Safaricom sends callback to your server with payment result
8. Your backend updates database
9. Frontend polls a status endpoint to confirm completion

---

## Prerequisites

Before starting, you'll need:

1. **Safaricom Developer Account** - Sign up at [developer.safaricom.co.ke](https://developer.safaricom.co.ke)
2. **API Credentials** (from the developer portal):
    - Consumer Key
    - Consumer Secret
    - Passkey (for STK Push)
    - Shortcode (Paybill/Till Number)
3. **Ngrok** (for development) - Exposes your local server to the internet so Safaricom can send callbacks. Download from [ngrok.com](https://ngrok.com)

---

## Step 1: Set Up Your MERN Project Structure

First, let's organize your project. If you have an existing MERN app, you'll add these files:

```
your-mern-app/
├── server/
│   ├── models/
│   │   └── Payment.js
│   ├── controllers/
│   │   └── paymentController.js
│   ├── routes/
│   │   └── paymentRoutes.js
│   ├── services/
│   │   └── mpesaService.js
│   └── .env
├── client/
│   └── src/
│       └── components/
│           └── PaymentButton.jsx
```

---

## Step 2: Install Dependencies

Navigate to your server directory and install required packages:

```bash
npm install axios express dotenv ngrok
```

**What each package does:**

- `axios`: Makes HTTP requests to Daraja API endpoints
- `express`: Your backend framework
- `dotenv`: Manages environment variables (keeps credentials secure)
- `ngrok` (optional but recommended): Creates a public URL for local testing

---

## Step 3: Configure Environment Variables

Create a `.env` file in your server directory:

```env
# Daraja API Credentials
MPESA_CONSUMER_KEY=your_consumer_key_here
MPESA_CONSUMER_SECRET=your_consumer_secret_here
MPESA_PASSKEY=your_passkey_here
MPESA_SHORTCODE=174379
MPESA_ENV=sandbox

# Your App
PORT=5000
BASE_URL=http://localhost:5000
```

**Important notes:**

- `174379` is the sandbox shortcode provided by Safaricom for testing
- Keep your `.env` file in `.gitignore` - never commit credentials
- Set `MPESA_ENV=production` when going live

---

## Step 4: Create the M-Pesa Service

This file handles all communication with Daraja. Create `server/services/mpesaService.js`:

```javascript
const axios = require("axios");
require("dotenv").config();

// Determine which environment we're using
const env = process.env.MPESA_ENV === "production" ? "production" : "sandbox";

// Daraja base URL - different for sandbox vs production
const baseURL =
	env === "production"
		? "https://api.safaricom.co.ke"
		: "https://sandbox.safaricom.co.ke";

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

	// Format phone number - remove any leading 0 or +254 and ensure it starts with 254
	// Example: "0712345678" becomes "254712345678", "+254712345678" becomes "254712345678"
	const formattedPhone = phoneNumber
		.toString()
		.replace(/^0+/, "")
		.replace(/^\+/, "");

	// Get your callback URL - this is where Safaricom will send payment results
	// In development, use ngrok URL. In production, use your actual domain
	const callbackURL = `${process.env.BASE_URL}/api/mpesa/callback`;

	// The payload structure Daraja expects
	const payload = {
		BusinessShortCode: process.env.MPESA_SHORTCODE,
		Password: password,
		Timestamp: timestamp,
		TransactionType: "CustomerPayBillOnline",
		Amount: Math.floor(Number(amount)), // Ensure it's an integer
		PartyA: formattedPhone, // Customer's phone number
		PartyB: process.env.MPESA_SHORTCODE, // Your shortcode
		PhoneNumber: formattedPhone, // Same as PartyA for STK Push
		CallBackURL: callbackURL,
		AccountReference: `Order-${orderId}`, // Shows on customer's statement
		TransactionDesc: "Payment for order", // Description of transaction
	};

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

		// Daraja responds with:
		// - ResponseCode: "0" means request was accepted
		// - CheckoutRequestID: You can use this to check status later
		// - MerchantRequestID: Reference for this transaction

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
```

---

## Step 5: Create the Payment Model

Create `server/models/Payment.js` to store payment records in MongoDB:

```javascript
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
```

---

## Step 6: Create the Payment Controller

Create `server/controllers/paymentController.js`:

```javascript
const Payment = require("../models/Payment");
const mpesaService = require("../services/mpesaService");

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
```

---

## Step 7: Create Routes

Create `server/routes/paymentRoutes.js`:

```javascript
const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");

// Initiate payment (frontend calls this)
router.post("/initiate", paymentController.initiatePayment);

// Callback endpoint for Safaricom (important: this must be publicly accessible)
router.post("/callback", paymentController.handleCallback);

// Check payment status (for polling)
router.get("/status/:paymentId", paymentController.getPaymentStatus);

module.exports = router;
```

In your main `server/app.js` or `server/index.js`, mount the routes:

```javascript
const paymentRoutes = require("./routes/paymentRoutes");

// ... after initializing express app
app.use("/api/mpesa", paymentRoutes);
```

---

## Step 8: Create the React Frontend Component

Now for the client side. Create `client/src/components/PaymentButton.jsx`:

```jsx
import { useState } from "react";

function PaymentButton({ orderId, amount, onSuccess, onFailure }) {
	const [phoneNumber, setPhoneNumber] = useState("");
	const [loading, setLoading] = useState(false);
	const [paymentId, setPaymentId] = useState(null);
	const [status, setStatus] = useState(null);

	// Poll for payment status every 2 seconds
	const pollPaymentStatus = async (paymentId) => {
		const interval = setInterval(async () => {
			try {
				const response = await fetch(`/api/mpesa/status/${paymentId}`);
				const data = await response.json();

				setStatus(data.status);

				if (data.status === "completed") {
					clearInterval(interval);
					setLoading(false);
					if (onSuccess) onSuccess(data);
				} else if (data.status === "failed") {
					clearInterval(interval);
					setLoading(false);
					if (onFailure) onFailure(data);
				}
			} catch (error) {
				console.error("Status check error:", error);
			}
		}, 2000);

		// Stop polling after 2 minutes (timeout)
		setTimeout(() => {
			clearInterval(interval);
			if (loading) {
				setLoading(false);
				setStatus("timeout");
			}
		}, 120000);
	};

	const handlePayment = async (e) => {
		e.preventDefault();

		// Basic phone validation
		const phoneRegex = /^254[0-9]{9}$/;
		if (!phoneRegex.test(phoneNumber)) {
			alert(
				"Please enter a valid phone number starting with 254 (e.g., 254712345678)",
			);
			return;
		}

		setLoading(true);
		setStatus("pending");

		try {
			const response = await fetch("/api/mpesa/initiate", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					phoneNumber,
					amount,
					orderId,
				}),
			});

			const data = await response.json();

			if (data.success) {
				setPaymentId(data.paymentId);
				pollPaymentStatus(data.paymentId);
			} else {
				setLoading(false);
				setStatus("failed");
				if (onFailure) onFailure(data);
			}
		} catch (error) {
			console.error("Payment initiation error:", error);
			setLoading(false);
			setStatus("failed");
		}
	};

	return (
		<div className="payment-container">
			<form onSubmit={handlePayment}>
				<div>
					<label>Amount: KES {amount}</label>
				</div>
				<div>
					<label>M-Pesa Phone Number:</label>
					<input
						type="tel"
						value={phoneNumber}
						onChange={(e) => setPhoneNumber(e.target.value)}
						placeholder="254712345678"
						disabled={loading}
						required
					/>
					<small>Enter the M-Pesa registered phone number</small>
				</div>
				<button type="submit" disabled={loading}>
					{loading ? "Processing..." : `Pay KES ${amount}`}
				</button>
			</form>

			{status === "pending" && (
				<div className="payment-status waiting">
					<p>📱 Payment prompt sent to your phone</p>
					<p>Enter your M-Pesa PIN when prompted</p>
					<div className="spinner"></div>
				</div>
			)}

			{status === "completed" && (
				<div className="payment-status success">
					<p>✅ Payment successful!</p>
				</div>
			)}

			{status === "failed" && (
				<div className="payment-status error">
					<p>❌ Payment failed. Please try again.</p>
				</div>
			)}

			{status === "timeout" && (
				<div className="payment-status error">
					<p>
						⏰ Payment took too long. Please check transaction
						status.
					</p>
				</div>
			)}
		</div>
	);
}

export default PaymentButton;
```

---

## Step 9: Test Locally with Ngrok

Since Safaricom needs to send callbacks to your local server during development, you'll use ngrok to create a public URL.

1. **Start ngrok** (in a new terminal):

```bash
ngrok http 5000
```

2. **Note the HTTPS URL** ngrok provides, like `https://abc123.ngrok.io`

3. **Update your `.env` file**:

```env
BASE_URL=https://abc123.ngrok.io   # Your ngrok URL
```

4. **Restart your server** to pick up the new BASE_URL

Now when you test, Safaricom can successfully send callbacks to your local machine.

---

## Testing Steps

1. Start your MongoDB database
2. Start your Express server: `npm start` or `node server/index.js`
3. Start your React app: `npm start` in client directory
4. Use sandbox test numbers (from Safaricom developer portal)
5. For amount, use small values like 10 KES for testing

The sandbox environment doesn't actually deduct money - you can test with any amount.

---

## Going to Production Checklist

Before switching to production, complete these steps:

1. **Get live credentials** from Safaricom Developer Portal (requires business registration)
2. **Update `.env`**:
    ```env
    MPESA_ENV=production
    BASE_URL=https://your-actual-domain.com
    ```
3. **Add a webhook verification system** to ensure callbacks are actually from Safaricom (check IP addresses or add authentication headers)
4. **Implement token caching** - The access token lasts 1 hour; don't request a new one for every payment
5. **Add logging and monitoring** for all payment attempts
6. **Set up a queue/timeout handler** - The `QueueTimeOutURL` endpoint should be implemented for production
7. **Ensure your server handles high traffic** - Payment callbacks can come simultaneously

---

## Common Issues and Solutions

**"Invalid Consumer Key" error**: Double-check your credentials in `.env` - no extra spaces

**Callback not received**:

- Ensure your BASE_URL is correctly set
- Check that ngrok is still running (free tier URLs change)
- Verify the callback route is exactly `/api/mpesa/callback`

**Phone number format errors**: Numbers must start with 254, no leading 0 or +

**"Request cancelled by user"** (ResultCode 1037): Customer didn't enter PIN within the time limit

**Debugging tip**: Log every request and response. For production, use a service like Sentry or LogRocket to track payment-related errors.

---

## Important Security Notes

- **Never log customer PINs or full card details**
- **Keep .env file out of version control**
- **Validate callback IP addresses** (Safaricom provides a list of their IP ranges)
- **Use HTTPS in production** (Safaricom requires it for callbacks)

This should get you up and running with Daraja 3.0 in your MERN app. The STK Push flow handles 90% of e-commerce payment use cases. Once you understand this pattern, adding other M-Pesa features like recurring payments (Ratiba) or B2B transfers follows similar patterns.
