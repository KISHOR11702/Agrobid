import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './ViewProductsPage.css';

function ViewProductsPage() {
  const [products, setProducts] = useState([]);
  const [bids, setBids] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [buyerDetails, setBuyerDetails] = useState(null);
  const [editProduct, setEditProduct] = useState(null);
  const navigate = useNavigate();

  // Fetch products added by the farmer
  useEffect(() => {
    const fetchProducts = async () => {
      const token = localStorage.getItem('token');
      try {
        const response = await axios.get('http://localhost:5000/api/products', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setProducts(response.data);
      } catch (error) {
        console.error('Error fetching products:', error);
        alert('Failed to load products.');
      }
    };

    fetchProducts();
  }, []);

  // Fetch bids for a specific product
  const fetchBids = async (productId) => {
    const token = localStorage.getItem('token');
    try {
      const response = await axios.get(`http://localhost:5000/api/bids/${productId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setSelectedProduct(productId);
      setBids(response.data); // Bids will include populated buyer details
    } catch (error) {
      console.error('Error fetching bids:', error);
      alert('Failed to load bids.');
    }
  };

  // View buyer details
  const viewBuyerDetails = async (buyerId) => {
    const token = localStorage.getItem('token');
    if (!buyerId) {
      alert('No buyer selected.');
      return;
    }

    try {
      const response = await axios.get(`http://localhost:5000/api/bids/buyer/${buyerId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data) {
        console.log('Buyer Details:', response.data);
        setBuyerDetails([response.data]); // Wrap the response in an array for consistent rendering
      } else {
        alert('No details found for this buyer.');
      }
    } catch (error) {
      console.error('Error fetching buyer details:', error);
      alert('Failed to load buyer details. Please try again later.');
    }
  };

  // Select a winning bid
  const selectWinningBid = async (bidId) => {
    const token = localStorage.getItem('token');
    try {
      await axios.post(
        'http://localhost:5000/api/bids/select',
        { bidId },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      alert('Winning bid selected successfully!');
      setBids([]);
    } catch (error) {
      console.error('Error selecting winning bid:', error);
      alert('Failed to select winning bid.');
    }
  };

  // Update a product
  const updateProduct = async (product) => {
    const token = localStorage.getItem('token');
    try {
      const response = await axios.put(`http://localhost:5000/api/products/${product._id}`, product, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      alert('Product updated successfully!');
      setEditProduct(null);
      setProducts((prevProducts) =>
        prevProducts.map((p) => (p._id === product._id ? response.data : p))
      );
    } catch (error) {
      console.error('Error updating product:', error);
      alert('Failed to update product.');
    }
  };

  // Delete a product
  const deleteProduct = async (productId) => {
    const token = localStorage.getItem('token');
    try {
      await axios.delete(`http://localhost:5000/api/products/${productId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      alert('Product deleted successfully!');
      setProducts((prevProducts) => prevProducts.filter((product) => product._id !== productId));
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product.');
    }
  };

  return (
    <div className="view-products-page">
      <h2>Your Products</h2>
      <div className="products-container">
        {products.map((product) => (
          <div key={product._id} className="product-card">
            <h3>{product.name}</h3>
            <p>Price: ₹{product.price}</p>
            <p>Quantity: {product.quantity} {product.unit}</p>
            <button onClick={() => fetchBids(product._id)}>View Bids</button>
            <button onClick={() => setEditProduct(product)}>Edit</button>
            <button onClick={() => deleteProduct(product._id)}>Delete</button>
          </div>
        ))}
      </div>

      {editProduct && (
        <div className="edit-product-form">
          <h3>Edit Product</h3>
          <input
            type="text"
            value={editProduct.name}
            onChange={(e) => setEditProduct({ ...editProduct, name: e.target.value })}
          />
          <input
            type="number"
            value={editProduct.price}
            onChange={(e) => setEditProduct({ ...editProduct, price: e.target.value })}
          />
          <input
            type="number"
            value={editProduct.quantity}
            onChange={(e) => setEditProduct({ ...editProduct, quantity: e.target.value })}
          />
          <input
            type="text"
            value={editProduct.unit}
            onChange={(e) => setEditProduct({ ...editProduct, unit: e.target.value })}
          />
          <button onClick={() => updateProduct(editProduct)}>Save</button>
          <button onClick={() => setEditProduct(null)}>Cancel</button>
        </div>
      )}

      {bids.length > 0 && (
        <div className="bids-container">
          <h3>Bids for Product</h3>
          {bids.map((bid) => (
            <div key={bid._id} className="bid-card">
              <p>Bid Amount: ₹{bid.amount}</p>
              <p>Buyer: {bid.buyerId?.name || 'Unknown'}</p>
              <button onClick={() => selectWinningBid(bid._id)}>Select as Winning Bid</button>
              <button onClick={() => viewBuyerDetails(bid.buyerId?._id)}>View Buyer Details</button>
            </div>
          ))}
        </div>
      )}

      {buyerDetails && buyerDetails.length > 0 && (
        <div className="buyer-details-container">
          <h3>Buyer Details</h3>
          {buyerDetails.map((buyer) => (
            <div key={buyer._id} className="buyer-details-card">
              <p><strong>Name:</strong> {buyer.buyerId?.name || buyer.name || 'N/A'}</p>
              <p><strong>Email:</strong> {buyer.buyerId?.email || buyer.email || 'N/A'}</p>
              <p><strong>Phone:</strong> {buyer.phone || 'N/A'}</p>
              <p><strong>Location:</strong> {buyer.location || 'N/A'}</p>
              <p><strong>Address:</strong> {buyer.address || 'N/A'}</p>
            </div>
          ))}
          <button onClick={() => setBuyerDetails(null)}>Close</button>
        </div>
      )}
    </div>
  );
}

export default ViewProductsPage;
