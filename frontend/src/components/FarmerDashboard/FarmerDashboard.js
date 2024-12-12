import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './FarmerDashboard.css';

function FarmerDashboard() {
  const [farmerName, setFarmerName] = useState('');
  const [farmerDetails, setFarmerDetails] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token'); // Retrieve token from local storage

    if (!token) {
      console.error('No token found');
      navigate('/login'); // Redirect to login if not authenticated
      return;
    }

    // Fetch farmer name (already done)
    axios
      .get('http://localhost:5000/api/farmer/details', {
        headers: {
          Authorization: `Bearer ${token}`, // Send token in headers
        },
      })
      .then((response) => {
        setFarmerName(response.data.farmerName);
        console.log("Farmer Name:", response.data.farmerName);
      })
      .catch((error) => {
        console.error('Error fetching farmer data:', error.response?.data?.message || error.message);
        if (error.response?.status === 403 || error.response?.status === 401) {
          navigate('/login'); // Redirect to login on authorization errors
        }
      });

    // Fetch farmer additional details (location, phone, address)
    axios
      .get('http://localhost:5000/api/farmer/details', { 
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(response => {
        setFarmerDetails(response.data);
        console.log("Farmer Details:", response.data);
      })
      .catch(error => {
        console.error('Error fetching farmer details:', error);
      });
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token'); // Clear token on logout
    alert('You have been logged out.');
    navigate('/login');
  };

  return (
    <div className="farmer-dashboard">
      <nav className="navbar">
        <ul>
          <li><a href="/add-product">Add Products</a></li>
          <li><a href="/view-products">View Products</a></li>
          <li><a href="/add-details">Add Details</a></li> {/* Link to Add Details Page */}
          <li><button onClick={handleLogout} className="logout-btn">Logout</button></li>
        </ul>
      </nav>

      <h1>Welcome, {farmerName}</h1>

      {/* Display Farmer Details */}
      {/* <div className="farmer-details">
        <h3>Farmer Details:</h3>
        <p><strong>Location:</strong> {farmerDetails.location || 'Not provided'}</p>
        <p><strong>Phone:</strong> {farmerDetails.phone || 'Not provided'}</p>
        <p><strong>Address:</strong> {farmerDetails.address || 'Not provided'}</p>
      </div> */}
    </div>
  );
}

export default FarmerDashboard;
