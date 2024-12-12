import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './AddBuyerDetailsPage.css'; // Optional CSS file for styling

function AddBuyerDetailsPage() {
  const [details, setDetails] = useState({ location: '', phone: '', address: '' });
  const navigate = useNavigate();

  // Handle input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setDetails({ ...details, [name]: value });
  };

  // Submit buyer details to the backend
  const handleSubmit = () => {
    const token = localStorage.getItem('token'); // Get token from local storage

    if (!details.location || !details.phone || !details.address) {
      alert('Please fill in all fields.');
      return;
    }

    axios
      .post('http://localhost:5000/api/buyer/update-details', details, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      .then((response) => {
        alert(response.data.message || 'Details saved successfully!');
        navigate('/available-products'); // Redirect to the available products page
      })
      .catch((error) => {
        console.error('Error saving details:', error);
        alert(error.response?.data?.message || 'Failed to save details.');
      });
  };

  return (
    <div className="add-buyer-details-page">
      <h2>Add Your Details</h2>
      <div className="form-group">
        <input
          type="text"
          name="location"
          placeholder="Location"
          value={details.location}
          onChange={handleInputChange}
        />
        <input
          type="text"
          name="phone"
          placeholder="Phone Number"
          value={details.phone}
          onChange={handleInputChange}
        />
        <textarea
          name="address"
          placeholder="Address"
          value={details.address}
          onChange={handleInputChange}
        ></textarea>
      </div>
      <button onClick={handleSubmit}>Save Details</button>
    </div>
  );
}

export default AddBuyerDetailsPage;
