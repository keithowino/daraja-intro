import { useState } from "react";

function Payment({ orderId, amount, onSuccess, onFailure }) {
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

export default Payment;
