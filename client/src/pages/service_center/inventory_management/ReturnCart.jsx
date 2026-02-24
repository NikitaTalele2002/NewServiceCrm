import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './ReturnCart.css';

export default function ReturnCart() {
  const { requestId } = useParams();
  const navigate = useNavigate();
  
  const [returnCart, setReturnCart] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [creatingChallan, setCreatingChallan] = useState(false);

  const token = localStorage.getItem('token');

  // Fetch return cart details
  useEffect(() => {
    const fetchReturnCart = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/spare-returns/return-cart/${requestId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch return cart');
        }

        const data = await response.json();
        setReturnCart(data.returnCart);
      } catch (err) {
        console.error('Error fetching return cart:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (requestId && token) {
      fetchReturnCart();
    }
  }, [requestId, token]);

  // Handle create challan
  const handleCreateChallan = async () => {
    if (!returnCart) {
      setError('Return cart data not loaded');
      return;
    }

    setCreatingChallan(true);
    try {
      const response = await fetch('/api/spare-returns/create-challan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          requestId: returnCart.requestId,
          challanData: {
            challanDate: new Date()
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create challan');
      }

      const data = await response.json();
      navigate(`/service-center/print-challan/${data.challan.logisticsDocId}`);
    } catch (err) {
      console.error('Error creating challan:', err);
      setError(err.message);
    } finally {
      setCreatingChallan(false);
    }
  };

  if (loading) {
    return (
      <div className="return-cart-container">
        <div className="loading">Loading return cart...</div>
      </div>
    );
  }

  if (!returnCart) {
    return (
      <div className="return-cart-container">
        <div className="error-message">
          {error || 'Return cart not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="return-cart-container">
      <h1>Return Cart</h1>

      {error && (
        <div className="alert alert-error">
          {error}
          <button onClick={() => setError('')}>&times;</button>
        </div>
      )}

      {/* Header Section */}
      <div className="header-section">
        <div className="header-field">
          <label>Spare Part Return Request No. :</label>
          <div className="field-value">{returnCart.requestNumber}</div>
        </div>
        <div className="header-field">
          <label>Service Center:</label>
          <div className="field-value">{returnCart.serviceCenterName}</div>
        </div>
      </div>

      {/* Items Table */}
      <div className="items-section">
        <div className="table-wrapper">
          <table className="return-cart-table">
            <thead>
              <tr>
                <th>Part Code</th>
                <th>Part Description</th>
                <th>Return QTY</th>
                <th>Invoice No.</th>
                <th>Invoice Date</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {returnCart.items.map((item, index) => (
                <tr key={index}>
                  <td>{item.partCode}</td>
                  <td>{item.partDescription}</td>
                  <td>{item.receivedQty}</td>
                  <td>-</td>
                  <td>-</td>
                  <td>{item.totalAmount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="totals-section">
          <div className="total-row">
            <span>Total</span>
            <span>{returnCart.totals.quantity}</span>
            <span>{returnCart.totals.amount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="action-buttons">
        <button 
          className="btn btn-secondary" 
          onClick={() => navigate(-1)}
          disabled={creatingChallan}
        >
          Back
        </button>
        <button 
          className="btn btn-primary" 
          onClick={handleCreateChallan}
          disabled={creatingChallan}
        >
          {creatingChallan ? 'Creating Challan...' : 'Create & Print Challan'}
        </button>
      </div>
    </div>
  );
}
