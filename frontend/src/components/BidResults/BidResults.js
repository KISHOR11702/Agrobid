import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './BidResults.css';

function BidResults() {
  const [bidResults, setBidResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, won, lost

  useEffect(() => {
    fetchBidResults();
  }, []);

  const fetchBidResults = async () => {
    try {
      const token = localStorage.getItem('token');
      const userId = localStorage.getItem('userId');
      
      const response = await axios.get(`http://localhost:5000/api/bids/results/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      setBidResults(response.data.bidResults);
    } catch (error) {
      console.error('Error fetching bid results:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredResults = bidResults.filter(bid => {
    if (filter === 'won') return bid.status === 'Won';
    if (filter === 'lost') return bid.status === 'Lost';
    return true;
  });

  const wonCount = bidResults.filter(bid => bid.status === 'Won').length;
  const lostCount = bidResults.filter(bid => bid.status === 'Lost').length;

  if (loading) {
    return (
      <div className="bid-results-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading your bid results...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bid-results-page">
      <div className="page-header">
        <h1>🎯 Your Bid Results</h1>
        <p>Track your bidding success and outcomes</p>
      </div>

      <div className="stats-container">
        <div className="stat-card won">
          <div className="stat-number">{wonCount}</div>
          <div className="stat-label">🏆 Won Bids</div>
        </div>
        <div className="stat-card lost">
          <div className="stat-number">{lostCount}</div>
          <div className="stat-label">😔 Lost Bids</div>
        </div>
        <div className="stat-card total">
          <div className="stat-number">{bidResults.length}</div>
          <div className="stat-label">📊 Total Bids</div>
        </div>
      </div>

      <div className="filter-section">
        <button 
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All Results
        </button>
        <button 
          className={`filter-btn ${filter === 'won' ? 'active' : ''}`}
          onClick={() => setFilter('won')}
        >
          Won Bids
        </button>
        <button 
          className={`filter-btn ${filter === 'lost' ? 'active' : ''}`}
          onClick={() => setFilter('lost')}
        >
          Lost Bids
        </button>
      </div>

      <div className="results-container">
        {filteredResults.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>No Results Found</h3>
            <p>
              {filter === 'all' 
                ? "You haven't participated in any completed auctions yet."
                : `No ${filter} bids found.`}
            </p>
          </div>
        ) : (
          <div className="results-list">
            {filteredResults.map((bid) => (
              <div key={bid._id} className={`result-card ${bid.status.toLowerCase()}`}>
                <div className="result-header">
                  <h3 className="product-name">{bid.productId.name}</h3>
                  <div className={`status-badge ${bid.status.toLowerCase()}`}>
                    {bid.status === 'Won' ? '🏆 Won' : '😔 Lost'}
                  </div>
                </div>
                
                <div className="result-details">
                  <div className="detail-row">
                    <span className="label">Category:</span>
                    <span className="value">{bid.productId.category}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Your Bid:</span>
                    <span className="value">₹{bid.amount}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Result:</span>
                    <span className={`value ${bid.status.toLowerCase()}`}>
                      {bid.status === 'Won' 
                        ? '🎉 Congratulations! You won this auction!' 
                        : '😔 Better luck next time!'}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Date:</span>
                    <span className="value">
                      {new Date(bid.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default BidResults;
