import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import './ViewProductBids.css';

const ViewProductBids = () => {
  const [product, setProduct] = useState(null);
  const [bids, setBids] = useState([]);
  const [buyerDetails, setBuyerDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { productId } = useParams();
  const navigate = useNavigate();

  const fetchProductAndBids = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      // Fetch product details
      const productResponse = await axios.get(`http://localhost:5000/api/products/${productId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProduct(productResponse.data);

      // Fetch all bids for this product
      const bidsResponse = await axios.get(`http://localhost:5000/api/bids/product/${productId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const bidsData = bidsResponse.data;
      setBids(bidsData);

      // Fetch buyer details for each unique buyer
      const uniqueBuyerIds = [...new Set(bidsData.map(bid => bid.buyerId))];
      const buyerDetailsPromises = uniqueBuyerIds.map(async (buyerId) => {
        try {
          const response = await axios.get(`http://localhost:5000/api/buyer/details/${buyerId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          return { buyerId, details: response.data };
        } catch (error) {
          return { buyerId, details: null };
        }
      });

      const buyerDetailsData = await Promise.all(buyerDetailsPromises);
      const buyerDetailsMap = {};
      buyerDetailsData.forEach(({ buyerId, details }) => {
        buyerDetailsMap[buyerId] = details;
      });
      setBuyerDetails(buyerDetailsMap);

    } catch (error) {
      setError(error.response?.data?.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchProductAndBids();
  }, [fetchProductAndBids]);

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-IN').format(num);
  };

  const getTimeAgo = (timestamp) => {
    const now = new Date();
    const bidTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now - bidTime) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="view-bids-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading product bids...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="view-bids-page">
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <h3>Unable to Load Bids</h3>
          <p>{error}</p>
          <button onClick={() => navigate('/available-products')} className="back-btn">
            Back to Products
          </button>
        </div>
      </div>
    );
  }

  const sortedBids = bids.sort((a, b) => b.amount - a.amount);
  const highestBid = sortedBids[0];

  return (
    <div className="view-bids-page">
      {/* Navbar */}
      <nav className="navbar">
        <div className="nav-brand">🌾 AgroBid</div>
        <ul className="nav-links">
          <li><button onClick={() => navigate('/available-products')} className="nav-btn">Available Products</button></li>
          <li><button onClick={() => navigate('/your-bids')} className="nav-btn">Your Bids</button></li>
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
          <h1>🎯 Bidding Details</h1>
          <p>View all bids and buyer information for this product</p>
        </div>

        {/* Product Summary */}
        {product && (
          <div className="product-summary">
            <div className="product-info">
              <h2>{product.name}</h2>
              <div className="product-meta">
                <span className="meta-item">
                  <strong>Starting Price:</strong> ₹{formatNumber(product.price)}
                </span>
                <span className="meta-item">
                  <strong>Quantity:</strong> {product.quantity} {product.unit}
                </span>
                <span className="meta-item">
                  <strong>Category:</strong> {product.category}
                </span>
              </div>
            </div>
            
            <div className="bid-summary">
              <div className="summary-stat">
                <div className="stat-value">₹{highestBid ? formatNumber(highestBid.amount) : '0'}</div>
                <div className="stat-label">Highest Bid</div>
              </div>
              <div className="summary-stat">
                <div className="stat-value">{bids.length}</div>
                <div className="stat-label">Total Bids</div>
              </div>
              <div className="summary-stat">
                <div className="stat-value">{new Set(bids.map(b => b.buyerId)).size}</div>
                <div className="stat-label">Unique Bidders</div>
              </div>
            </div>
          </div>
        )}

        {/* Bids List */}
        <div className="bids-section">
          <h3>📋 All Bids ({bids.length})</h3>
          
          {bids.length === 0 ? (
            <div className="empty-bids">
              <div className="empty-icon">🎯</div>
              <h4>No Bids Yet</h4>
              <p>This product hasn't received any bids yet.</p>
            </div>
          ) : (
            <div className="bids-grid">
              {sortedBids.map((bid, index) => {
                const buyerInfo = buyerDetails[bid.buyerId];
                const isWinning = index === 0;
                
                return (
                  <div key={bid._id} className={`bid-card ${isWinning ? 'winning-bid' : ''}`}>
                    {isWinning && <div className="winning-badge">🏆 Highest Bid</div>}
                    
                    <div className="bid-header">
                      <div className="bid-amount">
                        <span className="amount">₹{formatNumber(bid.amount)}</span>
                        <span className="rank">#{index + 1}</span>
                      </div>
                      <div className="bid-time">
                        {getTimeAgo(bid.createdAt || bid.timestamp)}
                      </div>
                    </div>

                    <div className="buyer-info">
                      <div className="buyer-avatar">
                        {bid.buyerName ? bid.buyerName.charAt(0).toUpperCase() : '?'}
                      </div>
                      <div className="buyer-details">
                        <h4 className="buyer-name">
                          {bid.buyerName || 'Anonymous Buyer'}
                        </h4>
                        
                        {buyerInfo && (
                          <div className="buyer-meta">
                            {/* Contact Information - Highlighted */}
                            <div className="contact-section">
                              <h5 className="contact-section-title">📞 Contact Information</h5>
                              <div className="meta-row contact-row primary-contact">
                                <span className="label">� Primary Phone:</span>
                                <span className="value contact-number">
                                  {buyerInfo.phoneNumber || 'Not provided'}
                                  {buyerInfo.phoneNumber && (
                                    <a href={`tel:${buyerInfo.phoneNumber}`} className="call-btn-small">
                                      📞 Call Now
                                    </a>
                                  )}
                                </span>
                              </div>
                              {buyerInfo.alternativePhoneNumber && (
                                <div className="meta-row contact-row">
                                  <span className="label">📞 Alt Phone:</span>
                                  <span className="value contact-number">
                                    {buyerInfo.alternativePhoneNumber}
                                    <a href={`tel:${buyerInfo.alternativePhoneNumber}`} className="call-btn-small">
                                      � Call
                                    </a>
                                  </span>
                                </div>
                              )}
                              <div className="meta-row contact-row">
                                <span className="label">📧 Email:</span>
                                <span className="value contact-email">
                                  {buyerInfo.email || 'Not provided'}
                                  {buyerInfo.email && (
                                    <a href={`mailto:${buyerInfo.email}`} className="email-btn-small">
                                      ✉️ Send Email
                                    </a>
                                  )}
                                </span>
                              </div>
                            </div>

                            {/* Address Information */}
                            <div className="address-section">
                              <h5 className="address-section-title">📍 Address Details</h5>
                              {buyerInfo.address && (
                                <div className="meta-row address-row">
                                  <span className="label">🏠 Address:</span>
                                  <span className="value address-text">{buyerInfo.address}</span>
                                </div>
                              )}
                              <div className="meta-row address-row">
                                <span className="label">🏙️ City:</span>
                                <span className="value">{buyerInfo.city || 'Not provided'}</span>
                              </div>
                              <div className="meta-row address-row">
                                <span className="label">🗺️ State:</span>
                                <span className="value">{buyerInfo.state || 'Not provided'}</span>
                              </div>
                              {buyerInfo.pinCode && (
                                <div className="meta-row address-row">
                                  <span className="label">📮 PIN Code:</span>
                                  <span className="value">{buyerInfo.pinCode}</span>
                                </div>
                              )}
                            </div>

                            {/* Business Information */}
                            <div className="business-section">
                              <h5 className="business-section-title">🏢 Business Details</h5>
                              {buyerInfo.companyName && (
                                <div className="meta-row business-row">
                                  <span className="label">🏢 Company:</span>
                                  <span className="value company-name">{buyerInfo.companyName}</span>
                                </div>
                              )}
                              {buyerInfo.businessType && (
                                <div className="meta-row business-row">
                                  <span className="label">💼 Business Type:</span>
                                  <span className="value">{buyerInfo.businessType}</span>
                                </div>
                              )}
                              {buyerInfo.gstNumber && (
                                <div className="meta-row business-row">
                                  <span className="label">📋 GST Number:</span>
                                  <span className="value">{buyerInfo.gstNumber}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {!buyerInfo && (
                          <div className="no-details">
                            <span>ℹ️ Buyer details not available</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bid-status">
                      <span className={`status-indicator ${bid.status || 'active'}`}>
                        {bid.status === 'won' ? '🎉 Won' : 
                         bid.status === 'lost' ? '😔 Lost' : 
                         '🔥 Active'}
                      </span>
                      {bid.isWinningBid && <span className="winner-tag">Winner</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bidding Timeline */}
        {bids.length > 0 && (
          <div className="timeline-section">
            <h3>📈 Bidding Timeline</h3>
            <div className="timeline">
              {bids
                .sort((a, b) => new Date(a.createdAt || a.timestamp) - new Date(b.createdAt || b.timestamp))
                .map((bid, index) => (
                  <div key={bid._id} className="timeline-item">
                    <div className="timeline-marker"></div>
                    <div className="timeline-content">
                      <div className="timeline-header">
                        <span className="timeline-amount">₹{formatNumber(bid.amount)}</span>
                        <span className="timeline-time">
                          {new Date(bid.createdAt || bid.timestamp).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="timeline-buyer">
                        by {bid.buyerName || 'Anonymous Buyer'}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewProductBids;
