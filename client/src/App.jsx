// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Checkout from "./pages/Checkout";
import OrderConfirmation from "./pages/OrderConfirmation";

function App() {
	return (
		<Router>
			<Routes>
				{/* Home page - displays products */}
				<Route path="/" element={<Home />} />

				{/* Checkout page - shows cart and payment form */}
				<Route path="/checkout" element={<Checkout />} />

				{/* Order confirmation page - shown after successful payment */}
				<Route
					path="/order-confirmation"
					element={<OrderConfirmation />}
				/>
			</Routes>
		</Router>
	);
}

export default App;
