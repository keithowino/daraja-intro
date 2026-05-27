import { useState } from "react";

/**
 * Payment Component - Handles M-Pesa STK Push payments
 *
 * @param {Object} props
 * @param {string} props.orderId - Unique identifier for the order being paid
 * @param {number} props.amount - Amount to charge in KES (Kenyan Shillings)
 * @param {Function} props.onSuccess - Callback function when payment succeeds
 * @param {Function} props.onFailure - Callback function when payment fails
 */
function Payment({ orderId, amount, onSuccess, onFailure }) {
	// State management - these variables trigger re-renders when changed
	const [phoneNumber, setPhoneNumber] = useState("254712345600"); // Customer's M-Pesa number // 254708374149
	const [loading, setLoading] = useState(false); // Disables button during payment
	const [paymentId, setPaymentId] = useState(null); // Database ID of this payment
	const [status, setStatus] = useState(null); // pending | completed | failed | timeout

	/**
	 * Polls the backend every 2 seconds to check if payment was completed
	 * Why? Because Safaricom sends callbacks asynchronously - we need to wait
	 *
	 * @param {string} paymentId - The ID of the payment to check
	 */
	const pollPaymentStatus = async (paymentId) => {
		// setInterval runs a function repeatedly every X milliseconds
		const interval = setInterval(async () => {
			try {
				// Fetch the current status from our backend
				const response = await fetch(`/api/mpesa/status/${paymentId}`);
				const data = await response.json();

				// Update UI with current status
				setStatus(data.status);

				// If payment completed successfully
				if (data.status === "completed") {
					clearInterval(interval); // Stop polling
					setLoading(false); // Re-enable button (though we may hide it)
					if (onSuccess) onSuccess(data); // Call the success callback
				}
				// If payment failed
				else if (data.status === "failed") {
					clearInterval(interval);
					setLoading(false);
					if (onFailure) onFailure(data);
				}
			} catch (error) {
				console.error("Status check error:", error);
			}
		}, 2000); // 2000 milliseconds = 2 seconds

		// Stop polling after 2 minutes (120,000 ms) - Safaricom usually responds faster
		// This prevents infinite polling if something goes wrong
		setTimeout(() => {
			clearInterval(interval);
			if (loading) {
				setLoading(false);
				setStatus("timeout");
			}
		}, 120000);
	};

	/**
	 * Called when user submits the form (clicks "Pay" button)
	 * @param {Event} e - Form submit event (prevents page refresh)
	 */
	const handlePayment = async (e) => {
		e.preventDefault(); // Prevents browser from refreshing the page

		// Validate Kenyan phone number format: must be 254 followed by 9 digits
		// Example: 254712345678 (12 digits total: 254 + 9-digit number)
		const phoneRegex = /^254[0-9]{9}$/;
		if (!phoneRegex.test(phoneNumber)) {
			alert(
				"Please enter a valid phone number starting with 254 (e.g., 254712345678)",
			);
			return;
		}

		setLoading(true); // Disable button, show loading state
		setStatus("pending"); // Show "waiting for PIN" message

		try {
			// Send payment initiation request to our backend
			const response = await fetch("/api/mpesa/initiate", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					phoneNumber, // Customer's M-Pesa number
					amount, // Amount to charge
					orderId, // Your internal order reference
				}),
			});

			const data = await response.json();

			if (data.success) {
				// Save the payment ID so we can check status later
				setPaymentId(data.paymentId);
				// Start polling the backend for payment confirmation
				pollPaymentStatus(data.paymentId);
			} else {
				// Backend rejected the request (e.g., invalid credentials, network error)
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

	/**
	 * RENDER METHOD - This is what shows on screen
	 * All className values are Tailwind CSS utility classes
	 */
	return (
		// Main container - centers content with padding and max width
		<div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
			{/* PAYMENT FORM - Visible when not in success state */}
			{status !== "completed" && (
				<form onSubmit={handlePayment} className="space-y-6">
					{/* Amount Display - Shows how much customer will pay */}
					<div className="text-center">
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Amount to Pay
						</label>
						<div className="text-3xl font-bold text-green-600">
							KES {amount.toLocaleString()}
						</div>
					</div>

					{/* Phone Number Input Field */}
					<div>
						<label
							htmlFor="phone"
							className="block text-sm font-medium text-gray-700 mb-2"
						>
							M-Pesa Registered Phone Number
						</label>
						<input
							id="phone"
							type="tel"
							value={phoneNumber}
							onChange={(e) => setPhoneNumber(e.target.value)}
							placeholder="254712345678"
							disabled={loading}
							required
							className={`
                w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-green-500 
                focus:border-green-500 outline-none transition
                ${loading ? "bg-gray-100 cursor-not-allowed" : "bg-white"}
              `}
						/>
						<p className="mt-1 text-xs text-gray-500">
							Enter your Safaricom line number starting with 254
							(e.g., 254712345678)
						</p>
					</div>

					{/* Submit Button */}
					<button
						type="submit"
						disabled={loading}
						className={`
              w-full py-3 px-4 rounded-md font-semibold text-white
              transition duration-200 ease-in-out
              ${
					loading
						? "bg-gray-400 cursor-not-allowed"
						: "bg-green-600 hover:bg-green-700 active:bg-green-800"
				}
            `}
					>
						{loading ? (
							// Show spinner and "Processing..." text when loading
							<span className="flex items-center justify-center gap-2">
								<svg
									className="animate-spin h-5 w-5 text-white"
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
								>
									<circle
										className="opacity-25"
										cx="12"
										cy="12"
										r="10"
										stroke="currentColor"
										strokeWidth="4"
									/>
									<path
										className="opacity-75"
										fill="currentColor"
										d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
									/>
								</svg>
								Processing...
							</span>
						) : (
							`Pay KES ${amount.toLocaleString()}`
						)}
					</button>
				</form>
			)}

			{/* PENDING STATUS - Waiting for customer to enter PIN on phone */}
			{status === "pending" && (
				<div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
					<div className="flex items-center gap-3">
						{/* Spinner animation */}
						<div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-600"></div>
						<div>
							<p className="font-medium text-yellow-800">
								📱 Payment prompt sent!
							</p>
							<p className="text-sm text-yellow-700 mt-1">
								Check your phone, enter your M-Pesa PIN when
								prompted
							</p>
						</div>
					</div>
				</div>
			)}

			{/* SUCCESS STATUS - Payment completed */}
			{status === "completed" && (
				<div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
					<div className="flex items-center gap-3">
						<span className="text-2xl">✅</span>
						<div>
							<p className="font-medium text-green-800">
								Payment Successful!
							</p>
							<p className="text-sm text-green-700 mt-1">
								Your payment of KES {amount.toLocaleString()}{" "}
								has been received
							</p>
						</div>
					</div>
				</div>
			)}

			{/* FAILED STATUS - Something went wrong */}
			{status === "failed" && (
				<div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
					<div className="flex items-center gap-3">
						<span className="text-2xl">❌</span>
						<div>
							<p className="font-medium text-red-800">
								Payment Failed
							</p>
							<p className="text-sm text-red-700 mt-1">
								Please try again or use a different payment
								method
							</p>
							{/* Retry button - clears error and shows form again */}
							<button
								onClick={() => {
									setStatus(null);
									setPhoneNumber("");
								}}
								className="mt-2 text-sm text-red-600 underline hover:text-red-800"
							>
								Try Again
							</button>
						</div>
					</div>
				</div>
			)}

			{/* TIMEOUT STATUS - Customer took too long to enter PIN */}
			{status === "timeout" && (
				<div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
					<div className="flex items-center gap-3">
						<span className="text-2xl">⏰</span>
						<div>
							<p className="font-medium text-orange-800">
								Request Timed Out
							</p>
							<p className="text-sm text-orange-700 mt-1">
								Payment prompt expired. Please try again.
							</p>
							<button
								onClick={() => {
									setStatus(null);
									setPhoneNumber("");
								}}
								className="mt-2 text-sm text-orange-600 underline hover:text-orange-800"
							>
								Try Again
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

export default Payment;
