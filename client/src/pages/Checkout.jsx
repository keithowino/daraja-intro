import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Payment from "../components/buttons/Payment";

function Checkout() {
	const location = useLocation();
	const navigate = useNavigate();

	// Get cart data passed from Home page
	const [cartItems, setCartItems] = useState([]);
	const [totalAmount, setTotalAmount] = useState(0);

	useEffect(() => {
		// Check if we received cart data from navigation
		if (location.state && location.state.cart) {
			setCartItems(location.state.cart);
			setTotalAmount(location.state.total);
		} else {
			// If someone navigates directly to checkout, show empty cart
			setCartItems([]);
			setTotalAmount(0);
		}
	}, [location]);

	// Generate a unique order ID
	const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

	const handlePaymentSuccess = (paymentData) => {
		console.log("Order paid!", paymentData);

		// Save order to localStorage (in a real app, you'd send to backend)
		const completedOrder = {
			orderId: orderId,
			items: cartItems,
			total: totalAmount,
			mpesaReceipt: paymentData.mpesaReceiptNumber,
			date: new Date().toISOString(),
			status: "paid",
		};

		// Get existing orders or create new array
		const existingOrders = JSON.parse(
			localStorage.getItem("orders") || "[]",
		);
		existingOrders.push(completedOrder);
		localStorage.setItem("orders", JSON.stringify(existingOrders));

		// Clear cart (in a real app, you'd clear it in the backend)
		localStorage.removeItem("cart");

		// Show success message and redirect to confirmation
		alert(`Payment successful! Receipt: ${paymentData.mpesaReceiptNumber}`);
		navigate("/order-confirmation", { state: { order: completedOrder } });
	};

	const handlePaymentFailure = (error) => {
		console.error("Payment failed:", error);
		alert("Payment failed. Please try again.");
	};

	// If cart is empty, show message and link back to shop
	if (cartItems.length === 0) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center p-8 bg-white rounded-lg shadow-md">
					<div className="text-6xl mb-4">🛒</div>
					<h2 className="text-2xl font-bold text-gray-800 mb-4">
						Your cart is empty
					</h2>
					<p className="text-gray-600 mb-6">
						Add some products to your cart before checking out.
					</p>
					<button
						onClick={() => navigate("/")}
						className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition"
					>
						Continue Shopping
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50 py-8">
			<div className="container mx-auto px-4">
				{/* Back Button */}
				<button
					onClick={() => navigate("/")}
					className="mb-6 text-green-600 hover:text-green-700 flex items-center gap-2"
				>
					← Back to Shopping
				</button>

				<h1 className="text-2xl font-bold text-gray-800 mb-8">
					Checkout
				</h1>

				<div className="grid lg:grid-cols-2 gap-8">
					{/* Left side - Order Summary */}
					<div className="bg-white rounded-lg shadow-md p-6">
						<h2 className="text-lg font-semibold mb-4 border-b pb-2">
							Order Summary
						</h2>

						{/* Cart Items List */}
						<div className="space-y-3 max-h-96 overflow-y-auto mb-4">
							{cartItems.map((item) => (
								<div
									key={item.id}
									className="flex justify-between items-center py-2 border-b"
								>
									<div className="flex items-center gap-3">
										<span className="text-2xl">
											{item.image}
										</span>
										<div>
											<p className="font-medium text-gray-800">
												{item.name}
											</p>
											<p className="text-sm text-gray-500">
												Quantity: {item.quantity}
											</p>
										</div>
									</div>
									<span className="font-semibold text-gray-800">
										KES{" "}
										{(
											item.price * item.quantity
										).toLocaleString()}
									</span>
								</div>
							))}
						</div>

						{/* Totals */}
						<div className="border-t pt-4 space-y-2">
							<div className="flex justify-between text-gray-600">
								<span>Subtotal:</span>
								<span>KES {totalAmount.toLocaleString()}</span>
							</div>
							<div className="flex justify-between text-gray-600">
								<span>Delivery Fee:</span>
								<span>
									{totalAmount >= 2000 ? "FREE" : "KES 150"}
								</span>
							</div>
							<div className="flex justify-between text-xl font-bold text-gray-800 pt-2 border-t">
								<span>Total to Pay:</span>
								<span className="text-green-600">
									KES{" "}
									{totalAmount >= 2000
										? totalAmount.toLocaleString()
										: (totalAmount + 150).toLocaleString()}
								</span>
							</div>
						</div>
					</div>

					{/* Right side - Payment Component */}
					<div>
						<Payment
							orderId={orderId}
							amount={
								totalAmount >= 2000
									? totalAmount
									: totalAmount + 150
							}
							onSuccess={handlePaymentSuccess}
							onFailure={handlePaymentFailure}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}

export default Checkout;
