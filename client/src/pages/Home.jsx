import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Home() {
	const navigate = useNavigate();

	// Sample products data - in a real app, this would come from your backend
	const [products] = useState([
		{
			id: 1,
			name: "Wireless Headphones",
			description:
				"High-quality Bluetooth headphones with noise cancellation",
			price: 3500,
			image: "🎧",
			category: "Electronics",
		},
		{
			id: 2,
			name: "Smart Watch",
			description: "Track your fitness and stay connected",
			price: 5500,
			image: "⌚",
			category: "Electronics",
		},
		{
			id: 3,
			name: "Running Shoes",
			description: "Comfortable athletic shoes for daily running",
			price: 2800,
			image: "👟",
			category: "Fashion",
		},
		{
			id: 4,
			name: "Coffee Mug",
			description: "Ceramic mug with heat retention technology",
			price: 450,
			image: "☕",
			category: "Home",
		},
		{
			id: 5,
			name: "Backpack",
			description: "Water-resistant laptop backpack",
			price: 2200,
			image: "🎒",
			category: "Fashion",
		},
		{
			id: 6,
			name: "Wireless Mouse",
			description: "Ergonomic wireless mouse with long battery life",
			price: 1200,
			image: "🖱️",
			category: "Electronics",
		},
	]);

	// Shopping cart state
	const [cart, setCart] = useState([]);
	const [showNotification, setShowNotification] = useState(false);
	const [notificationMessage, setNotificationMessage] = useState("");

	// Add product to cart
	const addToCart = (product) => {
		const existingItem = cart.find((item) => item.id === product.id);

		if (existingItem) {
			// If product already in cart, increase quantity
			setCart(
				cart.map((item) =>
					item.id === product.id
						? { ...item, quantity: item.quantity + 1 }
						: item,
				),
			);
			setNotificationMessage(`Added another ${product.name} to cart`);
		} else {
			// Add new product with quantity 1
			setCart([...cart, { ...product, quantity: 1 }]);
			setNotificationMessage(`${product.name} added to cart`);
		}

		// Show notification
		setShowNotification(true);
		setTimeout(() => setShowNotification(false), 2000);
	};

	// Get total items in cart
	const getCartCount = () => {
		return cart.reduce((total, item) => total + item.quantity, 0);
	};

	// Get cart total amount
	const getCartTotal = () => {
		return cart.reduce(
			(total, item) => total + item.price * item.quantity,
			0,
		);
	};

	// Proceed to checkout
	const proceedToCheckout = () => {
		// Pass cart data to checkout page via state
		navigate("/checkout", { state: { cart, total: getCartTotal() } });
	};

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Notification Toast */}
			{showNotification && (
				<div className="fixed top-20 right-4 z-50 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg animate-in slide-in-from-top-2">
					{notificationMessage}
				</div>
			)}

			{/* Header / Navigation Bar */}
			<header className="bg-white shadow-md sticky top-0 z-40">
				<div className="container mx-auto px-4 py-4">
					<div className="flex justify-between items-center">
						{/* Logo */}
						<div className="flex items-center space-x-2">
							<span className="text-2xl">🏪</span>
							<h1 className="text-xl font-bold text-gray-800">
								ShopKenya
							</h1>
						</div>

						{/* Cart Button */}
						<button
							onClick={proceedToCheckout}
							className="relative bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition flex items-center gap-2"
						>
							<span>🛒</span>
							<span>Cart</span>
							{getCartCount() > 0 && (
								<span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
									{getCartCount()}
								</span>
							)}
						</button>
					</div>
				</div>
			</header>

			{/* Hero Section */}
			<section className="bg-gradient-to-r from-green-600 to-green-800 text-white py-16">
				<div className="container mx-auto px-4 text-center">
					<h2 className="text-4xl font-bold mb-4">
						Welcome to ShopKenya
					</h2>
					<p className="text-xl mb-8">
						Quality products at affordable prices. Pay with M-Pesa
						seamlessly!
					</p>
					<div className="inline-flex items-center gap-2 bg-white text-green-700 px-6 py-3 rounded-full font-semibold">
						<span>📱</span>
						<span>Free Delivery on orders over KES 2000</span>
					</div>
				</div>
			</section>

			{/* Products Grid */}
			<div className="container mx-auto px-4 py-12">
				<div className="flex justify-between items-center mb-8">
					<h2 className="text-2xl font-bold text-gray-800">
						Our Products
					</h2>
					{cart.length > 0 && (
						<button
							onClick={proceedToCheckout}
							className="text-green-600 hover:text-green-700 font-semibold flex items-center gap-2"
						>
							View Cart ({getCartCount()} items) →
						</button>
					)}
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{products.map((product) => (
						<div
							key={product.id}
							className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
						>
							{/* Product Image/Icon */}
							<div className="bg-gray-100 p-8 text-center">
								<span className="text-6xl">
									{product.image}
								</span>
							</div>

							{/* Product Details */}
							<div className="p-4">
								<div className="flex justify-between items-start mb-2">
									<h3 className="text-lg font-semibold text-gray-800">
										{product.name}
									</h3>
									<span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
										{product.category}
									</span>
								</div>
								<p className="text-gray-600 text-sm mb-3">
									{product.description}
								</p>
								<div className="flex justify-between items-center">
									<span className="text-xl font-bold text-green-600">
										KES {product.price.toLocaleString()}
									</span>
									<button
										onClick={() => addToCart(product)}
										className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition flex items-center gap-2"
									>
										<span>➕</span>
										<span>Add to Cart</span>
									</button>
								</div>
							</div>
						</div>
					))}
				</div>
			</div>

			{/* Features Section */}
			<section className="bg-white py-12 border-t">
				<div className="container mx-auto px-4">
					<div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
						<div>
							<div className="text-4xl mb-3">🚚</div>
							<h3 className="font-semibold mb-2">
								Free Delivery
							</h3>
							<p className="text-gray-600 text-sm">
								On orders over KES 2000
							</p>
						</div>
						<div>
							<div className="text-4xl mb-3">🛡️</div>
							<h3 className="font-semibold mb-2">
								Secure Payments
							</h3>
							<p className="text-gray-600 text-sm">
								M-Pesa encrypted transactions
							</p>
						</div>
						<div>
							<div className="text-4xl mb-3">🔄</div>
							<h3 className="font-semibold mb-2">Easy Returns</h3>
							<p className="text-gray-600 text-sm">
								7-day return policy
							</p>
						</div>
					</div>
				</div>
			</section>
		</div>
	);
}

export default Home;
