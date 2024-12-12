import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './AddProductPage.css';

function AddProductsPage() {
  const [product, setProduct] = useState({
    name: '',
    price: '',
    quantity: '',
    video: null,
    category: '',
    unit: '',
    duration: '',
  });

  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Check if farmer details are filled
    const checkFarmerDetails = async () => {
      const token = localStorage.getItem('token'); // Get token from localStorage
      try {
        const response = await axios.get('http://localhost:5000/api/farmer/check-details', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        console.log(response.data.detailsFilled);
        if (!response.data.detailsFilled) {
          alert('Please fill in your details before adding a product.');
          navigate('/add-details'); // Redirect to Add Details page
        }
      } catch (err) {
        console.error('Error checking farmer details:', err);
        alert('Error verifying your details. Please try again.');
        navigate('/add-details'); // Redirect as fallback
      }
    };

    checkFarmerDetails();
  }, [navigate]);

  // Handle input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setProduct({ ...product, [name]: value });
  };

  // Handle file upload
  const handleFileChange = (e) => {
    setProduct({ ...product, video: e.target.files[0] });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!product.name || !product.price || !product.quantity || !product.category || !product.unit || !product.duration || !product.video) {
      setError('All fields are required, including the video file.');
      return;
    }

    const formData = new FormData();
    formData.append('name', product.name);
    formData.append('price', product.price);
    formData.append('quantity', product.quantity);
    formData.append('category', product.category);
    formData.append('unit', product.unit);
    formData.append('duration', product.duration);
    formData.append('video', product.video);

    const token = localStorage.getItem('token'); // Get the token from localStorage

    try {
      const response = await axios.post('http://localhost:5000/api/products/add-product', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      alert(response.data.message || 'Product added successfully!');
      navigate('/view-products'); // Redirect to products page
    } catch (err) {
      console.error('Error adding product:', err);
      alert(err.response?.data?.message || 'Failed to add product.');
    }
  };

  return (
    <div className="add-products-page">
      <h2>Add Product</h2>
      {error && <div className="error-message">{error}</div>}
      <form onSubmit={handleSubmit}>
      <div className="form-group">
          <label htmlFor="category">Category</label>
          <select
            id="category"
            name="category"
            value={product.category}
            onChange={handleChange}
          >
            <option value="" disabled>
              Select Category
            </option>
            <option value="Rice">Rice</option>
            <option value="Wheat">Wheat</option>
            <option value="Millets">Millets</option>
            <option value="Coconut">Coconut</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="name">Variety</label>
          <input
            type="text"
            id="name"
            name="name"
            placeholder="Enter Variety name"
            value={product.name}
            onChange={handleChange}
          />
        </div>
        <div className="form-group">
          <label htmlFor="price">Price</label>
          <input
            type="number"
            id="price"
            name="price"
            placeholder="Enter price"
            value={product.price}
            onChange={handleChange}
          />
        </div>
        <div className="form-group">
          <label htmlFor="quantity">Quantity</label>
          <input
            type="number"
            id="quantity"
            name="quantity"
            placeholder="Enter quantity"
            value={product.quantity}
            onChange={handleChange}
          />
        </div>
        
        <div className="form-group">
          <label>Unit</label>
          <div className="radio-group">
            <label>
              <input
                type="radio"
                name="unit"
                value="kg"
                checked={product.unit === 'kg'}
                onChange={handleChange}
              />
              Kilograms (kg)
            </label>
            <label>
              <input
                type="radio"
                name="unit"
                value="number"
                checked={product.unit === 'number'}
                onChange={handleChange}
              />
              Number
            </label>
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="duration">Duration (in days)</label>
          <input
            type="number"
            id="duration"
            name="duration"
            placeholder="Enter duration in days"
            value={product.duration}
            onChange={handleChange}
          />
        </div>
        <div className="form-group">
          <label htmlFor="video">Upload Video</label>
          <input
            type="file"
            id="video"
            name="video"
            accept="video/*"
            onChange={handleFileChange}
          />
        </div>
        <button type="submit">Add Product</button>
      </form>
    </div>
  );
}

export default AddProductsPage;
