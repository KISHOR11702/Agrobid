import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import socketService from '../../services/socketService';
import './FarmerDashboard.css';

function FarmerDashboard() {
  const [farmerName, setFarmerName] = useState('');
  const [dashboardStats, setDashboardStats] = useState({
    totalProducts: 0,
    activeAuctions: 0,
    soldProducts: 0,
    totalRevenue: 0,
    recentBids: [],
    recentActivity: []
  });
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const addNotification = useCallback((message, type) => {
    const notification = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date()
    };
    setNotifications(prev => [notification, ...prev.slice(0, 4)]);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 5000);
  }, []);

  const fetchDashboardData = useCallback(async (token) => {
    try {
      setLoading(true);

      // Fetch farmer name
      const farmerResponse = await axios.get('http://localhost:5000/api/farmer/details', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFarmerName(farmerResponse.data.farmerName);

      // Fetch products for statistics
      const productsResponse = await axios.get('http://localhost:5000/api/products', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const products = productsResponse.data;

      // Fetch all bids for farmer's products
      const bidsPromises = products.map(product => 
        axios.get(`http://localhost:5000/api/bids/product/${product._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: [] }))
      );
      
      const bidsResponses = await Promise.all(bidsPromises);
      const allBids = bidsResponses.flatMap((response, index) => 
        response.data.map(bid => ({ ...bid, productName: products[index].name }))
      );

      // Calculate statistics
      const calculateDashboardStats = (productsList, bidsList) => {
        const now = new Date();
        const activeAuctions = productsList.filter(p => new Date(p.bidEndDate) > now && p.status === 'active');
        const soldProducts = productsList.filter(p => p.status === 'sold');
        const totalRevenue = soldProducts.reduce((sum, product) => sum + (product.highestBid?.amount || 0), 0);
        
        // Recent bids (last 10)
        const recentBids = bidsList
          .sort((a, b) => new Date(b.createdAt || b.timestamp) - new Date(a.createdAt || a.timestamp))
          .slice(0, 10);

        // Recent activity
        const recentActivity = [
          ...productsList.slice(-5).map(p => ({
            type: 'product_added',
            message: `Added product "${p.name}"`,
            timestamp: p.createdAt,
            icon: '🌾'
          })),
          ...recentBids.slice(0, 5).map(b => ({
            type: 'bid_received',
            message: `New bid ₹${b.amount || b.bidAmount} on "${b.productName}"`,
            timestamp: b.createdAt || b.timestamp,
            icon: '💰'
          }))
        ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 8);

        return {
          totalProducts: productsList.length,
          activeAuctions: activeAuctions.length,
          soldProducts: soldProducts.length,
          totalRevenue,
          recentBids,
          recentActivity
        };
      };

      const stats = calculateDashboardStats(products, allBids);
      setDashboardStats(stats);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      if (error.response?.status === 403 || error.response?.status === 401) {
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const setupSocketListeners = useCallback(() => {
    socketService.connect();
    
    const socket = socketService.getSocket();
    if (socket) {
      socket.on('product-sold', (data) => {
        addNotification(`🎉 Product "${data.productName}" sold for ₹${data.finalAmount}!`, 'success');
        // Refresh dashboard data
        const token = localStorage.getItem('token');
        if (token) fetchDashboardData(token);
      });

      socket.on('bid-placed', (data) => {
        addNotification(`💰 New bid ₹${data.amount} on your product!`, 'info');
      });

      socket.on('auction-ended', (data) => {
        addNotification(`⏰ Auction ended for "${data.productName}"`, 'warning');
      });
    }
  }, [addNotification, fetchDashboardData]);

  useEffect(() => {
    const token = localStorage.getItem('token');

    if (!token) {
      console.error('No token found');
      navigate('/login');
      return;
    }

    fetchDashboardData(token);
    setupSocketListeners();

    return () => {
      socketService.disconnect();
    };
  }, [navigate, fetchDashboardData, setupSocketListeners]);

  const handleLogout = () => {
    localStorage.removeItem('token'); // Clear token on logout
    alert('You have been logged out.');
    navigate('/login');
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-IN').format(num);
  };

  const getTimeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now - time) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  if (loading) {
    return (
      <div className="farmer-dashboard">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="farmer-dashboard">
      {/* Enhanced Navbar */}
      <nav className="navbar">
        <div className="nav-brand">
          <span className="logo">🌾</span>
          <span>AgroBid Farmer</span>
        </div>
        <ul className="nav-links">
          <li><a href="/add-product" className="nav-item">📦 Add Product</a></li>
          <li><a href="/view-products" className="nav-item">👁️ View Products</a></li>
          <li><a href="/add-details" className="nav-item">📝 Profile</a></li>
          <li><button onClick={handleLogout} className="logout-btn">🚪 Logout</button></li>
        </ul>
      </nav>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="notifications">
          {notifications.map(notification => (
            <div key={notification.id} className={`notification ${notification.type}`}>
              <span>{notification.message}</span>
              <span className="notification-time">{getTimeAgo(notification.timestamp)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Welcome Header */}
      <div className="welcome-header">
        <div className="welcome-content">
          <h1>🌅 Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, {farmerName}!</h1>
          <p>Here's what's happening with your agricultural business today</p>
        </div>
        <div className="current-time">
          <div className="time">{new Date().toLocaleTimeString()}</div>
          <div className="date">{new Date().toLocaleDateString('en-IN', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card total-products">
          <div className="stat-icon">📦</div>
          <div className="stat-content">
            <h3>{dashboardStats.totalProducts}</h3>
            <p>Total Products</p>
          </div>
        </div>
        
        <div className="stat-card active-auctions">
          <div className="stat-icon">🔥</div>
          <div className="stat-content">
            <h3>{dashboardStats.activeAuctions}</h3>
            <p>Active Auctions</p>
          </div>
        </div>
        
        <div className="stat-card sold-products">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <h3>{dashboardStats.soldProducts}</h3>
            <p>Products Sold</p>
          </div>
        </div>
        
        <div className="stat-card revenue">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <h3>₹{formatNumber(dashboardStats.totalRevenue)}</h3>
            <p>Total Revenue</p>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="dashboard-content">
        {/* Recent Bids */}
        <div className="dashboard-card recent-bids">
          <div className="card-header">
            <h3>💎 Recent Bids</h3>
            <button onClick={() => navigate('/view-products')} className="view-all-btn">View All</button>
          </div>
          <div className="bids-list">
            {dashboardStats.recentBids.length > 0 ? (
              dashboardStats.recentBids.slice(0, 5).map((bid, index) => (
                <div key={index} className="bid-item">
                  <div className="bid-info">
                    <span className="bid-product">{bid.productName}</span>
                    <span className="bid-buyer">{bid.buyerName}</span>
                  </div>
                  <div className="bid-details">
                    <span className="bid-amount">₹{formatNumber(bid.amount || bid.bidAmount)}</span>
                    <span className="bid-time">{getTimeAgo(bid.createdAt || bid.timestamp)}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <span className="empty-icon">📭</span>
                <p>No bids received yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="dashboard-card quick-actions">
          <div className="card-header">
            <h3>⚡ Quick Actions</h3>
          </div>
          <div className="actions-grid">
            <button onClick={() => navigate('/add-product')} className="action-btn add-product">
              <span className="action-icon">📦</span>
              <span>Add New Product</span>
            </button>
            <button onClick={() => navigate('/view-products')} className="action-btn view-products">
              <span className="action-icon">👁️</span>
              <span>View My Products</span>
            </button>
            <button onClick={() => navigate('/add-details')} className="action-btn profile">
              <span className="action-icon">👤</span>
              <span>Update Profile</span>
            </button>
            <button onClick={() => window.open('https://weather.com', '_blank')} className="action-btn weather">
              <span className="action-icon">🌤️</span>
              <span>Check Weather</span>
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="dashboard-card recent-activity">
          <div className="card-header">
            <h3>📊 Recent Activity</h3>
          </div>
          <div className="activity-timeline">
            {dashboardStats.recentActivity.length > 0 ? (
              dashboardStats.recentActivity.map((activity, index) => (
                <div key={index} className="activity-item">
                  <div className="activity-icon">{activity.icon}</div>
                  <div className="activity-content">
                    <p>{activity.message}</p>
                    <span className="activity-time">{getTimeAgo(activity.timestamp)}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <span className="empty-icon">📋</span>
                <p>No recent activity</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default FarmerDashboard;
