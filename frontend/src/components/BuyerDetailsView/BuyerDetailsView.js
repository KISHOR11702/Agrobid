import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import './BuyerDetailsView.css';

const BuyerDetailsView = () => {
  const [buyerDetails, setBuyerDetails] = useState(null);
  const [buyerBids, setBuyerBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { buyerId } = useParams();
  const navigate = useNavigate();

  // Ensure buyerBids is always an array
  const safeBuyerBids = Array.isArray(buyerBids) ? buyerBids : [];

  const fetchBuyerBids = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:5000/api/bids/buyer/${buyerId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Handle different response structures
      const responseData = response.data;
      console.log('Buyer bids response:', responseData); // Debug log
      let bidsData = [];
      
      if (Array.isArray(responseData)) {
        bidsData = responseData;
      } else if (responseData && Array.isArray(responseData.bids)) {
        bidsData = responseData.bids;
        // Also set buyer details if available in the response
        setBuyerDetails(prevDetails => ({ ...prevDetails, ...responseData }));
      } else if (responseData && responseData.bids) {
        bidsData = Array.isArray(responseData.bids) ? responseData.bids : [responseData.bids];
      } else {
        // If no bids structure found, set empty array
        console.warn('Unexpected response structure:', responseData);
        bidsData = [];
      }
      
      console.log('Processed bids data:', bidsData); // Debug log
      setBuyerBids(bidsData);
    } catch (error) {
      console.error('Error fetching buyer bids:', error);
      setBuyerBids([]);
    } finally {
      setLoading(false);
    }
  }, [buyerId]);

  const fetchBuyerData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // First try to get buyer details
      try {
        const detailsResponse = await axios.get(`http://localhost:5000/api/buyer/details/${buyerId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setBuyerDetails(detailsResponse.data);
      } catch (detailsError) {
        console.error('Error fetching buyer details:', detailsError);
        setError('Failed to fetch buyer details');
      }
      
      // Then fetch bids (which might also include buyer details)
      fetchBuyerBids();
      
    } catch (error) {
      console.error('Error fetching buyer data:', error);
      setError('Failed to fetch buyer information');
      setLoading(false);
    }
  }, [buyerId, fetchBuyerBids]);

  useEffect(() => {
    fetchBuyerData();
  }, [fetchBuyerData]);

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-IN').format(num);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  if (loading && !buyerDetails) {
    return (
      <div className="buyer-details-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading buyer details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="buyer-details-page">
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <h3>Unable to Load Buyer Details</h3>
          <p>{error}</p>
          <button onClick={() => navigate('/view-products')} className="back-btn">
            Back to Products
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="buyer-details-page">
      {/* Navbar */}
      <nav className="navbar">
        <div className="nav-brand">🌾 AgroBid</div>
        <ul className="nav-links">
          <li><button onClick={() => navigate('/farmer-dashboard')} className="nav-btn">Dashboard</button></li>
          <li><button onClick={() => navigate('/view-products')} className="nav-btn">My Products</button></li>
          <li><a href="/add-product">Add Product</a></li>
          <li><a href="/add-details">Profile</a></li>
          <li>
            <button onClick={handleLogout} className="logout-btn">Logout</button>
          </li>
        </ul>
      </nav>

      <div className="main-content">
        {/* Header Section */}
        <div className="header-section">
          <button onClick={() => navigate('/view-products')} className="back-button">
            ← Back to Products
          </button>
          <h1>👤 Buyer Profile Details</h1>
          <p>Complete information about this buyer</p>
        </div>

        {/* Buyer Profile Card */}
        {buyerDetails && (
          <div className="buyer-profile-card">
            <div className="profile-header">
              <div className="avatar">
                {buyerDetails.name ? buyerDetails.name.charAt(0).toUpperCase() : '?'}
              </div>
              <div className="buyer-info">
                <h2 className="buyer-name">{buyerDetails.name || 'Unknown Buyer'}</h2>
                <p className="buyer-type">Agricultural Product Buyer</p>
              </div>
              <div className="verification-badge">
                <span className="verified">✅ Verified</span>
              </div>
            </div>

            <div className="profile-details">
              <div className="details-grid">
                <div className="detail-section contact-section-main">
                  <h3>📞 Contact Information - Direct Communication</h3>
                  <div className="detail-rows">
                    <div className="detail-row contact-highlight-row">
                      <span className="label">📧 Email Address:</span>
                      <div className="contact-action-group">
                        <span className="value contact-email-main">{buyerDetails.email || 'Not provided'}</span>
                        {buyerDetails.email && (
                          <a href={`mailto:${buyerDetails.email}?subject=Regarding Your Bid on Agricultural Product`} className="contact-action-btn email-action">
                            ✉️ Send Email
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="detail-row contact-highlight-row">
                      <span className="label">📱 Primary Phone:</span>
                      <div className="contact-action-group">
                        <span className="value contact-phone-main">{buyerDetails.phoneNumber || 'Not provided'}</span>
                        {buyerDetails.phoneNumber && (
                          <a href={`tel:${buyerDetails.phoneNumber}`} className="contact-action-btn call-action">
                            📞 Call Now
                          </a>
                        )}
                      </div>
                    </div>
                    {buyerDetails.alternativePhoneNumber && (
                      <div className="detail-row contact-highlight-row">
                        <span className="label">� Alternative Phone:</span>
                        <div className="contact-action-group">
                          <span className="value contact-phone-alt">{buyerDetails.alternativePhoneNumber}</span>
                          <a href={`tel:${buyerDetails.alternativePhoneNumber}`} className="contact-action-btn call-action">
                            📞 Call Alt
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="contact-note">
                    <p><strong>💡 Farmer Note:</strong> Contact this buyer directly for negotiations, delivery arrangements, or any product-related queries.</p>
                  </div>
                </div>

                <div className="detail-section">
                  <h3>🏢 Business Information</h3>
                  <div className="detail-rows">
                    <div className="detail-row">
                      <span className="label">🏪 Company:</span>
                      <span className="value">{buyerDetails.companyName || 'Individual Buyer'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">💼 Business Type:</span>
                      <span className="value">{buyerDetails.businessType || 'Not specified'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">📋 GST Number:</span>
                      <span className="value">{buyerDetails.gstNumber || 'Not provided'}</span>
                    </div>
                  </div>
                </div>

                <div className="detail-section address-section-main">
                  <h3>📍 Complete Address Details - For Delivery & Logistics</h3>
                  <div className="detail-rows">
                    {buyerDetails.address && (
                      <div className="detail-row address-highlight-row">
                        <span className="label">🏠 Full Address:</span>
                        <span className="value address-text-main">{buyerDetails.address}</span>
                      </div>
                    )}
                    <div className="detail-row address-highlight-row">
                      <span className="label">🏙️ City:</span>
                      <span className="value location-text">{buyerDetails.city || 'Not provided'}</span>
                    </div>
                    <div className="detail-row address-highlight-row">
                      <span className="label">🗺️ State:</span>
                      <span className="value location-text">{buyerDetails.state || 'Not provided'}</span>
                    </div>
                    {buyerDetails.pinCode && (
                      <div className="detail-row address-highlight-row">
                        <span className="label">📮 PIN Code:</span>
                        <span className="value pincode-text">{buyerDetails.pinCode}</span>
                      </div>
                    )}
                    {(buyerDetails.city || buyerDetails.state) && (
                      <div className="detail-row map-row">
                        <span className="label">🗺️ Find Location:</span>
                        <a 
                          href={`https://www.google.com/maps/search/${encodeURIComponent(`${buyerDetails.address || ''} ${buyerDetails.city || ''} ${buyerDetails.state || ''} ${buyerDetails.pinCode || ''}`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="map-link-btn"
                        >
                          📍 View on Map
                        </a>
                      </div>
                    )}
                  </div>
                  <div className="address-note">
                    <p><strong>🚚 Delivery Info:</strong> Use this address for product delivery coordination and logistics planning.</p>
                  </div>
                </div>

                <div className="detail-section">
                  <h3>💰 Purchase Preferences</h3>
                  <div className="detail-rows">
                    <div className="detail-row">
                      <span className="label">🌾 Interested Categories:</span>
                      <span className="value">{buyerDetails.interestedCategories?.join(', ') || 'All categories'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">💵 Budget Range:</span>
                      <span className="value">
                        {buyerDetails.minBudget && buyerDetails.maxBudget 
                          ? `₹${formatNumber(buyerDetails.minBudget)} - ₹${formatNumber(buyerDetails.maxBudget)}`
                          : 'Not specified'}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="label">📦 Purchase Frequency:</span>
                      <span className="value">{buyerDetails.purchaseFrequency || 'Not specified'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bidding History */}
        <div className="bidding-history">
          <h3>🎯 Bidding History ({safeBuyerBids.length})</h3>
          
          {safeBuyerBids.length === 0 ? (
            <div className="empty-bids">
              <div className="empty-icon">📊</div>
              <h4>No Bidding History</h4>
              <p>This buyer hasn't placed any bids yet.</p>
            </div>
          ) : (
            <div className="bids-timeline">
              {safeBuyerBids.map((bid, index) => (
                <div key={bid._id} className={`timeline-bid ${bid.isWinningBid ? 'winning' : bid.status}`}>
                  <div className="timeline-marker">
                    {bid.isWinningBid ? '🏆' : index + 1}
                  </div>
                  <div className="bid-content">
                    <div className="bid-header">
                      <h4 className="product-name">{bid.productName || 'Unknown Product'}</h4>
                      <div className={`bid-status ${bid.isWinningBid ? 'won' : bid.status}`}>
                        {bid.isWinningBid ? '🏆 Won' : 
                         bid.status === 'active' ? '🔥 Active' : 
                         bid.status === 'lost' ? '😔 Lost' : bid.status}
                      </div>
                    </div>
                    
                    <div className="bid-details">
                      <div className="bid-amount">
                        <span className="amount">₹{formatNumber(bid.amount || bid.bidAmount)}</span>
                        {bid.isWinningBid && <span className="winner-badge">Winner</span>}
                      </div>
                      
                      <div className="bid-meta">
                        <span className="bid-date">
                          📅 {new Date(bid.createdAt || bid.timestamp).toLocaleDateString('en-IN')}
                        </span>
                        <span className="bid-time">
                          ⏰ {new Date(bid.createdAt || bid.timestamp).toLocaleTimeString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Statistics Summary */}
        {safeBuyerBids.length > 0 && (
          <div className="stats-summary">
            <h3>📈 Buyer Statistics</h3>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-value">{safeBuyerBids.length}</div>
                <div className="stat-label">Total Bids</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{safeBuyerBids.filter(b => b.isWinningBid).length}</div>
                <div className="stat-label">Auctions Won</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{safeBuyerBids.filter(b => b.status === 'active').length}</div>
                <div className="stat-label">Active Bids</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">
                  {safeBuyerBids.length > 0 ? Math.round((safeBuyerBids.filter(b => b.isWinningBid).length / safeBuyerBids.length) * 100) : 0}%
                </div>
                <div className="stat-label">Success Rate</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">
                  ₹{safeBuyerBids.length > 0 ? formatNumber(Math.round(safeBuyerBids.reduce((sum, bid) => sum + (bid.amount || bid.bidAmount || 0), 0) / safeBuyerBids.length)) : '0'}
                </div>
                <div className="stat-label">Average Bid</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">
                  ₹{safeBuyerBids.length > 0 && safeBuyerBids.some(bid => bid.amount || bid.bidAmount) ? formatNumber(Math.max(...safeBuyerBids.map(bid => bid.amount || bid.bidAmount || 0))) : '0'}
                </div>
                <div className="stat-label">Highest Bid</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BuyerDetailsView;
