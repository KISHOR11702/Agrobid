import React, { useState } from 'react';
import axios from 'axios';
import './ForgotPasswordPage.css'; // Optional: Add your styling

function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Handle forgot password
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email.');
      return;
    }

    try {
      const response = await axios.post('http://localhost:5000/api/auth/forgot-password', { email });

      if (response.status === 200) {
        setMessage('A password reset link has been sent to your email.');
      }
    } catch (error) {
      if (error.response) {
        setError(error.response.data.message);  // Show error message from backend
      } else {
        setError('Something went wrong. Please try again.');
      }
    }
  };

  return (
    <div className="forgot-password-page">
      <form className="forgot-password-form" onSubmit={handleForgotPassword}>
        <h2>Forgot Password</h2>
        {message && <div className="success-message">{message}</div>}
        {error && <div className="error-message">{error}</div>}
        <div>
          <label htmlFor="email">Enter your email</label>
          <input
            type="email"
            id="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <button type="submit">Submit</button>
      </form>
    </div>
  );
}

export default ForgotPasswordPage;
