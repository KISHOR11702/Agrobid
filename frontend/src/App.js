import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import './App.css';
import SignupPage from './components/SignupPage'; // Signup Page
import LoginPage from './components/LoginPage'; // Login Page
import FarmerDashboard from './components/FarmerDashboard/FarmerDashboard'; // Farmer Dashboard
import BuyerDashboard from './components/BuyerDashboard/BuyerDashboard'; // Buyer Dashboard
import AddProductPage from './components/AddProductPage/AddProductPage'; // Add Product Page
import ViewProductsPage from './components/ViewProductsPage/ViewProductsPage'; // View Products Page
import AvailableProducts from './components/AvailableProductsPage/AvailableProductsPage'; // Available Products Page
import YourBids from './components/YourBids/YourBids'; // Your Bids Page
import AddFarmerDetailsPage from './components/AddFarmerDetailsPage/AddFarmerDetailsPage';
import AddBuyerDetailsPage from './components/AddBuyerDetailsPage/AddBuyerDetailsPage'; // Import the AddBuyerDetailsPage component
import ForgotPasswordPage from './components/ForgotPasswordPage/ForgotPasswordPage'; // Import the new page

//import heroAgriculture from './assets/Images/dalle.webp';

function App() {
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Make a GET request to the backend API (running on port 5000)
    axios.get('http://localhost:5000/api/welcome')
      .then((response) => {
        setMessage(response.data.message); // Set the response message to state
      })
      .catch((error) => {
        console.error('There was an error making the request:', error);
      });
  }, []);

  return (
    <Router>
      <div className="App">
        {/* Welcome message */}
        <h1>{message}</h1>

        {/* Define Routes */}
        <Routes>
          <Route path="/" element={<Home />} /> {/* Home route with Login and Signup buttons */}
          <Route path="/signup" element={<SignupPage />} /> {/* Signup Page */}
          <Route path="/login" element={<LoginPage />} /> {/* Login Page */}
          <Route path="/farmer-dashboard" element={<FarmerDashboard />} /> {/* Farmer Dashboard */}
          <Route path="/buyer-dashboard" element={<BuyerDashboard />} /> {/* Buyer Dashboard */}
          <Route path="/add-product" element={<AddProductPage />} /> {/* Add Product Page */}
          <Route path="/view-products" element={<ViewProductsPage />} /> {/* View Products Page */}
          <Route path="/available-products" element={<AvailableProducts />} /> {/* Available Products Page */}
          <Route path="/your-bids" element={<YourBids />} /> {/* Your Bids Page */}
          <Route path="/add-details" element={<AddFarmerDetailsPage />} />
          <Route path="/add-buyer-details" element={<AddBuyerDetailsPage />} /> {/* Add Buyer Details */}
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        </Routes>
      </div>
    </Router>
  );
}

// Home component to show Login and Signup buttons
function Home() {
  const location = useLocation();

  return (
    <div className="home-page">
      <header className="hero-section">
        <h1>Welcome to AgroBidding</h1>
        <p>Your gateway to a transparent and efficient agricultural marketplace.</p>
        {/* <img 
          src={heroAgriculture}
          alt="Agriculture field" 
          className="hero-image" 
        /> */}
      </header>

      {location.pathname === '/' && (
        <div className="auth-section">
          <h2>Join Our Community</h2>
          <div className="auth-buttons">
            <Link to="/login">
              <button className="auth-btn">Login</button>
            </Link>
            <Link to="/signup">
              <button className="auth-btn">Signup</button>
            </Link>
          </div>
        </div>
      )}

      <section className="features-section">
        <h2>Why Choose AgroBidding?</h2>
        <div className="features">
          <div className="feature">
            <img src="/images/direct-connection.jpg" alt="Direct connection" />
            <h3>Direct Connections</h3>
            <p>Connect directly with farmers and retailers without middlemen.</p>
          </div>
          <div className="feature">
            <img src="/images/transparency.jpg" alt="Transparency" />
            <h3>Transparency</h3>
            <p>Fair pricing and transparent bidding processes for all users.</p>
          </div>
          <div className="feature">
            <img src="/images/market-access.jpg" alt="Market access" />
            <h3>Expanded Market Reach</h3>
            <p>Access a wider audience, breaking the barriers of local markets.</p>
          </div>
        </div>
      </section>

      <section className="how-it-works">
        <h2>How It Works</h2>
        <div className="steps">
          <div className="step">
            <img src="/images/signup.jpg" alt="Signup" />
            <h3>Sign Up</h3>
            <p>Create an account to get started on the platform.</p>
          </div>
          <div className="step">
            <img src="/images/bidding.jpg" alt="Bidding" />
            <h3>Place Bids</h3>
            <p>Farmers set prices; retailers bid and secure deals.</p>
          </div>
          <div className="step">
            <img src="/images/secure-payment.jpg" alt="Secure payment" />
            <h3>Secure Payments</h3>
            <p>Transactions made safe and easy with secure payment options.</p>
          </div>
        </div>
      </section>

      <footer className="footer">
        <p>© 2024 AgroBidding. Empowering farmers and retailers with technology.</p>
      </footer>
    </div>
  );
}

export default App;
