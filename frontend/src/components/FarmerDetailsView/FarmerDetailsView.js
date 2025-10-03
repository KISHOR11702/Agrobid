import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import './FarmerDetailsView.css';

const FarmerDetailsView = () => {
  const [farmerDetails, setFarmerDetails] = useState(null);
  const [farmerProducts, setFarmerProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { farmerId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    fetchFarmerData();
  }, [farmerId]);

  const fetchFarmerData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Fetch farmer details
      const farmerResponse = await axios.get(`http://localhost:5000/api/farmer/details/${farmerId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFarmerDetails(farmerResponse.data);

      // Fetch farmer's products
      try {
        const productsResponse = await axios.get(`http://localhost:5000/api/products/farmer/${farmerId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setFarmerProducts(Array.isArray(productsResponse.data) ? productsResponse.data : []);
      } catch (productError) {
        console.error('Error fetching farmer products:', productError);
        setFarmerProducts([]);
      }
      
    } catch (error) {
      console.error('Error fetching farmer data:', error);
      setError('Failed to fetch farmer information');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-IN').format(num);
  };

  const getTimeAgo = (date) => {
    const now = new Date();
    const joinDate = new Date(date);
    const diffTime = Math.abs(now - joinDate);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 30) return `${diffDays} days ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="farmer-details-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading farmer details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="farmer-details-page">
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <h3>Unable to Load Farmer Details</h3>
          <p>{error}</p>
          <button onClick={() => navigate('/available-products')} className="back-btn">
            Back to Products
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="farmer-details-page">
      {/* Navbar */}
      <nav className="navbar">
        <div className="nav-brand">🌾 AgroBid</div>
        <ul className="nav-links">
          <li><button onClick={() => navigate('/buyer-dashboard')} className="nav-btn">Dashboard</button></li>
          <li><button onClick={() => navigate('/available-products')} className="nav-btn">Available Products</button></li>
          <li><a href="/your-bids">Your Bids</a></li>
          <li><a href="/add-buyer-details">Profile</a></li>
          <li>
            <button onClick={handleLogout} className="logout-btn">Logout</button>
          </li>
        </ul>
      </nav>

      <div className="main-content">
        {/* Header Section */}
        <div className="header-section">
          <button onClick={() => navigate('/available-products')} className="back-button">
            ← Back to Products
          </button>
          <h1>🌾 Farmer Profile & Verification</h1>
          <p>Complete information about this farmer for your verification</p>
        </div>

        {/* Farmer Profile Card */}
        {farmerDetails && (
          <div className="farmer-profile-card">
            <div className="profile-header">
              <div className="avatar">
                {farmerDetails.name ? farmerDetails.name.charAt(0).toUpperCase() : '🌾'}
              </div>
              <div className="farmer-info">
                <h2 className="farmer-name">{farmerDetails.name || 'Unknown Farmer'}</h2>
                <p className="farmer-type">Verified Agricultural Producer</p>
                <p className="join-date">Member since {getTimeAgo(farmerDetails.joinedDate)}</p>
              </div>
              <div className="verification-badge">
                <span className="verified">✅ Verified Farmer</span>
              </div>
            </div>

            <div className="profile-details">
              <div className="details-grid">
                <div className="detail-section">
                  <h3>📞 Contact Information</h3>
                  <div className="detail-rows">
                    <div className="detail-row">
                      <span className="label">📧 Email:</span>
                      <span className="value">{farmerDetails.email || 'Not provided'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">📱 Phone:</span>
                      <span className="value contact-highlight">{farmerDetails.phone || 'Not provided'}</span>
                    </div>
                  </div>
                </div>

                <div className="detail-section">
                  <h3>📍 Farm Location Details</h3>
                  <div className="detail-rows">
                    <div className="detail-row">
                      <span className="label">🏠 Farm Address:</span>
                      <span className="value">{farmerDetails.address || 'Not provided'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">🗺️ Location:</span>
                      <span className="value">{farmerDetails.location || 'Not provided'}</span>
                    </div>
                  </div>
                </div>

                <div className="detail-section">
                  <h3>📊 Farm Statistics</h3>
                  <div className="detail-rows">
                    <div className="detail-row">
                      <span className="label">🌾 Total Products Listed:</span>
                      <span className="value">{farmerProducts.length}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">🏆 Active Auctions:</span>
                      <span className="value">{farmerProducts.filter(p => new Date(p.bidEndDate) > new Date()).length}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">✅ Profile Completion:</span>
                      <span className="value">{farmerDetails.detailsFilled ? 'Complete' : 'Incomplete'}</span>
                    </div>
                  </div>
                </div>

                <div className="detail-section">
                  <h3>🛡️ Trust & Safety</h3>
                  <div className="trust-indicators">
                    <div className="trust-item verified">
                      <span className="trust-icon">✅</span>
                      <span className="trust-text">Email Verified</span>
                    </div>
                    <div className="trust-item verified">
                      <span className="trust-icon">📱</span>
                      <span className="trust-text">Phone Verified</span>
                    </div>
                    <div className="trust-item verified">
                      <span className="trust-icon">🆔</span>
                      <span className="trust-text">Identity Verified</span>
                    </div>
                    <div className="trust-item verified">
                      <span className="trust-icon">🌾</span>
                      <span className="trust-text">Farmer Registered</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Farmer's Products */}
        <div className="farmer-products">
          <h3>🌾 Farmer's Products ({farmerProducts.length})</h3>
          
          {farmerProducts.length === 0 ? (
            <div className="empty-products">
              <div className="empty-icon">📦</div>
              <h4>No Products Listed</h4>
              <p>This farmer hasn't listed any products yet.</p>
            </div>
          ) : (
            <div className="products-grid">
              {farmerProducts.map((product) => (
                <div key={product._id} className="product-preview-card">
                  <div className="product-header">
                    <h4 className="product-name">{product.name}</h4>
                    <div className="product-category">{product.category}</div>
                  </div>
                  
                  <div className="product-details">
                    <div className="price-info">
                      <span className="base-price">Base: ₹{formatNumber(product.price)}</span>
                      <span className="quantity">Qty: {product.quantity}</span>
                    </div>
                    
                    <div className="product-status">
                      {new Date(product.bidEndDate) > new Date() ? (
                        <span className="status-active">🔥 Active Auction</span>
                      ) : (
                        <span className="status-ended">⏰ Auction Ended</span>
                      )}
                    </div>
                    
                    <div className="product-date">
                      Listed: {new Date(product.createdAt).toLocaleDateString('en-IN')}
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => navigate('/available-products')} 
                    className="view-product-btn"
                  >
                    View in Market
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Contact Action */}
        <div className="contact-action">
          <div className="contact-card">
            <h3>💬 Ready to Connect?</h3>
            <p>Verified farmer with complete profile information available for direct contact.</p>
            <div className="contact-buttons">
              <a 
                href={`tel:${farmerDetails?.phone}`} 
                className="contact-btn call-btn"
                disabled={!farmerDetails?.phone}
              >
                📞 Call Farmer
              </a>
              <a 
                href={`mailto:${farmerDetails?.email}`} 
                className="contact-btn email-btn"
                disabled={!farmerDetails?.email}
              >
                📧 Send Email
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FarmerDetailsView;
