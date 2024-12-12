import React from 'react';
import './AuthPage.css'; // Importing the CSS file for styling

function AuthPage() {
  return (
    <div className="auth-page">
      <h2>Welcome to AgroBidding</h2>
      <div className="auth-buttons">
        <button className="auth-btn">Login</button>
        <button className="auth-btn">Signup</button>
      </div>
    </div>
  );
}

export default AuthPage;
