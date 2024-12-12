import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';  // Make sure axios is imported
import './LoginPage.css'; // Import the CSS file

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Handle login
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Both fields are required.');
      return;
    }
  
    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', {
        email: email,
        password: password,
      });
  
      if (response.status === 200) {
        alert('Login successful');
        console.log(response.data.role); 
        // Store the token in localStorage
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('role', response.data.role);
        localStorage.setItem('farmerName', response.data.farmerName);
  
        // Redirect based on the role
        if (response.data.role === 'farmer') {
          navigate('/farmer-dashboard');
        } else if (response.data.role === 'buyer') {
          navigate('/buyer-dashboard');
        }
      }
    } catch (error) {
      if (error.response) {
        alert(error.response.data.message);  // Show error message from backend
      } else {
        alert('Login failed');
      }
    }
  };

  // Handle forgot password
  const handleForgotPassword = () => {
    // Navigate to forgot password page
    navigate('/forgot-password');
  };

  return (
    <div className="login-page">
      <form className="login-form" onSubmit={handleLogin}>
        <h2>Login</h2>
        {error && <div className="error-message">{error}</div>}
        <div>
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button type="submit">Login</button>

        {/* Forgot Password Link */}
        <div className="forgot-password">
          <button type="button" onClick={handleForgotPassword}>Forgot Password?</button>
        </div>
      </form>
    </div>
  );
}

export default LoginPage;
