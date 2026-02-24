/**
 * Spare Return Requests Component
 * Displays and manages spare return requests from technicians
 * Handles receiving returns and tracking inventory changes
 */

import React, { useState, useEffect } from 'react';
import { spareReturnManagementService } from '../services/spareReturnManagementService';
import './SpareReturnRequests.css';

const SpareReturnRequests = () => {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [processingReturn, setProcessingReturn] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  // Get token from localStorage
  const token = localStorage.getItem('token');
  const serviceCenterId = localStorage.getItem('serviceCenterId');

  // Fetch pending return requests
  useEffect(() => {
    if (token) {
      fetchReturnRequests();
    }
  }, [token]);

  const fetchReturnRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await spareReturnManagementService.getReturnRequests('pending', token);
      // Handle API response format: { success: true, data: [...], count: ... }
      const returnsList = data.data || data.requests || data || [];
      setReturns(Array.isArray(returnsList) ? returnsList : []);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching returns:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectReturn = (returnRequest) => {
    setSelectedReturn(returnRequest);
    setSuccessMessage(null);
  };

  const handleReceiveReturn = async (returnRequest) => {
    try {
      setProcessingReturn(true);
      setError(null);

      // Prepare items data from request
      const receivedItems = returnRequest.items.map(item => ({
        sku: item.sku,
        spareName: item.spare_name,
        receivedQty: item.requested_qty || 0
      }));

      // Call receive endpoint
      const response = await spareReturnManagementService.receiveReturn(
        returnRequest.request_id,
        { receivedItems },
        token
      );

      // Show success message
      setSuccessMessage(`✅ Return #${returnRequest.request_id} received successfully!`);
      
      // Update local state
      setReturns(returns.filter(r => r.request_id !== returnRequest.request_id));
      setSelectedReturn(null);

      // Refresh list after 2 seconds
      setTimeout(() => {
        fetchReturnRequests();
        setSuccessMessage(null);
      }, 2000);
    } catch (err) {
      setError(`Failed to receive return: ${err.message}`);
      console.error('Error:', err);
    } finally {
      setProcessingReturn(false);
    }
  };

  if (!token) {
    return (
      <div className="spare-return-container">
        <div className="error-banner">
          <div className="error-icon">❌</div>
          <p>Authentication required. Please log in again.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="spare-return-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading return requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="spare-return-container">
      <div className="page-header">
        <h1>📦 Spare Return Requests</h1>
        <p>Manage technician equipment returns and track inventory changes</p>
      </div>

      {successMessage && (
        <div className="success-banner">
          <div className="success-icon">✨</div>
          <p>{successMessage}</p>
        </div>
      )}

      {error && (
        <div className="error-banner">
          <div className="error-icon">❌</div>
          <p>{error}</p>
          <button onClick={fetchReturnRequests} className="retry-btn">Retry</button>
        </div>
      )}

      <div className="returns-layout">
        {/* Left: Return Requests List */}
        <div className="returns-list-section">
          <div className="section-header">
            <h2>Pending Returns</h2>
            <span className="count-badge">{returns.length}</span>
          </div>

          {returns.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <h3>No pending returns</h3>
              <p>All returns have been processed or no returns are pending</p>
            </div>
          ) : (
            <div className="returns-list">
              {returns.map((returnReq) => (
                <div
                  key={returnReq.request_id}
                  className={`return-card ${selectedReturn?.request_id === returnReq.request_id ? 'active' : ''}`}
                  onClick={() => handleSelectReturn(returnReq)}
                >
                  <div className="card-header">
                    <span className="return-id">#{returnReq.request_id}</span>
                    <span className={`status-badge status-${returnReq.status}`}>
                      {returnReq.status || 'Pending'}
                    </span>
                  </div>

                  <div className="card-info">
                    <div className="info-row">
                      <span className="icon">👤</span>
                      <div className="info-text">
                        <small>Technician</small>
                        <strong>{returnReq.technician_name}</strong>
                      </div>
                    </div>

                    <div className="info-row">
                      <span className="icon">📅</span>
                      <div className="info-text">
                        <small>Date</small>
                        <strong>{new Date(returnReq.created_at).toLocaleDateString()}</strong>
                      </div>
                    </div>

                    <div className="info-row">
                      <span className="icon">📦</span>
                      <div className="info-text">
                        <small>Items</small>
                        <strong>{returnReq.item_count} items</strong>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Details & Actions */}
        <div className="return-details-section">
          {selectedReturn ? (
            <>
              <div className="details-header">
                <h3>Return Details</h3>
                <span className="return-number">Request #{selectedReturn.request_id}</span>
              </div>

              <div className="details-content">
                {/* Technician Info */}
                <div className="detail-group">
                  <h4>📋 Request Information</h4>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <label>Technician</label>
                      <span>{selectedReturn.technician_name}</span>
                    </div>
                    <div className="detail-item">
                      <label>Service Center</label>
                      <span>SC-{selectedReturn.service_center_id}</span>
                    </div>
                    <div className="detail-item">
                      <label>Request Type</label>
                      <span>Equipment Return</span>
                    </div>
                    <div className="detail-item">
                      <label>Date Created</label>
                      <span>{new Date(selectedReturn.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Items List */}
                <div className="detail-group">
                  <h4>📦 Items Being Returned ({selectedReturn.item_count})</h4>
                  <div className="items-table">
                    <div className="table-header">
                      <div className="col-item">Item</div>
                      <div className="col-qty">Qty</div>
                      <div className="col-status">Status</div>
                    </div>
                    {selectedReturn.items && selectedReturn.items.length > 0 ? (
                      selectedReturn.items.map((item, idx) => (
                        <div key={idx} className="table-row">
                          <div className="col-item">
                            <div className="item-name">{item.spare_name}</div>
                            <div className="item-sku">{item.sku}</div>
                          </div>
                          <div className="col-qty">{item.requested_qty || 0}</div>
                          <div className="col-status">
                            <span className="status-dot pending"></span>
                            Awaiting Receipt
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="table-row empty">
                        <p>No items found</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="action-buttons">
                  <button
                    className="btn btn-primary btn-large"
                    onClick={() => handleReceiveReturn(selectedReturn)}
                    disabled={processingReturn}
                  >
                    {processingReturn ? (
                      <>
                        <span className="spinner-small"></span>
                        Processing...
                      </>
                    ) : (
                      <>
                        <span className="btn-icon">✓</span>
                        Receive Return
                      </>
                    )}
                  </button>

                  <button
                    className="btn btn-secondary"
                    onClick={() => setSelectedReturn(null)}
                    disabled={processingReturn}
                  >
                    Cancel
                  </button>
                </div>

                {/* Inventory Impact Info */}
                <div className="info-box">
                  <h4>💡 What happens when you receive this return?</h4>
                  <ul>
                    <li>✓ Service center inventory will be updated (+items)</li>
                    <li>✓ Technician inventory will be updated (-items)</li>
                    <li>✓ Stock movement record created for audit trail</li>
                    <li>✓ Defective items tracked separately</li>
                  </ul>
                </div>
              </div>
            </>
          ) : (
            <div className="no-selection">
              <div className="icon">👈</div>
              <h3>Select a return request</h3>
              <p>Click on a return request to view details and process receipt</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SpareReturnRequests;
