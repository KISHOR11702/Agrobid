import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './AddBuyerDetailsPage.css'; // Optional CSS file for styling

function AddBuyerDetailsPage() {
  const [details, setDetails] = useState({ 
    phoneNumber: '', 
    alternativePhoneNumber: '',
    address: '', 
    city: '',
    state: '',
    pinCode: '',
    companyName: '',
    businessType: '',
    gstNumber: '',
    interestedCategories: [],
    minBudget: '',
    maxBudget: '',
    purchaseFrequency: '',
    // Legacy fields for backward compatibility
    location: '', 
    phone: ''
  });
  const navigate = useNavigate();

  // Handle input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setDetails({ ...details, [name]: value });
  };

  // Handle checkbox change for categories
  const handleCategoryChange = (e) => {
    const { value, checked } = e.target;
    if (checked) {
      setDetails({ ...details, interestedCategories: [...details.interestedCategories, value] });
    } else {
      setDetails({ ...details, interestedCategories: details.interestedCategories.filter(cat => cat !== value) });
    }
  };

  // Submit buyer details to the backend
  const handleSubmit = () => {
    const token = localStorage.getItem('token'); // Get token from local storage

    if (!details.phoneNumber || !details.address || !details.city || !details.state) {
      alert('Please fill in all required fields (Phone Number, Address, City, State).');
      return;
    }

    // Set legacy fields for backward compatibility
    const submitDetails = {
      ...details,
      location: `${details.city}, ${details.state}`, // Combine city and state for location
      phone: details.phoneNumber // Use phoneNumber as phone
    };

    axios
      .post('http://localhost:5000/api/buyer/update-details', submitDetails, {
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
      <h2>Complete Your Buyer Profile</h2>
      
      {/* Contact Information */}
      <div className="form-section">
        <h3>📞 Contact Information</h3>
        <div className="form-group">
          <input
            type="tel"
            name="phoneNumber"
            placeholder="Primary Phone Number *"
            value={details.phoneNumber}
            onChange={handleInputChange}
            required
          />
          <input
            type="tel"
            name="alternativePhoneNumber"
            placeholder="Alternative Phone Number (Optional)"
            value={details.alternativePhoneNumber}
            onChange={handleInputChange}
          />
        </div>
      </div>

      {/* Address Information */}
      <div className="form-section">
        <h3>📍 Address Details</h3>
        <div className="form-group">
          <textarea
            name="address"
            placeholder="Complete Address *"
            value={details.address}
            onChange={handleInputChange}
            required
          />
          <input
            type="text"
            name="city"
            placeholder="City *"
            value={details.city}
            onChange={handleInputChange}
            required
          />
          <input
            type="text"
            name="state"
            placeholder="State *"
            value={details.state}
            onChange={handleInputChange}
            required
          />
          <input
            type="text"
            name="pinCode"
            placeholder="PIN Code"
            value={details.pinCode}
            onChange={handleInputChange}
          />
        </div>
      </div>

      {/* Business Information */}
      <div className="form-section">
        <h3>🏢 Business Information (Optional)</h3>
        <div className="form-group">
          <input
            type="text"
            name="companyName"
            placeholder="Company Name"
            value={details.companyName}
            onChange={handleInputChange}
          />
          <select
            name="businessType"
            value={details.businessType}
            onChange={handleInputChange}
          >
            <option value="">Select Business Type</option>
            <option value="Individual">Individual Buyer</option>
            <option value="Retailer">Retailer</option>
            <option value="Wholesaler">Wholesaler</option>
            <option value="Distributor">Distributor</option>
            <option value="Restaurant">Restaurant/Hotel</option>
            <option value="Processing Unit">Processing Unit</option>
            <option value="Export Business">Export Business</option>
          </select>
          <input
            type="text"
            name="gstNumber"
            placeholder="GST Number (if applicable)"
            value={details.gstNumber}
            onChange={handleInputChange}
          />
        </div>
      </div>

      {/* Purchase Preferences */}
      <div className="form-section">
        <h3>💰 Purchase Preferences (Optional)</h3>
        <div className="form-group">
          <div className="categories-section">
            <label>Interested Categories:</label>
            <div className="checkbox-group">
              {['Grains', 'Vegetables', 'Fruits', 'Spices', 'Pulses', 'Dairy', 'Organic'].map(category => (
                <label key={category} className="checkbox-label">
                  <input
                    type="checkbox"
                    value={category}
                    checked={details.interestedCategories.includes(category)}
                    onChange={handleCategoryChange}
                  />
                  {category}
                </label>
              ))}
            </div>
          </div>
          
          <div className="budget-section">
            <input
              type="number"
              name="minBudget"
              placeholder="Minimum Budget (₹)"
              value={details.minBudget}
              onChange={handleInputChange}
            />
            <input
              type="number"
              name="maxBudget"
              placeholder="Maximum Budget (₹)"
              value={details.maxBudget}
              onChange={handleInputChange}
            />
          </div>
          
          <select
            name="purchaseFrequency"
            value={details.purchaseFrequency}
            onChange={handleInputChange}
          >
            <option value="">Purchase Frequency</option>
            <option value="Daily">Daily</option>
            <option value="Weekly">Weekly</option>
            <option value="Monthly">Monthly</option>
            <option value="Seasonal">Seasonal</option>
            <option value="As Needed">As Needed</option>
          </select>
        </div>
      </div>

      <div className="submit-section">
        <p className="note">* Required fields. Complete information helps farmers contact you easily.</p>
        <button onClick={handleSubmit} className="submit-btn">Save Complete Profile</button>
      </div>
    </div>
  );
}

export default AddBuyerDetailsPage;
