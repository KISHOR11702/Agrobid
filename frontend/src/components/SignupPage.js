import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import axios from 'axios';
import './SignupPage.css'; // Importing the styling

function SignupPage() {
  const navigate = useNavigate(); // Initialize useNavigate
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    email: '',
    password: '',
    role: 'farmer', // Default role is 'farmer'
  });

  const [errors, setErrors] = useState({}); // To store validation errors

  // Handle input changes
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // Validate the form inputs
  const validateForm = () => {
    let formErrors = {};
    const { name, age, email, password, role } = formData;

    if (!name) formErrors.name = 'Name is required';
    if (!age || isNaN(age) || age <= 0) formErrors.age = 'Valid age is required';
    if (!email || !/\S+@\S+\.\S+/.test(email)) formErrors.email = 'Email is invalid';
    if (!password || password.length < 8) formErrors.password = 'Password must be at least 8 characters long';
    if (role !== 'farmer' && role !== 'buyer') formErrors.role = 'Role is required';

    setErrors(formErrors);
    return Object.keys(formErrors).length === 0; // Return true if no errors
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validateForm()) {
      try {
        // Send data to backend
        const response = await axios.post('http://localhost:5000/api/auth/signup', formData);
        alert(response.data.message);

        // Navigate to login page after successful signup
        navigate('/login');
      } catch (error) {
        console.error('Error during signup:', error);
        alert('Signup failed. Please try again.');
      }
    }
  };

  return (
    <div className="signup-page">
      <h2>Signup</h2>
      <form onSubmit={handleSubmit} className="signup-form">
        <div className="form-group">
          <label>Name:</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="form-control"
          />
          {errors.name && <p className="error">{errors.name}</p>}
        </div>

        <div className="form-group">
          <label>Age:</label>
          <input
            type="number"
            name="age"
            value={formData.age}
            onChange={handleChange}
            className="form-control"
          />
          {errors.age && <p className="error">{errors.age}</p>}
        </div>

        <div className="form-group">
          <label>Email:</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="form-control"
          />
          {errors.email && <p className="error">{errors.email}</p>}
        </div>

        <div className="form-group">
          <label>Password:</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className="form-control"
          />
          {errors.password && <p className="error">{errors.password}</p>}
        </div>

        <div className="form-group">
          <label>Role:</label>
          <select name="role" value={formData.role} onChange={handleChange} className="form-control">
            <option value="farmer">Farmer</option>
            <option value="buyer">Buyer</option>
          </select>
          {errors.role && <p className="error">{errors.role}</p>}
        </div>

        <button type="submit" className="submit-btn">Signup</button>
      </form>
    </div>
  );
}

export default SignupPage;
