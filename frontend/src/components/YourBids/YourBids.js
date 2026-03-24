import React, { useState, useEffect } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from 'react-router-dom';
import "./YourBids.css";

const YourBidsPage = () => {
  const [bids, setBids] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, active, won, lost
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch the token from localStorage
    const token = localStorage.getItem("token");

    if (!token) {
      setError("Token is missing. Please log in again.");
      return;
    }

    let buyerId;
    try {
      // Decode token to get buyerId
      const decodedToken = jwtDecode(token);
      console.log(decodedToken)
      buyerId = decodedToken.userId; // Ensure this matches the key in your JWT payload
    } catch (err) {
      setError("Failed to decode token. Please log in again.");
      return;
    }

    if (!buyerId) {
      setError("Buyer ID is missing in the token. Please log in again.");
      return;
    }

    const fetchBids = async () => {
      try {
        setLoading(true);
        const response = await axios.get(
          `http://localhost:5000/api/bids/your-bids/${buyerId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setBids(response.data);
      } catch (error) {
        setError(
          error.response?.data?.message || "Failed to fetch bids. Try again later."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchBids();
  }, []);

  // Filter bids based on selected filter
  const filteredBids = bids.filter(bid => {
    switch (filter) {
      case 'won':
        return bid.isWinningBid;
      case 'lost':
        return bid.status === 'lost';
      case 'active':
        return bid.status === 'active';
      default:
        return true;
    }
  });

  // Format number with Indian currency format
  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-IN').format(num);
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div className="your-bids-page">
      {/* Navbar */}
      <nav className="navbar">
        <div className="nav-brand">🌾 AgroBid</div>
        <ul className="nav-links">
          <li><a href="/available-products">Available Products</a></li>
          <li><a href="/your-bids" className="active">Your Bids</a></li>
          <li><a href="/add-buyer-details">Profile</a></li>
          <li>
            <button onClick={handleLogout} className="logout-btn">Logout</button>
          </li>
        </ul>
      </nav>

      <div className="main-content">
        <div className="header-section">
          <h1>🎯 Your Bidding History</h1>
          <p>Track all your bids and auction results</p>
        </div>

        {/* Filter Section */}
        <div className="filter-section">
          <div className="filter-buttons">
            <button 
              className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All Bids ({bids.length})
            </button>
            <button 
              className={`filter-btn ${filter === 'active' ? 'active' : ''}`}
              onClick={() => setFilter('active')}
            >
              Active ({bids.filter(b => b.status === 'active').length})
            </button>
            <button 
              className={`filter-btn won ${filter === 'won' ? 'active' : ''}`}
              onClick={() => setFilter('won')}
            >
              Won ({bids.filter(b => b.isWinningBid).length})
            </button>
            <button 
              className={`filter-btn lost ${filter === 'lost' ? 'active' : ''}`}
              onClick={() => setFilter('lost')}
            >
              Lost ({bids.filter(b => b.status === 'lost').length})
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading your bids...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="error-container">
            <div className="error-icon">⚠️</div>
            <h3>Unable to Load Bids</h3>
            <p>{error}</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredBids.length === 0 && bids.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">🎯</div>
            <h3>No Bids Yet</h3>
            <p>You haven't placed any bids yet. Start bidding on agricultural products!</p>
            <button 
              className="cta-button"
              onClick={() => navigate('/available-products')}
            >
              Browse Products
            </button>
          </div>
        )}

        {/* No Results for Filter */}
        {!loading && !error && filteredBids.length === 0 && bids.length > 0 && (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <h3>No {filter} Bids Found</h3>
            <p>Try selecting a different filter to see your bids.</p>
          </div>
        )}

        {/* Bids Grid */}
        {!loading && !error && filteredBids.length > 0 && (
          <div className="bids-grid">
            {filteredBids.map((bid) => (
              <div key={bid.bidId} className={`bid-card ${bid.isWinningBid ? 'winning' : bid.status}`}>
                <div className="bid-header">
                  <h3 className="product-name">{bid.productName}</h3>
                  <div className={`status-badge ${bid.isWinningBid ? 'won' : bid.status}`}>
                    {bid.isWinningBid ? '🏆 Won' : 
                     bid.status === 'active' ? '🔥 Active' : 
                     bid.status === 'lost' ? '😔 Lost' : bid.status}
                  </div>
                </div>

                <div className="bid-details">
                  <div className="bid-amount">
                    <span className="label">Your Bid</span>
                    <span className="amount">₹{formatNumber(bid.bidAmount)}</span>
                  </div>

                  {bid.isWinningBid && (
                    <div className="winner-info">
                      <div className="congratulations">
                        🎉 Congratulations! You won this auction!
                      </div>
                    </div>
                  )}

                  {bid.status === 'lost' && bid.winningAmount && (
                    <div className="losing-info">
                      <span className="label">Winning Bid</span>
                      <span className="winning-amount">₹{formatNumber(bid.winningAmount)}</span>
                    </div>
                  )}

                  <div className="bid-meta">
                    <div className="meta-item">
                      <span className="meta-label">📅 Bid Date</span>
                      <span className="meta-value">
                        {new Date(bid.timestamp || bid.createdAt).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">⏰ Bid Time</span>
                      <span className="meta-value">
                        {new Date(bid.timestamp || bid.createdAt).toLocaleTimeString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>

                {bid.status === 'active' && (
                  <div className="active-bid-info">
                    <div className="pulse-dot"></div>
                    <span>Bidding still in progress...</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Statistics Summary */}
        {!loading && !error && bids.length > 0 && (
          <div className="stats-summary">
            <h3>📊 Bidding Statistics</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-value">{bids.length}</div>
                <div className="stat-label">Total Bids</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{bids.filter(b => b.isWinningBid).length}</div>
                <div className="stat-label">Auctions Won</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{bids.filter(b => b.status === 'active').length}</div>
                <div className="stat-label">Active Bids</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">
                  {bids.length > 0 ? Math.round((bids.filter(b => b.isWinningBid).length / bids.length) * 100) : 0}%
                </div>
                <div className="stat-label">Win Rate</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default YourBidsPage;
