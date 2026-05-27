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
