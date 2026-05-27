import { useState } from "react";
import Payment from "../components/buttons/Payment";

function Checkout() {
	// In a real app, this data would come from your cart state or backend
	const [cartItems] = useState([
		{ id: 1, name: "Product 1", price: 500, quantity: 2 },
		{ id: 2, name: "Product 2", price: 300, quantity: 1 },
	]);

	// Calculate total amount
	const totalAmount = cartItems.reduce(
		(sum, item) => sum + item.price * item.quantity,
		0,
	);

	// Generate a unique order ID (in production, your backend would do this)
	const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

	const handlePaymentSuccess = (data) => {
		console.log("Order paid!", data);
		// Redirect to order confirmation page
		window.location.href = `/order-confirmation/${data.mpesaReceiptNumber}`;
	};

	return (
		<div className="max-w-6xl mx-auto px-4 py-8">
			<h1 className="text-2xl font-bold mb-8">Checkout</h1>

			<div className="grid md:grid-cols-2 gap-8">
				{/* Left side - Order Summary */}
				<div className="bg-white rounded-lg shadow p-6">
					<h2 className="text-lg font-semibold mb-4">
						Order Summary
					</h2>
					{cartItems.map((item) => (
						<div
							key={item.id}
							className="flex justify-between py-2 border-b"
						>
							<span>
								{item.name} x {item.quantity}
							</span>
							<span>KES {item.price * item.quantity}</span>
						</div>
					))}
					<div className="flex justify-between pt-4 font-bold">
						<span>Total:</span>
						<span>KES {totalAmount}</span>
					</div>
				</div>

				{/* Right side - Payment Component */}
				<Payment
					orderId={orderId}
					amount={totalAmount}
					onSuccess={handlePaymentSuccess}
					onFailure={(error) =>
						console.error("Payment error:", error)
					}
				/>
			</div>
		</div>
	);
}

export default Checkout;
