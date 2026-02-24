import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './ViewSpareReturnRequest.css';

export default function ViewSpareReturnRequest() {
  const navigate = useNavigate();
  const [returnRequests, setReturnRequests] = useState([]);
  const [selectedRequestId, setSelectedRequestId] = useState('');
  const [requestDetails, setRequestDetails] = useState(null);
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
      console.error('Error decoding token:', e);
      return null;
    }
  };

  const centerId = getCenterId();

  if (!centerId) {
    return (
      <div className="error-message">
        Please log in as a service center user to access this page.
      </div>
    );
  }

  // Fetch list of return requests
  useEffect(() => {
    fetchReturnRequests();
  }, []);

  const fetchReturnRequests = async () => {
    setLoading(true);
    setError('');
    try {
      console.log('🔄 Fetching return requests...');
      const response = await fetch('/api/spare-returns/list', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch return requests');
      }

      const data = await response.json();
      console.log('✅ Got return requests:', data);
      setReturnRequests(data.requests || []);

      if (data.requests && data.requests.length === 0) {
        setError('No return requests found. Create one first.');
      }
    } catch (err) {
      console.error('❌ Error fetching return requests:', err);
      setError(`Failed to connect to server: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch details of selected request
  useEffect(() => {
    if (selectedRequestId) {
      fetchRequestDetails(selectedRequestId);
    } else {
      setRequestDetails(null);
    }
  }, [selectedRequestId]);

  const fetchRequestDetails = async (requestId) => {
    setLoading(true);
    setError('');
    try {
      console.log(`📋 Fetching details for request: ${requestId}`);
      const response = await fetch(`/api/spare-returns/view/${requestId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch request details');
      }

      const data = await response.json();
      console.log('✅ Got request details:', data);
      setRequestDetails(data.request);
    } catch (err) {
      console.error('❌ Error fetching request details:', err);
      setError(`Failed to fetch request details: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintChallan = () => {
    if (!selectedRequestId) {
      setError('Please select a return request first');
      return;
    }
    // Navigate to print challan page
    navigate(`/service-center/inventory/print-return-challan/${selectedRequestId}`);
  };

  const handleCreateNew = () => {
    navigate('/service-center/inventory/spare-part-return');
  };

  return (
    <div className="view-spare-return-container">
      <div className="page-header">
        <h1>Spare Return Request Management</h1>
        <p>View and print challans for submitted return requests</p>
      </div>

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

      <div className="main-content">
        {/* Left Section - Request List */}
        <div className="request-list-section">
          <h2>Select Return Request</h2>
          
          {loading && !returnRequests.length ? (
            <div className="loading-message">Loading return requests...</div>
          ) : returnRequests.length === 0 ? (
            <div className="empty-message">
              <p>No return requests found.</p>
              <button className="btn btn-primary" onClick={handleCreateNew}>
                Create New Return Request
              </button>
            </div>
          ) : (
            <div className="request-dropdown-section">
              <label htmlFor="requestSelect">Spare Part Return Request No.:</label>
              <select
                id="requestSelect"
                value={selectedRequestId}
                onChange={(e) => setSelectedRequestId(e.target.value)}
                className="request-select"
              >
                <option value="">-- Select a Return Request --</option>
                {returnRequests.map(request => (
                  <option key={request.requestId} value={request.requestId}>
                    {request.requestNumber} ({request.status}) - {new Date(request.createdAt).toLocaleDateString()}
                  </option>
                ))}
              </select>
              <p className="request-count">Total Requests: {returnRequests.length}</p>
            </div>
          )}
        </div>

        {/* Right Section - Request Details */}
        {requestDetails && (
          <div className="request-details-section">
            <h2>Request Details</h2>
            
            <div className="detail-card">
              <div className="detail-row">
                <label>Request Number:</label>
                <span className="value">{requestDetails.requestNumber}</span>
              </div>

              <div className="detail-row">
                <label>Status:</label>
                <span className={`value status-${requestDetails.status.toLowerCase()}`}>
                  {requestDetails.status}
                </span>
              </div>

              <div className="detail-row">
                <label>Created Date:</label>
                <span className="value">{new Date(requestDetails.createdAt).toLocaleDateString()}</span>
              </div>

              <div className="detail-row">
                <label>Total Items:</label>
                <span className="value">{requestDetails.items?.length || 0}</span>
              </div>

              <div className="detail-row">
                <label>Total Quantity:</label>
                <span className="value">{requestDetails.totalQty}</span>
              </div>

              {requestDetails.items && requestDetails.items.length > 0 && (
                <div className="items-section">
                  <h3>Items in Request</h3>
                  <table className="items-table">
                    <thead>
                      <tr>
                        <th>Part Code</th>
                        <th>Description</th>
                        <th>Return Qty</th>
                        <th>Approved Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requestDetails.items.map((item, index) => (
                        <tr key={index}>
                          <td>{item.partCode}</td>
                          <td>{item.partDescription}</td>
                          <td>{item.returnQty}</td>
                          <td>{item.approvedQty || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="action-buttons">
                <button className="btn btn-primary" onClick={handlePrintChallan}>
                  Print Challan
                </button>
                <button className="btn btn-secondary" onClick={handleCreateNew}>
                  Create New Request
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
