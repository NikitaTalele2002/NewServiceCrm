import React, { useState } from 'react';
import './RentalReturn.css';

const RentalReturnList = ({
  allocatedRequests,
  pendingReturns,
  onSelectRequest,
  onSelectReturn,
  loading,
  error,
  debugInfo
}) => {
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'allocated'

  if (loading) {
    return <div className="loading">Loading requests...</div>;
  }

  const displayRequests = activeTab === 'pending' ? (pendingReturns || []) : (allocatedRequests || []);
  const hasRequests = displayRequests && displayRequests.length > 0;

  return (
    <div className="rental-return-list">
      <div className="page-header">
        <h2>Return Management</h2>
        <p>Manage technician returns and rental allocations</p>
      </div>

      {/* Tab Navigation */}
      <div className="tabs-container">
        <button
          className={`tab ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          <span className="tab-icon">⏳</span>
          Pending Returns
          {pendingReturns && pendingReturns.length > 0 && (
            <span className="tab-badge">{pendingReturns.length}</span>
          )}
        </button>
        <button
          className={`tab ${activeTab === 'allocated' ? 'active' : ''}`}
          onClick={() => setActiveTab('allocated')}
        >
          <span className="tab-icon">📦</span>
          Allocated Requests
          {allocatedRequests && allocatedRequests.length > 0 && (
            <span className="tab-badge">{allocatedRequests.length}</span>
          )}
        </button>
      </div>

      {error && error.trim() && (
        <div className="error-container">
          <div className="error">❌ {error}</div>
          <p style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>Please check:
            <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
              <li>Network connection</li>
              <li>Authentication status</li>
              <li>API Server is running</li>
            </ul>
          </p>
        </div>
      )}

      {!hasRequests ? (
        <div className="empty-state">
          <div className="empty-icon">
            {activeTab === 'pending' ? '✓' : '📦'}
          </div>
          <h3>
            {activeTab === 'pending' 
              ? 'No pending return requests' 
              : 'No allocated requests found'}
          </h3>
          <p>
            {activeTab === 'pending'
              ? 'All technician returns have been processed or none are awaiting approval.'
              : 'All rental requests have been processed or none are currently allocated.'}
          </p>
          {debugInfo && (
            <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '4px', fontSize: '11px', textAlign: 'left', color: '#666' }}>
              <strong>Debug Info:</strong><br />
              {debugInfo}
            </div>
          )}
        </div>
      ) : (
        <div className="requests-grid">
          {displayRequests.map((request) => (
            <div key={request.id} className="request-card">
              <div className="request-header">
                <div className="request-id">
                  <span className="id-label">
                    {activeTab === 'pending' ? 'Return' : 'Request'}
                  </span>
                  <span className="id-number">#{request.id}</span>
                </div>
                <span className={`status status-${(request.status || 'pending').toLowerCase()}`}>
                  {request.status || 'Pending'}
                </span>
              </div>

              <div className="request-details">
                <div className="detail-row">
                  <span className="detail-icon">👤</span>
                  <div className="detail-content">
                    <span className="detail-label">Technician</span>
                    <span className="detail-value">
                      {request.technicianName || 'Technician'} 
                      {request.technicianId && ` (ID: ${request.technicianId})`}
                    </span>
                  </div>
                </div>

                {request.serviceCenterName && (
                  <div className="detail-row">
                    <span className="detail-icon">🏢</span>
                    <div className="detail-content">
                      <span className="detail-label">Service Center</span>
                      <span className="detail-value">{request.serviceCenterName}</span>
                    </div>
                  </div>
                )}

                <div className="detail-row">
                  <span className="detail-icon">📅</span>
                  <div className="detail-content">
                    <span className="detail-label">
                      {activeTab === 'pending' ? 'Submitted' : 'Allocated'} Date
                    </span>
                    <span className="detail-value">
                      {new Date(request.createdAt || request.allocatedDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                </div>

                <div className="detail-row">
                  <span className="detail-icon">📦</span>
                  <div className="detail-content">
                    <span className="detail-label">Items</span>
                    <span className="detail-value">{request.itemCount || 0} items</span>
                  </div>
                </div>
              </div>

              <button
                className={`btn btn-primary action-btn ${activeTab === 'pending' ? 'btn-approve' : ''}`}
                onClick={() => activeTab === 'pending' 
                  ? onSelectReturn(request) 
                  : onSelectRequest(request)}
              >
                {activeTab === 'pending' ? (
                  <>
                    <span className="btn-icon">✓</span>
                    Approve Return
                  </>
                ) : (
                  <>
                    <span className="btn-icon">↩️</span>
                    Process Return
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .tabs-container {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
          border-bottom: 2px solid #eee;
        }

        .tab {
          padding: 12px 20px;
          background: none;
          border: none;
          border-bottom: 3px solid transparent;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          color: #666;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
          margin-bottom: -2px;
        }

        .tab:hover {
          color: #333;
        }

        .tab.active {
          color: #0066cc;
          border-bottom-color: #0066cc;
        }

        .tab-icon {
          font-size: 16px;
        }

        .tab-badge {
          display: inline-block;
          background-color: #0066cc;
          color: white;
          border-radius: 12px;
          padding: 2px 8px;
          font-size: 12px;
          font-weight: 600;
          margin-left: 6px;
        }

        .btn-approve {
          background-color: #28a745;
        }

        .btn-approve:hover {
          background-color: #218838;
        }
      `}</style>
    </div>
  );
};

export default RentalReturnList;