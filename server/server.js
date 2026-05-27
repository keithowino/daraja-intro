const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

// Load environment variables from .env file
dotenv.config();

// Import your payment routes
const paymentRoutes = require("./routes/paymentRoutes");

// Create the Express application
const app = express();

// ========== MIDDLEWARE ==========
// These are functions that run before your routes handle requests

// Allow Express to parse JSON data from request bodies
app.use(express.json());

// Allow Express to parse URL-encoded data (from HTML forms)
app.use(express.urlencoded({ extended: true }));

// ========== DATABASE CONNECTION ==========
// Connect to MongoDB - Mongoose 7+ doesn't need the old options

mongoose
	.connect(process.env.MONGODB_URI)
	.then(() => {
		console.log("✅ Connected to MongoDB successfully");
	})
	.catch((error) => {
		console.error("❌ MongoDB connection error:", error);
		process.exit(1); // Stop the server if database connection fails
	});

// ========== ROUTES ==========
// This is where we tell Express to use our payment routes
// All payment-related endpoints will start with /api/mpesa

app.use("/api/mpesa", paymentRoutes);

// ========== TEST ROUTE ==========
// A simple route to check if your server is running
app.get("/", (req, res) => {
	res.json({
		message: "M-Pesa Server is running!",
		status: "active",
		endpoints: {
			initiatePayment: "POST /api/mpesa/initiate",
			callback: "POST /api/mpesa/callback",
			checkStatus: "GET /api/mpesa/status/:paymentId",
		},
	});
});

// ========== START THE SERVER ==========
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
	console.log(`🚀 Server is running on port ${PORT}`);
	console.log(`📍 Test the server at http://localhost:${PORT}`);
});
