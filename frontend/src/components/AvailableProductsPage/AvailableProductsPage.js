import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import socketService from '../../services/socketService';
import './AvailableProductsPage.css';

function AvailableProductsPage() {
  const [products, setProducts] = useState([]);
  const [bidAmount, setBidAmount] = useState({});
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [liveBidData, setLiveBidData] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if buyer details are complete
    const checkBuyerDetails = async () => {
      try {
        const token = localStorage.getItem('token'); // Get token from localStorage
        const response = await axios.get('http://localhost:5000/api/buyer/details', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.data.detailsFilled) {
          // Redirect to AddBuyerDetailsPage if details are incomplete
          alert('Please complete your profile details before proceeding.');
          navigate('/add-buyer-details');
        }
      } catch (error) {
        console.error('Error checking buyer details:', error);
        alert('Error verifying your details. Please log in again.');
      }
    };

    checkBuyerDetails();
  }, [navigate]);

  useEffect(() => {
    // Fetch categories for the dropdown
    const fetchCategories = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/availableProducts/categories');
        setCategories(['All', ...response.data]); // Add 'All' as the first category
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };

    fetchCategories();
  }, []);

  // WebSocket event handlers
  const handleBidPlaced = useCallback((data) => {
    const { productId, amount, buyerName, highestBid, totalBids } = data;
    
    // Update live bid data
    setLiveBidData(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        highestBid,
        totalBids,
        recentBids: [
          { amount, buyerName, timestamp: new Date(), isNew: true },
          ...(prev[productId]?.recentBids || []).slice(0, 9)
        ]
      }
    }));

    // Auto-update bid input placeholder to minimum next bid
    setBidAmount(prev => ({
      ...prev,
      [productId]: ''
    }));

    // Show notification
    showNotification(`New bid of ₹${amount} by ${buyerName}`, 'success');
  }, []);

  const handleBidUpdated = useCallback((data) => {
    const { productId, amount, buyerName, highestBid, totalBids } = data;
    
    // Update live bid data
    setLiveBidData(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        highestBid,
        totalBids,
        recentBids: prev[productId]?.recentBids?.map(bid => 
          bid.buyerName === buyerName ? { ...bid, amount, isUpdate: true } : bid
        ) || []
      }
    }));

    showNotification(`${buyerName} updated their bid to ₹${amount}`, 'info');
  }, []);

  // Handle auction ended
  const handleAuctionEnded = useCallback((data) => {
    const { productId, productName, winner } = data;
    
    // Update product status in UI
    setProducts(prev => prev.map(product => 
      product._id === productId 
        ? { ...product, status: 'sold', bidEndDate: new Date() }
        : product
    ));

    // Show auction ended notification
    showNotification(
      `🏆 Auction ended for "${productName}" - Winner: ${winner.name} (₹${winner.amount})`, 
      'info'
    );
  }, []);

  // Handle personal bid results
  const handleBidResult = useCallback((data) => {
    const { type, message } = data;
    
    // Show personalized notification
    if (type === 'winner') {
      showNotification(`🎉 ${message}`, 'success');
    } else {
      showNotification(`😔 ${message}`, 'error');
    }
  }, []);

  // Initialize WebSocket connection
  useEffect(() => {
    socketService.connect();
    
    socketService.onBidPlaced(handleBidPlaced);
    socketService.onBidUpdated(handleBidUpdated);
    
    // Listen for auction results
    const socket = socketService.getSocket();
    if (socket) {
      socket.on('auction-ended', handleAuctionEnded);
      socket.on('bid-result', handleBidResult);
      
      // Join user-specific room for personal notifications
      const userId = localStorage.getItem('userId');
      if (userId) {
        socket.emit('join-user', userId);
      }
    }

    return () => {
      socketService.offBidPlaced(handleBidPlaced);
      socketService.offBidUpdated(handleBidUpdated);
      
      if (socket) {
        socket.off('auction-ended', handleAuctionEnded);
        socket.off('bid-result', handleBidResult);
      }
      socketService.disconnect();
    };
  }, [handleBidPlaced, handleBidUpdated, handleAuctionEnded, handleBidResult]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('token');
        const url =
          selectedCategory === 'All'
            ? 'http://localhost:5000/api/availableProducts/category/All'
            : `http://localhost:5000/api/availableProducts/category/${selectedCategory}`;
        const response = await axios.get(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        setProducts(response.data);
        
        // Join WebSocket rooms for all products and fetch live data
        response.data.forEach(product => {
          socketService.joinProduct(product._id);
          fetchLiveBidData(product._id);
        });
        
      } catch (error) {
        console.error('Error fetching products:', error);
        showNotification('Error loading products', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, [selectedCategory]);

  // Fetch live bid data for a product
  const fetchLiveBidData = async (productId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:5000/api/bids/product/${productId}/live`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      setLiveBidData(prev => ({
        ...prev,
        [productId]: response.data
      }));
    } catch (error) {
      console.error('Error fetching live bid data:', error);
    }
  };

  // Show notification function
  const showNotification = (message, type = 'info') => {
    const id = Date.now();
    setNotifications(prev => [
      { id, message, type, timestamp: new Date() },
      ...prev.slice(0, 4)
    ]);
    
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  // Handle bid submission
  const handleBidSubmit = async (productId) => {
    const amount = parseFloat(bidAmount[productId]);
    const currentHighest = liveBidData[productId]?.product?.highestBid?.amount || 0;
    
    if (!amount || amount <= 0) {
      showNotification('Please enter a valid bid amount', 'error');
      return;
    }

    if (amount <= currentHighest) {
      showNotification(`Bid must be higher than ₹${currentHighest}`, 'error');
      return;
    }

    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5000/api/bids/bid', { productId, amount }, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      // Clear bid input
      setBidAmount({ ...bidAmount, [productId]: '' });
      showNotification('Bid placed successfully!', 'success');
      
    } catch (error) {
      console.error('Error placing bid:', error);
      const errorMessage = error.response?.data?.message || 'Failed to place bid';
      showNotification(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate time remaining for bidding
  const getTimeRemaining = (bidEndDate) => {
    const now = new Date();
    const end = new Date(bidEndDate);
    const diff = end - now;
    
    if (diff <= 0) return 'Bidding Ended';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h remaining`;
    }
    
    return `${hours}h ${minutes}m remaining`;
  };

  // Format number with commas for better readability
  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-IN').format(num);
  };

  // Generate smart quick bid amounts
  const getQuickBidAmounts = (currentHighest, basePrice) => {
    const minBid = Math.max(currentHighest + 1, basePrice + 1);
    const increments = [1, 50, 100, 200];
    
    return increments.map(increment => minBid + increment - 1).filter((amount, index, arr) => {
      // Remove duplicates and ensure reasonable spread
      return arr.indexOf(amount) === index && amount >= minBid;
    });
  };

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login'); // Redirect to login page after logout
  };

  return (
    <div className="available-products-page">
      {/* Notifications */}
      <div className="notifications-container">
        {notifications.map(notification => (
          <div key={notification.id} className={`notification ${notification.type}`}>
            <span>{notification.message}</span>
            <span className="notification-time">
              {notification.timestamp.toLocaleTimeString()}
            </span>
          </div>
        ))}
      </div>

      {/* Navbar */}
      <nav className="navbar">
        <div className="nav-brand">🌾 AgroBid</div>
        <ul className="nav-links">
          <li><a href="/available-products" className="active">Available Products</a></li>
          <li><button onClick={() => navigate('/your-bids')} className="nav-btn">Your Bids</button></li>
          <li><a href="/add-buyer-details">Profile</a></li>
          <li>
            <button onClick={handleLogout} className="logout-btn">Logout</button>
          </li>
        </ul>
      </nav>

      <div className="main-content">
        <div className="header-section">
          <h1>🛒 Available Products for Bidding</h1>
          <p>Place your bids on fresh agricultural products</p>
        </div>

        {/* Category Filter */}
        <div className="filter-section">
          <div className="category-filter">
            <label htmlFor="category">🏷️ Filter by Category:</label>
            <select
              id="category"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="category-select"
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading products...</p>
          </div>
        )}

        {/* Products Grid */}
        <div className="products-grid">
          {products.map((product) => {
            const productLiveData = liveBidData[product._id];
            const highestBid = productLiveData?.product?.highestBid?.amount || 0;
            const totalBids = productLiveData?.product?.totalBids || 0;
            const timeRemaining = getTimeRemaining(product.bidEndDate);
            const isExpired = new Date(product.bidEndDate) <= new Date();
            
            return (
              <div key={product._id} className={`product-card ${isExpired ? 'expired' : ''}`}>
                <div className="product-header">
                  <h3 className="product-title">{product.name}</h3>
                  <div className={`time-remaining ${isExpired ? 'expired' : ''}`}>
                    ⏱️ {timeRemaining}
                  </div>
                </div>

                <div className="product-info">
                  <div className="info-row">
                    <span className="label">💰 Starting Price:</span>
                    <span className="value">₹{formatNumber(product.price)}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">📦 Quantity:</span>
                    <span className="value">{product.quantity} {product.unit}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">🏷️ Category:</span>
                    <span className="value">{product.category}</span>
                  </div>
                  <div className="info-row farmer-info">
                    <span className="label">🌾 Farmer:</span>
                    
                  </div>
                </div>

                {/* Bid Statistics */}
                <div className="bid-stats">
                  <div className="stat-item">
                    <div className="stat-value">₹{highestBid ? formatNumber(highestBid) : '0'}</div>
                    <div className="stat-label">Highest Bid</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">{totalBids || 0}</div>
                    <div className="stat-label">Total Bids</div>
                  </div>
                </div>

                {/* Product Video */}
                {product.video && (
                  <div className="video-container">
                    <video
                      controls
                      src={product.video}
                      className="product-video"
                      type="video/mp4"
                    >
                      Your browser does not support the video tag.
                    </video>
                  </div>
                )}

                {/* Recent Bids */}
                {productLiveData?.recentBids?.length > 0 && (
                  <div className="recent-bids">
                    <h4>🔥 Recent Bids</h4>
                    <div className="bids-list">
                      {productLiveData.recentBids.slice(0, 3).map((bid, index) => (
                        <div key={index} className={`bid-item ${bid.isNew ? 'new-bid' : ''} ${bid.isUpdate ? 'updated-bid' : ''}`}>
                          <span className="bid-amount">₹{formatNumber(bid.amount)}</span>
                          <span className="bid-buyer">{bid.buyerName}</span>
                          <span className="bid-time">
                            {new Date(bid.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* View Bids & Farmer Buttons */}
                <div className="view-buttons-section">
                  <button 
                    onClick={() => navigate(`/product-bids/${product._id}`)}
                    className="view-bids-btn"
                    title="View all bids and buyer details for this product"
                  >
                    👥 View All Bids ({totalBids || 0})
                  </button>
                  <button 
                    onClick={() => navigate(`/farmer-details/${product.farmerId._id || product.farmerId}`)}
                    className="view-farmer-btn"
                    title="View farmer profile and verification details"
                  >
                    🌾 View Farmer Profile
                  </button>
                </div>

                {/* Bidding Section */}
                {!isExpired ? (
                  <div className="bidding-section">
                    {/* Quick bid buttons */}
                    <div className="quick-bid-buttons">
                      <span className="quick-bid-label">💸 Quick Bids:</span>
                      {getQuickBidAmounts(highestBid, product.price).map((amount, index) => (
                        <button
                          key={index}
                          className="quick-bid-btn"
                          onClick={() => setBidAmount({ ...bidAmount, [product._id]: amount.toString() })}
                          title={`Place bid of ₹${formatNumber(amount)}`}
                        >
                          ₹{formatNumber(amount)}
                        </button>
                      ))}
                    </div>
                    
                    <div className="bid-input-container">
                      <div className="input-wrapper">
                        <span className="currency-symbol">₹</span>
                        <input
                          type="number"
                          placeholder={`Enter amount (min: ${formatNumber(Math.max(highestBid + 1, product.price + 1))})`}
                          value={bidAmount[product._id] || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            // Only allow positive numbers and prevent negative values
                            if (value === '' || (!isNaN(value) && parseFloat(value) >= 0)) {
                              setBidAmount({ ...bidAmount, [product._id]: value });
                            }
                          }}
                          onFocus={(e) => {
                            // Auto-suggest minimum bid if input is empty
                            if (!e.target.value) {
                              const minBid = Math.max(highestBid + 1, product.price + 1);
                              setBidAmount({ ...bidAmount, [product._id]: minBid.toString() });
                            }
                          }}
                          className={`bid-input ${
                            bidAmount[product._id] && parseFloat(bidAmount[product._id]) < Math.max(highestBid + 1, product.price + 1) 
                              ? 'invalid' 
                              : bidAmount[product._id] && parseFloat(bidAmount[product._id]) >= Math.max(highestBid + 1, product.price + 1)
                              ? 'valid'
                              : ''
                          }`}
                          min={Math.max(highestBid + 1, product.price + 1)}
                          step="1"
                          autoComplete="off"
                        />
                        {bidAmount[product._id] && parseFloat(bidAmount[product._id]) >= Math.max(highestBid + 1, product.price + 1) && (
                          <span className="validation-icon">✅</span>
                        )}
                        {bidAmount[product._id] && parseFloat(bidAmount[product._id]) < Math.max(highestBid + 1, product.price + 1) && (
                          <span className="validation-icon">❌</span>
                        )}
                      </div>
                      
                      <button 
                        onClick={() => handleBidSubmit(product._id)}
                        className={`bid-button ${
                          bidAmount[product._id] && parseFloat(bidAmount[product._id]) >= Math.max(highestBid + 1, product.price + 1)
                            ? 'enabled' : 'disabled'
                        }`}
                        disabled={isLoading || !bidAmount[product._id] || parseFloat(bidAmount[product._id]) < Math.max(highestBid + 1, product.price + 1)}
                      >
                        {isLoading ? '⏳ Placing...' : '🎯 Place Bid'}
                      </button>
                    </div>
                    
                    <div className="bid-help-text">
                      <div className="bid-info-row">
                        <span className="info-item">
                          🏆 <strong>Highest Bid:</strong> ₹{highestBid ? formatNumber(highestBid) : 'No bids yet'}
                        </span>
                        <span className="info-item">
                          💰 <strong>Minimum:</strong> ₹{formatNumber(Math.max(highestBid + 1, product.price + 1))}
                        </span>
                        <span className="info-item">
                          👥 <strong>Total Bids:</strong> {totalBids || 0}
                        </span>
                      </div>
                      {bidAmount[product._id] && parseFloat(bidAmount[product._id]) < Math.max(highestBid + 1, product.price + 1) && (
                        <div className="error-message">
                          ⚠️ Bid amount must be at least ₹{formatNumber(Math.max(highestBid + 1, product.price + 1))}
                        </div>
                      )}
                      {bidAmount[product._id] && parseFloat(bidAmount[product._id]) >= Math.max(highestBid + 1, product.price + 1) && (
                        <div className="success-message">
                          ✅ Valid bid amount: ₹{formatNumber(parseFloat(bidAmount[product._id]))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="expired-section">
                    <div className="expired-badge">⏰ Bidding Ended</div>
                    {highestBid > 0 && (
                      <div className="winner-info">
                        🏆 Winning Bid: ₹{formatNumber(highestBid)} by {productLiveData?.product?.highestBid?.buyerName}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {products.length === 0 && !isLoading && (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>No Products Available</h3>
            <p>There are no products in the selected category at the moment.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default AvailableProductsPage;
