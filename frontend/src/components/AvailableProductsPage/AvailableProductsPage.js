import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom'; // Import useNavigate for redirection
import './AvailableProductsPage.css';

function AvailableProductsPage() {
  const [products, setProducts] = useState([]);
  const [bidAmount, setBidAmount] = useState({});
  const [categories, setCategories] = useState([]); // To store categories for filter
  const [selectedCategory, setSelectedCategory] = useState('All'); // Default to 'All'
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

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const token = localStorage.getItem('token'); // Get the token from localStorage
        const url =
          selectedCategory === 'All'
            ? 'http://localhost:5000/api/availableProducts/category/All'
            : `http://localhost:5000/api/availableProducts/category/${selectedCategory}`;
        const response = await axios.get(url, {
          headers: {
            Authorization: `Bearer ${token}`, // Add the token to the Authorization header
          },
        });
        setProducts(response.data);
      } catch (error) {
        console.error('Error fetching products:', error);
      }
    };

    fetchProducts();
  }, [selectedCategory]);

  // Handle bid submission
  const handleBidSubmit = async (productId) => {
    const amount = bidAmount[productId];
    if (!amount || amount <= 0) {
      alert('Please enter a valid bid amount');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5000/api/bids/bid', { productId, amount }, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      alert('Bid placed successfully!');
    } catch (error) {
      console.error('Error placing bid:', error);
      alert('Failed to place bid.');
    }
  };

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login'); // Redirect to login page after logout
  };

  return (
    <div className="available-products-page">
      {/* Navbar */}
      <nav className="navbar">
        <ul>
          <li><a href="/available-products">Available Products</a></li>
          <li><a href="/your-bids">Your Bids</a></li>
          <li><a href="/add-buyer-details">Add Details</a></li>
          <li>
            <button onClick={handleLogout} className="logout-btn">Logout</button>
          </li>
        </ul>
      </nav>

      <h2>Available Products</h2>

      {/* Category Filter */}
      <div className="category-filter">
        <label htmlFor="category">Filter by Category:</label>
        <select
          id="category"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      {/* Products Container */}
      <div className="products-container">
        {products.map((product) => (
          <div key={product._id} className="product-card">
            <h3>{product.name}</h3>
            <p>Price: ₹{product.price}</p>
            <p>Quantity: {product.quantity} {product.unit}</p>
            <p>Category: {product.category}</p>

            {/* Display Product Video */}
            {product.video && (
              <video
                controls
                src={product.video} // Video URL comes from the backend
                style={{ width: '100%', marginTop: '10px', borderRadius: '8px' }}
                type="video/mp4"
              >
                Your browser does not support the video tag.
              </video>
            )}

            {/* Input for placing a bid */}
            <input
              type="number"
              placeholder="Enter your bid amount"
              value={bidAmount[product._id] || ''}
              onChange={(e) => setBidAmount({ ...bidAmount, [product._id]: e.target.value })}
            />
            <button onClick={() => handleBidSubmit(product._id)}>Place Bid</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AvailableProductsPage;
