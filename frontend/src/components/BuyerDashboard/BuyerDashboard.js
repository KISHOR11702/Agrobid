import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { SOCKET_URL } from '../../config/api';
import './BuyerDashboard.css';

function BuyerDashboard() {
  const [buyerName, setBuyerName] = useState('');
  const [loading, setLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState({
    totalBids: 0,
    activeBids: 0,
    wonAuctions: 0,
    totalSpent: 0
  });
  const [notifications, setNotifications] = useState([]);
  const [recentBids, setRecentBids] = useState([]);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
  
    if (!token) {
      console.error('No token found');
      navigate('/login');
      return;
    }

    fetchDashboardData();
    setupSocketListeners();

    // Update time every minute
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => {
      clearInterval(timeInterval);
    };
  }, [navigate]);

  const fetchDashboardData = async () => {
    const token = localStorage.getItem('token');
    
    try {
      setLoading(true);

      // Fetch buyer name
      const nameResponse = await axios.get('http://localhost:5000/api/buyer/getName', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBuyerName(nameResponse.data.buyerName);

      // Fetch buyer's bids
      const bidsResponse = await axios.get('http://localhost:5000/api/bids', {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Fetch available products
      const productsResponse = await axios.get('http://localhost:5000/api/available-products', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const bids = bidsResponse.data || [];
      const products = productsResponse.data || [];

      // Calculate dashboard statistics
      const stats = calculateDashboardStats(bids, products);
      setDashboardStats(stats);

      // Set recent bids (last 5)
      const sortedBids = bids.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setRecentBids(sortedBids.slice(0, 5));

      // Set available products (first 4 for dashboard)
      setAvailableProducts(products.slice(0, 4));

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      if (error.response?.status === 403 || error.response?.status === 401) {
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const calculateDashboardStats = (bids, products) => {
    const activeBids = bids.filter(bid => {
      const product = products.find(p => p._id === bid.productId);
      return product && new Date(product.bidEndTime) > new Date();
    });

    const wonAuctions = bids.filter(bid => {
      const product = products.find(p => p._id === bid.productId);
      if (!product || new Date(product.bidEndTime) > new Date()) return false;
      
      const highestBid = Math.max(...product.bids.map(b => b.bidAmount));
      return bid.bidAmount === highestBid;
    });

    const totalSpent = wonAuctions.reduce((sum, bid) => sum + bid.bidAmount, 0);

    return {
      totalBids: bids.length,
      activeBids: activeBids.length,
      wonAuctions: wonAuctions.length,
      totalSpent: totalSpent
    };
  };

  const setupSocketListeners = () => {
    const socket = io(SOCKET_URL);
    
    socket.on('newBid', (data) => {
      addNotification(`New bid placed on ${data.productName}`, 'info');
      fetchDashboardData(); // Refresh data
    });

    socket.on('auctionEnded', (data) => {
      addNotification(`Auction ended for ${data.productName}`, 'warning');
      fetchDashboardData(); // Refresh data
    });

    socket.on('bidAccepted', (data) => {
      addNotification(`Your bid on ${data.productName} was accepted!`, 'success');
      fetchDashboardData(); // Refresh data
    });
  };

  const addNotification = (message, type) => {
    const notification = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date().toLocaleTimeString()
    };
    
    setNotifications(prev => [notification, ...prev.slice(0, 4)]);
    
    // Auto remove notification after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 5000);
  };
  
  const handleLogout = () => {
    localStorage.removeItem('token');
    alert('You have been logged out.');
    navigate('/login');
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  if (loading) {
    return (
      <div className="buyer-dashboard">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="buyer-dashboard">
      {/* Enhanced Navbar */}
      <nav className="navbar">
        <div className="nav-brand">
          <span className="logo">🌾</span>
          <span>AgroBid</span>
        </div>
        <div className="nav-links">
          <a href="/available-products" className="nav-item">
            🛒 Browse Products
          </a>
          <a href="/your-bids" className="nav-item">
            📊 Your Bids
          </a>
          <a href="/add-buyer-details" className="nav-item">
            👤 Profile
          </a>
          <button onClick={handleLogout} className="logout-btn">
            🚪 Logout
          </button>
        </div>
      </nav>

      {/* Real-time Notifications */}
      {notifications.length > 0 && (
        <div className="notifications">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`notification ${notification.type}`}
            >
              <span>{notification.message}</span>
              <span className="notification-time">{notification.timestamp}</span>
            </div>
          ))}
        </div>
      )}

      {/* Welcome Header */}
      <div className="welcome-header">
        <div className="welcome-content">
          <h1>{getGreeting()}, {buyerName}! 🎉</h1>
          <p>Welcome to your personalized buyer dashboard</p>
        </div>
        <div className="current-time">
          <div className="time">{formatTime(currentTime)}</div>
          <div className="date">{formatDate(currentTime)}</div>
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="stats-grid">
        <div className="stat-card total-bids">
          <div className="stat-icon">📝</div>
          <div className="stat-content">
            <h3>{dashboardStats.totalBids}</h3>
            <p>Total Bids</p>
          </div>
        </div>
        <div className="stat-card active-bids">
          <div className="stat-icon">⏰</div>
          <div className="stat-content">
            <h3>{dashboardStats.activeBids}</h3>
            <p>Active Bids</p>
          </div>
        </div>
        <div className="stat-card won-auctions">
          <div className="stat-icon">🏆</div>
          <div className="stat-content">
            <h3>{dashboardStats.wonAuctions}</h3>
            <p>Won Auctions</p>
          </div>
        </div>
        <div className="stat-card total-spent">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <h3>₹{dashboardStats.totalSpent.toLocaleString()}</h3>
            <p>Total Spent</p>
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="dashboard-content">
        {/* Recent Bids */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3>📊 Recent Bids</h3>
            <button 
              className="view-all-btn"
              onClick={() => navigate('/your-bids')}
            >
              View All
            </button>
          </div>
          {recentBids.length > 0 ? (
            <div className="bids-list">
              {recentBids.map((bid, index) => (
                <div key={index} className="bid-item">
                  <div className="bid-info">
                    <div className="bid-product">Product ID: {bid.productId}</div>
                    <div className="bid-status">Status: Active</div>
                  </div>
                  <div className="bid-details">
                    <div className="bid-amount">₹{bid.bidAmount.toLocaleString()}</div>
                    <div className="bid-time">
                      {new Date(bid.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📝</div>
              <p>No bids yet. Start bidding on products!</p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3>🚀 Quick Actions</h3>
          </div>
          <div className="actions-grid">
            <button
              className="action-btn browse-products"
              onClick={() => navigate('/available-products')}
            >
              <div className="action-icon">🛒</div>
              <span>Browse Products</span>
            </button>
            <button
              className="action-btn view-bids"
              onClick={() => navigate('/your-bids')}
            >
              <div className="action-icon">📊</div>
              <span>View Your Bids</span>
            </button>
            <button
              className="action-btn profile"
              onClick={() => navigate('/add-buyer-details')}
            >
              <div className="action-icon">👤</div>
              <span>Update Profile</span>
            </button>
            <button
              className="action-btn help"
              onClick={() => alert('Help & Support - Coming Soon!')}
            >
              <div className="action-icon">❓</div>
              <span>Help & Support</span>
            </button>
          </div>
        </div>

        {/* Available Products Preview */}
        <div className="dashboard-card recent-activity">
          <div className="card-header">
            <h3>🌾 Featured Products</h3>
            <button 
              className="view-all-btn"
              onClick={() => navigate('/available-products')}
            >
              View All Products
            </button>
          </div>
          {availableProducts.length > 0 ? (
            <div className="products-grid">
              {availableProducts.map((product, index) => (
                <div key={index} className="product-item">
                  <div className="product-info">
                    <div className="product-name">{product.productName}</div>
                    <div className="product-farmer">by {product.farmerName}</div>
                    <div className="product-details">
                      <span className="product-quantity">{product.quantity} {product.unit}</span>
                      <span className="product-price">₹{product.basePrice}/unit</span>
                    </div>
                  </div>
                  <button
                    className="bid-now-btn"
                    onClick={() => navigate('/available-products')}
                  >
                    Bid Now
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">🌾</div>
              <p>No products available at the moment.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default BuyerDashboard;
