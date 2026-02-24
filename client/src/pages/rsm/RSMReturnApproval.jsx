import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './RSMReturnApproval.css';

export default function RSMReturnApproval() {
  const navigate = useNavigate();
  const [pendingReturns, setPendingReturns] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [approvalQtys, setApprovalQtys] = useState({});
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const token = localStorage.getItem('token');
  const [selectedPlant, setSelectedPlant] = useState(null);
  const [plants, setPlants] = useState([]);

  // Fetch RSM's assigned plants first
  useEffect(() => {
    const fetchPlants = async () => {
      try {
        console.log('[RSMReturnApproval] Fetching assigned plants...');
        const response = await fetch('/api/branch/assigned-plants', {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('[RSMReturnApproval] Plants response status:', response.status);
        
        const data = await response.json();
        console.log('[RSMReturnApproval] Plants data:', data);
        
        if (data.ok && data.plants && data.plants.length > 0) {
          setPlants(data.plants);
          // Auto-select first plant
          setSelectedPlant(data.plants[0].plant_id);
          console.log('[RSMReturnApproval] Auto-selected plant:', data.plants[0].plant_id);
        } else {
          setError('No plants assigned to your RSM account');
        }
      } catch (err) {
        console.error('[RSMReturnApproval] Error fetching plants:', err);
        setError(`Error loading plants: ${err.message}`);
      }
    };

    if (token) {
      console.log('[RSMReturnApproval] Token available, fetching plants...');
      fetchPlants();
    } else {
      setError('No authentication token found. Please log in.');
    }
  }, [token]);

  // Fetch pending return requests
  useEffect(() => {
    const fetchPendingReturns = async () => {
      if (!selectedPlant) {
        console.log('[RSMReturnApproval] No plant selected yet, skipping pending returns fetch');
        return;
      }
      
      setLoading(true);
      try {
        console.log('[RSMReturnApproval] Fetching pending returns for plant:', selectedPlant);
        const url = `/api/spare-returns/pending-approval?plant_id=${selectedPlant}`;
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` }
        });

        console.log('[RSMReturnApproval] Pending returns response status:', response.status);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const data = await response.json();
        console.log('[RSMReturnApproval] Pending returns data:', data);
        setPendingReturns(data.requests || []);
        if (data.requests && data.requests.length > 0) {
          setError(''); // Clear any previous errors
        }
      } catch (err) {
        console.error('[RSMReturnApproval] Error fetching pending returns:', err);
        setError(`Error loading returns: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchPendingReturns();
  }, [token, selectedPlant]);

  // Handle item quantity change
  const handleQtyChange = (itemId, qty) => {
    setApprovalQtys(prev => ({
      ...prev,
      [itemId]: parseInt(qty) || 0
    }));
  };

  // Handle approval submission
  const handleApprove = async () => {
    if (!selectedRequest) {
      setError('No request selected');
      return;
    }

    setSubmitting(true);
    try {
      // Validate quantities
      const items = selectedRequest.items.map(item => ({
        itemId: item.id,
        sendQty: item.returnQty,
        receiveQty: approvalQtys[item.id] || item.returnQty
      }));

      const response = await fetch('/api/spare-returns/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          requestId: selectedRequest.requestId,
          approvalData: { items }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to approve return');
      }

      const data = await response.json();
      setSuccess(`Return request approved successfully!`);
      setSelectedRequest(null);
      setApprovalQtys({});

      // Refresh the list
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err) {
      console.error('Error approving return:', err);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle rejection submission
  const handleReject = async () => {
    if (!selectedRequest) {
      setError('No request selected');
      return;
    }

    if (!rejectReason.trim()) {
      setError('Please provide a rejection reason');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/spare-returns/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          requestId: selectedRequest.requestId,
          rejectReason: rejectReason
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reject return');
      }

      const data = await response.json();
      setSuccess(`Return request rejected successfully!`);
      setSelectedRequest(null);
      setApprovalQtys({});
      setRejectReason('');
      setShowRejectModal(false);

      // Refresh the list
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err) {
      console.error('Error rejecting return:', err);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectRequest = (request) => {
    setSelectedRequest(request);
    setApprovalQtys({});
    setRejectReason('');
    setShowRejectModal(false);
    // Initialize with send quantities
    const initialQtys = {};
    request.items.forEach(item => {
      initialQtys[item.id] = item.returnQty;
    });
    setApprovalQtys(initialQtys);
  };

  const openRejectModal = () => {
    setShowRejectModal(true);
    setRejectReason('');
  };

  const closeRejectModal = () => {
    setShowRejectModal(false);
    setRejectReason('');
  };

  return (
    <div className="rsm-return-approval-container">
      <h1>Spare Part Return Requests - RSM Approval</h1>

      {error && (
        <div className="alert alert-error">
          <strong>Error:</strong> {error}
          <button onClick={() => setError('')}>&times;</button>
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <strong>Success:</strong> {success}
        </div>
      )}

      {/* Plant Selector */}
      {plants.length === 0 ? (
        <div className="loading">Loading plant information...</div>
      ) : (
        <div className="plant-selector">
          <label>Select Plant/Branch: </label>
          <select 
            value={selectedPlant || ''} 
            onChange={(e) => setSelectedPlant(parseInt(e.target.value))}
          >
            <option value="">-- Select Plant --</option>
            {plants.map(plant => (
              <option key={plant.plant_id} value={plant.plant_id}>
                {plant.plant_name}
              </option>
            ))}
          </select>
          {selectedPlant && (
            <span className="plant-info">
              ✓ Plant Selected: {plants.find(p => p.plant_id === selectedPlant)?.plant_name}
            </span>
          )}
        </div>
      )}

      <div className="approval-layout">
        {/* Left Side - Pending Returns List */}
        <div className="pending-requests-section">
          <h2>Pending Return Requests ({pendingReturns.length})</h2>

          {loading ? (
            <div className="loading">Loading pending returns...</div>
          ) : pendingReturns.length === 0 ? (
            <div className="empty-message">No pending return requests</div>
          ) : (
            <div className="requests-list">
              {pendingReturns.map(request => (
                <div
                  key={request.requestId}
                  className={`request-card ${selectedRequest?.requestId === request.requestId ? 'active' : ''}`}
                  onClick={() => handleSelectRequest(request)}
                >
                  <div className="request-header">
                    <div className="request-id">{request.requestNumber}</div>
                    <div className="request-status">{request.status}</div>
                  </div>
                  <div className="request-info">
                    <p><strong>Service Center:</strong> {request.serviceCenterName}</p>
                    <p><strong>Items:</strong> {request.itemCount}</p>
                    <p><strong>Created:</strong> {new Date(request.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Side - Details & Approval */}
        <div className="approval-details-section">
          {selectedRequest ? (
            <>
              <div className="details-header">
                <h2>{selectedRequest.requestNumber}</h2>
                <p className="service-center">From: {selectedRequest.serviceCenterName}</p>
              </div>

              {/* Items Table */}
              <div className="items-section">
                <h3>Return Items for Approval</h3>
                <div className="table-wrapper">
                  <table className="approval-table">
                    <thead>
                      <tr>
                        <th>Part Code</th>
                        <th>Description</th>
                        <th>Send QTY</th>
                        <th>Receive QTY</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedRequest.items.map(item => (
                        <tr key={item.id}>
                          <td>{item.partCode}</td>
                          <td>{item.partDescription}</td>
                          <td><span className="send-qty">{item.returnQty}</span></td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              max={item.returnQty}
                              value={approvalQtys[item.id] || item.returnQty}
                              onChange={(e) => handleQtyChange(item.id, e.target.value)}
                              className="qty-input"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div className="totals-section">
                <div className="total-item">
                  <span>Total Items:</span>
                  <span>{selectedRequest.itemCount}</span>
                </div>
                <div className="total-item">
                  <span>Total Send Qty:</span>
                  <span>{selectedRequest.items.reduce((sum, item) => sum + item.returnQty, 0)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="action-buttons">
                <button 
                  className="btn btn-secondary" 
                  onClick={() => setSelectedRequest(null)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button 
                  className="btn btn-danger" 
                  onClick={openRejectModal}
                  disabled={submitting}
                >
                  Reject Request
                </button>
                <button 
                  className="btn btn-primary" 
                  onClick={handleApprove}
                  disabled={submitting}
                >
                  {submitting ? 'Processing...' : 'Approve & Create Stock Movement'}
                </button>
              </div>

              {/* Rejection Reason Modal */}
              {showRejectModal && (
                <div className="modal-overlay">
                  <div className="modal-content">
                    <div className="modal-header">
                      <h3>Reject Return Request</h3>
                      <button 
                        className="modal-close" 
                        onClick={closeRejectModal}
                        disabled={submitting}
                      >
                        ×
                      </button>
                    </div>
                    <div className="modal-body">
                      <p className="request-info">
                        You are about to reject return request: <strong>{selectedRequest.requestNumber}</strong>
                      </p>
                      <div className="form-group">
                        <label htmlFor="rejectReason">Rejection Reason: *</label>
                        <textarea
                          id="rejectReason"
                          className="rejection-textarea"
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder="Please provide a reason for rejection..."
                          rows="4"
                          disabled={submitting}
                        />
                      </div>
                    </div>
                    <div className="modal-footer">
                      <button 
                        className="btn btn-secondary" 
                        onClick={closeRejectModal}
                        disabled={submitting}
                      >
                        Cancel
                      </button>
                      <button 
                        className="btn btn-danger" 
                        onClick={handleReject}
                        disabled={submitting || !rejectReason.trim()}
                      >
                        {submitting ? 'Rejecting...' : 'Confirm Rejection'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="no-selection">
              <p>Select a return request to view and approve/reject details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
