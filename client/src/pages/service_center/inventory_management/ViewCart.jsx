import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getApiUrl } from '../../../config/apiConfig';
import './ViewCart.css';

export default function ViewCart() {
  const navigate = useNavigate();
  const location = useLocation();
  const { cart = [], returnType = '' } = location.state || {};
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const token = localStorage.getItem('token');
  const getCenterId = () => {
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.centerId;
    } catch (e) {
      return null;
    }
  };

  const centerId = getCenterId();

  // Calculate totals
  const totalItems = cart.length;
  const totalQty = cart.reduce((sum, item) => sum + (item.returnQty || 0), 0);

  // Handle submit
  const handleSubmit = async () => {
    if (!returnType) {
      setError('Please select a return type');
      return;
    }

    if (cart.length === 0) {
      setError('Cart is empty');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(getApiUrl('/spare-returns/create'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          items: cart.map(item => ({
            spareId: item.sparePartId || item.spare_id || item.id,
            returnQty: item.returnQty,
            remainingQty: item.remainingQty || 0
          })),
          returnType,
          centerId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create return request');
      }

      const data = await response.json();
      setSuccess(`Return request created successfully!`);
      
      setTimeout(() => {
        navigate('/service-center/dashboard');
      }, 2000);
    } catch (err) {
      console.error('Error creating return request:', err);
      setError(err.message || 'Failed to create return request');
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  if (cart.length === 0) {
    return (
      <div className="view-cart-container">
        <div className="empty-cart">
          <h2>Cart is Empty</h2>
          <p>No items in your return cart. Please add items first.</p>
          <button className="btn btn-primary" onClick={handleGoBack}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="view-cart-container">
      <h1>View Cart</h1>

      {error && (
        <div className="alert alert-error">
          {error}
          <button onClick={() => setError('')}>&times;</button>
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          {success}
        </div>
      )}

      {/* Cart Table */}
      <div className="cart-section">
        <div className="table-wrapper">
          <table className="cart-table">
            <thead>
              <tr>
                <th>Part Code</th>
                <th>Part Description</th>
                <th>Remaining QTY</th>
                <th>Return QTY</th>
                <th>Amount (Rs)</th>
              </tr>
            </thead>
            <tbody>
              {cart.map((item, index) => (
                <tr key={index}>
                  <td>{item.PART || 'N/A'}</td>
                  <td>{item.DESCRIPTION || 'Unknown'}</td>
                  <td>{item.remainingQty || item.currentQty || 0}</td>
                  <td>{item.returnQty || 0}</td>
                  <td>-</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="totals-section">
          <div className="total-row">
            <span>Total Items:</span>
            <span>{totalItems}</span>
          </div>
          <div className="total-row">
            <span>Total Quantity:</span>
            <span>{totalQty}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="action-buttons">
        <button 
          className="btn btn-secondary" 
          onClick={handleGoBack}
          disabled={loading}
        >
          Add More Items
        </button>
        <button 
          className="btn btn-primary" 
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? 'Submitting...' : 'Submit'}
        </button>
      </div>
    </div>
  );
}
