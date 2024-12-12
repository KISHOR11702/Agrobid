import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './BuyerDashboard.css'; // Import the CSS file

function BuyerDashboard() {
  const [buyerName, setBuyerName] = useState('');
  const navigate = useNavigate(); // Initialize navigate for navigation

  useEffect(() => {
    const token = localStorage.getItem('token'); // Retrieve token from local storage
  
    if (!token) {
      console.error('No token found');
      navigate('/login'); // Redirect to login if not authenticated
      return;
    }
  
    // Fetch buyer name
    axios
      .get('http://localhost:5000/api/buyer/getName', {
        headers: {
          Authorization: `Bearer ${token}`, // Send token in headers
        },
      })
      .then((response) => {
        setBuyerName(response.data.buyerName); // Set buyer name from the response
        console.log("Buyer Name:", response.data.buyerName);
      })
      .catch((error) => {
        console.error('Error fetching buyer data:', error.response?.data?.message || error.message);
        if (error.response?.status === 403 || error.response?.status === 401) {
          navigate('/login'); // Redirect to login on authorization errors
        }
      });
  }, [navigate]);
  
  const handleLogout = () => {
    localStorage.removeItem('token'); // Clear token on logout
    alert('You have been logged out.');
    navigate('/login');
  };

  return (
    <div className="buyer-dashboard">
      {/* Navbar Section */}
      <nav className="navbar">
        <ul>
          <li><a href="/available-products">Available Products</a></li>
          <li><a href="/your-bids">Your Bids</a></li>
          <li><a href="/add-buyer-details">Add Details</a></li>
          <li>
            <button onClick={handleLogout} className="logout-btn">Logout</button>
          </li>
        </ul>
      </nav>

      {/* Buyer Dashboard Content */}
      <h1>Welcome, {buyerName}</h1>
    </div>
  );
}

export default BuyerDashboard;
