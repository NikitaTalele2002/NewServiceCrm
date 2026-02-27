import React, { useState } from 'react';
import './RentalReturn.css';

const ReturnApprovalForm = ({
  returnRequest,
  approvalRemarks,
  onRemarksChange,
  onApprove,
  onApprovedQtysChange,
  onBack,
  loading,
  error
}) => {
  const [approvedQtys, setApprovedQtys] = useState(
    returnRequest?.items?.reduce((acc, item, idx) => {
      acc[idx] = item.approvedQty || item.requestedQty;
      return acc;
    }, {}) || {}
  );

  const handleQtyChange = (itemIdx, newQty) => {
    const qty = Math.max(0, Math.min(returnRequest.items[itemIdx].requestedQty, newQty));
    const updated = { ...approvedQtys, [itemIdx]: qty };
    setApprovedQtys(updated);
    if (onApprovedQtysChange) {
      onApprovedQtysChange(updated);
    }
  };

  const handleApproveClick = () => {
    onApprove(approvedQtys);
  };

  if (!returnRequest) {
    return <div className="loading">Loading return request details...</div>;
  }

  const totalQty = returnRequest.items?.reduce((sum, item) => sum + item.requestedQty, 0) || 0;
  const totalApprovedQty = Object.values(approvedQtys).reduce((sum, qty) => sum + qty, 0) || 0;

  return (
    <div className="return-approval-form">
      <div className="form-header">
        <button className="btn btn-secondary back-btn" onClick={onBack} disabled={loading}>
          <span className="btn-icon">←</span>
          Back to Requests
        </button>
        <div className="header-content">
          <h2>Approve Return Request</h2>
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

        {/* Items to Return */}
        <div className="approval-section">
          <h3>📦 Items to Return ({returnRequest.itemCount || 0} items)</h3>
          <div className="items-table">
            <table>
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Part Name</th>
                  <th>Requested Qty</th>
                  <th>Approved Qty</th>
                  <th>Actions</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {returnRequest.items && returnRequest.items.length > 0 ? (
                  returnRequest.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="sku-cell">{item.sku}</td>
                      <td>{item.name}</td>
                      <td className="qty-cell">{item.requestedQty}</td>
                      <td className="approved-qty-cell">
                        <div className="qty-input-group">
                          <input
                            type="number"
                            min="0"
                            max={item.requestedQty}
                            value={approvedQtys[idx] || 0}
                            onChange={(e) => handleQtyChange(idx, parseInt(e.target.value) || 0)}
                            className="qty-input"
                            disabled={loading}
                          />
                        </div>
                      </td>
                      <td className="actions-cell">
                        <div className="qty-buttons">
                          <button
                            className="btn-qty-adjust"
                            onClick={() => handleQtyChange(idx, (approvedQtys[idx] || 0) - 1)}
                            disabled={loading || (approvedQtys[idx] || 0) <= 0}
                            title="Decrease quantity"
                          >
                            −
                          </button>
                          <button
                            className="btn-qty-adjust"
                            onClick={() => handleQtyChange(idx, (approvedQtys[idx] || 0) + 1)}
                            disabled={loading || (approvedQtys[idx] || 0) >= item.requestedQty}
                            title="Increase quantity"
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td>
                        {approvedQtys[idx] > 0 ? (
                          <span className="badge badge-approved">
                            ✓ {approvedQtys[idx]}/{item.requestedQty}
                          </span>
                        ) : (
                          <span className="badge badge-pending">⏳ 0/{item.requestedQty}</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="empty-row">
                      No items found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="items-summary">
              <span>Total Items to Approve:</span>
              <strong>{totalApprovedQty} / {totalQty} units</strong>
              {totalApprovedQty < totalQty && (
                <span className="summary-warning">
                  ⚠️ {totalQty - totalApprovedQty} units not approved
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Approval Remarks */}
        <div className="approval-section">
          <h3>💬 Approval Remarks (Optional)</h3>
          <textarea
            value={approvalRemarks}
            onChange={(e) => onRemarksChange(e.target.value)}
            placeholder="Add any remarks about this return approval..."
            className="remarks-textarea"
            disabled={loading}
            rows="4"
          />
        </div>

        {/* Action Buttons */}
        <div className="approval-actions">
          <button
            className="btn btn-secondary"
            onClick={onBack}
            disabled={loading}
          >
            ← Cancel Approval
          </button>
          <button
            className="btn btn-primary btn-approve"
            onClick={handleApproveClick}
            disabled={loading || totalApprovedQty === 0}
          >
            {loading ? (
              <>
                <span className="btn-loader">⏳</span> Approving...
              </>
            ) : (
              <>
                <span className="btn-icon">✓</span> Approve Return Request ({totalApprovedQty} units)
              </>
            )}
          </button>
        </div>
      </div>

      <style jsx>{`
        .return-approval-form {
          max-width: 900px;
          margin: 0 auto;
        }

        .form-header {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 24px;
          position: relative;
        }

        .back-btn {
          flex-shrink: 0;
          padding: 8px 16px;
          background-color: #e0e0e0;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 4px;
        }

        .back-btn:hover:not(:disabled) {
          background-color: #d0d0d0;
        }

        .back-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .header-content h2 {
          margin: 0 0 4px 0;
          font-size: 24px;
          color: #333;
        }

        .request-id {
          color: #666;
          font-size: 14px;
        }

        .error-banner {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background-color: #fee;
          border: 1px solid #fcc;
          border-radius: 4px;
          margin-bottom: 20px;
          color: #c33;
        }

        .error-icon {
          font-size: 18px;
        }

        .error-text {
          font-size: 14px;
          flex: 1;
        }

        .approval-container {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .approval-section {
          background: white;
          border: 1px solid #ddd;
          border-radius: 6px;
          padding: 20px;
        }

        .approval-section h3 {
          margin: 0 0 16px 0;
          font-size: 16px;
          font-weight: 600;
          color: #333;
        }

        .detail-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }

        .detail-item {
          display: flex;
          flex-direction: column;
        }

        .detail-item label {
          font-size: 12px;
          color: #666;
          font-weight: 600;
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .detail-item value {
          font-size: 14px;
          color: #333;
          font-weight: 500;
        }

        .value-highlight {
          color: #0066cc;
          font-weight: 600;
        }

        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          background-color: #ffc107;
          color: #000;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          width: fit-content;
        }

        .items-table {
          overflow-x: auto;
        }

        .items-table table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }

        .items-table thead {
          background-color: #f5f5f5;
          border-bottom: 2px solid #ddd;
        }

        .items-table th {
          padding: 12px;
          text-align: left;
          font-weight: 600;
          color: #333;
        }

        .items-table td {
          padding: 12px;
          border-bottom: 1px solid #eee;
        }

        .sku-cell {
          font-family: monospace;
          font-weight: 600;
          color: #0066cc;
        }

        .qty-cell {
          text-align: center;
          font-weight: 500;
        }

        .approved-qty-cell {
          padding: 8px 12px !important;
        }

        .qty-input-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .qty-input {
          width: 70px;
          padding: 6px 8px;
          border: 2px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
          font-weight: 600;
          text-align: center;
          transition: border-color 0.2s;
        }

        .qty-input:focus {
          outline: none;
          border-color: #0066cc;
          background-color: #f0f7ff;
        }

        .qty-input:disabled {
          background-color: #f5f5f5;
          cursor: not-allowed;
          color: #999;
        }

        .actions-cell {
          padding: 8px 12px !important;
        }

        .qty-buttons {
          display: flex;
          gap: 4px;
        }

        .btn-qty-adjust {
          width: 32px;
          height: 32px;
          padding: 0;
          border: 1px solid #ddd;
          background-color: #f5f5f5;
          border-radius: 4px;
          cursor: pointer;
          font-size: 18px;
          font-weight: 600;
          color: #333;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .btn-qty-adjust:hover:not(:disabled) {
          background-color: #e8e8e8;
          border-color: #999;
        }

        .btn-qty-adjust:active:not(:disabled) {
          background-color: #d0d0d0;
        }

        .btn-qty-adjust:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .summary-warning {
          color: #ff9800;
          font-size: 12px;
          font-weight: 600;
        }

        .badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
        }

        .badge-approved {
          background-color: #d4edda;
          color: #155724;
        }

        .badge-pending {
          background-color: #fff3cd;
          color: #856404;
        }

        .empty-row {
          text-align: center;
          color: #999;
          padding: 20px !important;
        }

        .items-summary {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 12px;
          padding-top: 12px;
          border-top: 1px solid #eee;
          margin-top: 12px;
          font-size: 14px;
        }

        .items-summary strong {
          font-size: 18px;
          color: #0066cc;
        }

        .remarks-textarea {
          width: 100%;
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-family: Arial, sans-serif;
          font-size: 14px;
          resize: vertical;
        }

        .remarks-textarea:disabled {
          background-color: #f5f5f5;
          cursor: not-allowed;
        }

        .approval-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          padding: 20px;
          background: white;
          border: 1px solid #ddd;
          border-radius: 6px;
        }

        .btn {
          padding: 10px 20px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
        }

        .btn-secondary {
          background-color: #e0e0e0;
          color: #333;
        }

        .btn-secondary:hover:not(:disabled) {
          background-color: #d0d0d0;
        }

        .btn-primary {
          background-color: #28a745;
          color: white;
        }

        .btn-approve:hover:not(:disabled) {
          background-color: #218838;
          box-shadow: 0 2px 6px rgba(33, 136, 56, 0.3);
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-loader {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ReturnApprovalForm;
