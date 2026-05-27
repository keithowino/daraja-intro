import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";

function OrderConfirmation() {
	const location = useLocation();
	const navigate = useNavigate();
	const order = location.state?.order;

	// If no order data, redirect to home
	useEffect(() => {
		if (!order) {
			navigate("/");
		}
	}, [order, navigate]);

	if (!order) {
		return null;
	}

	return (
		<div className="min-h-screen bg-gray-50 py-12">
			<div className="container mx-auto px-4 max-w-2xl">
				{/* Success Card */}
				<div className="bg-white rounded-lg shadow-md p-8 text-center">
					{/* Success Icon */}
					<div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
						<span className="text-4xl">✅</span>
					</div>

					<h1 className="text-2xl font-bold text-gray-800 mb-2">
						Payment Successful!
					</h1>
					<p className="text-gray-600 mb-6">
						Thank you for your purchase
					</p>

					{/* Order Details */}
					<div className="bg-gray-50 rounded-lg p-6 text-left mb-6">
						<h2 className="font-semibold text-gray-800 mb-4">
							Order Details
						</h2>

						<div className="space-y-2 text-sm">
							<div className="flex justify-between">
								<span className="text-gray-600">Order ID:</span>
								<span className="font-mono">
									{order.orderId}
								</span>
							</div>
							<div className="flex justify-between">
								<span className="text-gray-600">
									M-Pesa Receipt:
								</span>
								<span className="font-mono text-green-600">
									{order.mpesaReceipt}
								</span>
							</div>
							<div className="flex justify-between">
								<span className="text-gray-600">
									Total Amount:
								</span>
								<span className="font-bold">
									KES {order.total.toLocaleString()}
								</span>
							</div>
							<div className="flex justify-between">
								<span className="text-gray-600">Date:</span>
								<span>
									{new Date(order.date).toLocaleString()}
								</span>
							</div>
						</div>

						<div className="border-t mt-4 pt-4">
							<p className="font-semibold text-gray-800 mb-2">
								Items Purchased:
							</p>
							<div className="space-y-2">
								{order.items.map((item, index) => (
									<div
										key={index}
										className="flex justify-between text-sm"
									>
										<span>
											{item.name} x {item.quantity}
										</span>
										<span>
											KES{" "}
											{(
												item.price * item.quantity
											).toLocaleString()}
										</span>
									</div>
								))}
							</div>
						</div>
					</div>

					{/* Action Buttons */}
					<div className="flex gap-4 justify-center">
						<button
							onClick={() => navigate("/")}
							className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition"
						>
							Continue Shopping
						</button>
						<button
							onClick={() => window.print()}
							className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition"
						>
							Print Receipt
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

export default OrderConfirmation;
