import React from 'react';
import './RentalReturn.css';

const VerifyReturnForm = ({
  returnRequest,
  onVerify,
  onBack,
  loading,
  error
}) => {
  if (!returnRequest) {
    return <div className="loading">Loading return request details...</div>;
  }

  const totalQty = returnRequest.items?.reduce((sum, item) => sum + (item.approvedQty || item.requestedQty), 0) || 0;

  return (
    <div className="return-approval-form">
      <div className="form-header">
        <button className="btn btn-secondary back-btn" onClick={onBack} disabled={loading}>
          <span className="btn-icon">←</span>
          Back to Requests
        </button>
        <div className="header-content">
          <h2>Verify Return Request</h2>
          <p className="request-id">Request #{returnRequest.id}</p>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <span className="error-icon">❌</span>
          <span className="error-text">{error}</span>
        </div>
      )}

      <div className="approval-container">
        {/* Request Details */}
        <div className="approval-section">
          <h3>📋 Request Details</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <label>Technician</label>
              <div className="form-value value-highlight">{returnRequest.technicianName}</div>
            </div>
            <div className="detail-item">
              <label>Technician ID</label>
              <div className="form-value">{returnRequest.technicianId}</div>
            </div>
            <div className="detail-item">
              <label>Status</label>
              <div className="form-value status-badge">{returnRequest.status}</div>
            </div>
            <div className="detail-item">
              <label>Submitted Date</label>
              <div className="form-value">
                {new Date(returnRequest.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Items to Verify */}
        <div className="approval-section">
          <h3>📦 Items to Verify ({returnRequest.itemCount || returnRequest.items?.length || 0} items)</h3>
          <div className="items-table">
            <table>
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Part Name</th>
                  <th>Requested Qty</th>
                  <th>Approved Qty</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {returnRequest.items && returnRequest.items.length > 0 ? (
                  returnRequest.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="sku-cell">{item.sku || 'N/A'}</td>
                      <td>{item.name || item.description || 'N/A'}</td>
                      <td className="qty-cell">{item.requestedQty}</td>
                      <td className="qty-cell font-bold">{item.approvedQty || item.requestedQty}</td>
                      <td>
                        <span className="badge badge-approved">
                          ✓ {item.approvedQty || item.requestedQty}/{item.requestedQty}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="empty-row">
                      No items found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="items-summary">
              <span>Total Items to Verify:</span>
              <strong>{totalQty} units</strong>
            </div>
          </div>
        </div>

        {/* Verification Info */}
        <div className="approval-section">
          <h3>✓ Verification Information</h3>
          <div className="info-box">
            <p>
              <strong>Ready to verify?</strong> Click the verify button to:
            </p>
            <ul>
              <li>✓ Confirm all quantities are correct</li>
              <li>✓ Create goods movement items for tracking</li>
              <li>✓ Update service center inventory</li>
              <li>✓ Mark return as verified and completed</li>
            </ul>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="approval-actions">
          <button
            className="btn btn-secondary"
            onClick={onBack}
            disabled={loading}
          >
            ← Cancel
          </button>
          <button
            className="btn btn-primary btn-approve"
            onClick={onVerify}
            disabled={loading}
            style={{ backgroundColor: '#4CAF50' }}
          >
            {loading ? (
              <>
                <span className="btn-loader">⏳</span> Verifying...
              </>
            ) : (
              <>
                <span className="btn-icon">✓</span> Verify Return & Update Inventory
              </>
            )}
          </button>
        </div>
      </div>

      <style jsx>{`
        .info-box {
          background-color: #f5f5f5;
          border-left: 4px solid #4CAF50;
          padding: 16px;
          border-radius: 4px;
          color: #555;
        }

        .info-box ul {
          margin: 12px 0 0 20px;
          padding-left: 0;
        }

        .info-box li {
          margin-bottom: 8px;
          color: #666;
        }

        .font-bold {
          font-weight: bold;
          color: #2196F3;
        }
      `}</style>
    </div>
  );
};

export default VerifyReturnForm;
