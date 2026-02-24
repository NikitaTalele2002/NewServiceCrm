import React from 'react';
import './RentalReturn.css';

const RentalReturnForm = ({
  selectedRequest,
  rentalReturns,
  returns,
  onReturnChange,
  onReturn,
  onBack,
  loading,
  error
}) => {
  const handleSubmit = (e) => {
    e.preventDefault();
    onReturn();
  };

  const hasReturns = Object.values(returns).some(
    quantities => quantities.goodQty > 0 || quantities.defectiveQty > 0
  );

  return (
    <div className="rental-return-form">
      <div className="form-header">
        <button className="btn btn-secondary back-btn" onClick={onBack}>
          <span className="btn-icon">←</span>
          Back to Requests
        </button>
        <div className="header-content">
          <h2>Return Parts</h2>
          <p className="request-id">Request #{selectedRequest?.id}</p>
        </div>
      </div>

      <div className="request-summary">
        <div className="summary-card">
          <h3>Request Details</h3>
          <div className="summary-details">
            <div className="detail-row">
              <span className="detail-icon">👤</span>
              <div className="detail-content">
                <span className="detail-label">Technician</span>
                <span className="detail-value">{selectedRequest?.technicianName}</span>
              </div>
            </div>

            <div className="detail-row">
              <span className="detail-icon">🏢</span>
              <div className="detail-content">
                <span className="detail-label">Service Center</span>
                <span className="detail-value">{selectedRequest?.serviceCenterName}</span>
              </div>
            </div>

            <div className="detail-row">
              <span className="detail-icon">📅</span>
              <div className="detail-content">
                <span className="detail-label">Allocated Date</span>
                <span className="detail-value">
                  {selectedRequest ? new Date(selectedRequest.allocatedDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : ''}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="inventory-section">
          <div className="section-header">
            <h3>Technician Inventory</h3>
            <p>Select quantities to return</p>
          </div>

          {rentalReturns.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📦</div>
              <h4>No inventory items found</h4>
              <p>This technician has no items available for return.</p>
              <small style={{marginTop: '10px', display: 'block', color: '#666'}}>
                Only technicians with allocated spare parts can process returns.
              </small>
            </div>
          ) : (
            <div className="inventory-table-container">
              <table className="inventory-table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Spare Part Name</th>
                    <th className="qty-col">Available Good</th>
                    <th className="qty-col">Available Defective</th>
                    <th className="input-col">Return Good Qty</th>
                    <th className="input-col">Return Defective Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {rentalReturns.map((item) => (
                    <tr key={item.id}>
                      <td className="sku-cell">
                        <code>{item.sku}</code>
                      </td>
                      <td className="name-cell">
                        <div className="part-name">{item.spareName}</div>
                      </td>
                      <td className="qty-cell">
                        <span className="qty-badge good-qty">{item.goodQty}</span>
                      </td>
                      <td className="qty-cell">
                        <span className="qty-badge defective-qty">{item.defectiveQty}</span>
                      </td>
                      <td className="input-cell">
                        <input
                          type="number"
                          min="0"
                          max={item.goodQty}
                          value={returns[item.id]?.goodQty || 0}
                          onChange={(e) => onReturnChange(item.id, 'goodQty', e.target.value)}
                          className="return-input"
                          placeholder="0"
                        />
                      </td>
                      <td className="input-cell">
                        <input
                          type="number"
                          min="0"
                          max={item.defectiveQty}
                          value={returns[item.id]?.defectiveQty || 0}
                          onChange={(e) => onReturnChange(item.id, 'defectiveQty', e.target.value)}
                          className="return-input"
                          placeholder="0"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="form-actions">
          <button
            type="submit"
            className={`btn btn-primary submit-btn ${(!hasReturns || loading) ? 'disabled' : ''}`}
            disabled={!hasReturns || loading}
          >
            {loading ? (
              <>
                <span className="loading-spinner">⏳</span>
                Processing Return...
              </>
            ) : (
              <>
                <span className="btn-icon">✅</span>
                Submit Return
              </>
            )}
          </button>

          {!hasReturns && !loading && (
            <p className="no-items-message">
              Please select items to return before submitting.
            </p>
          )}
        </div>
      </form>
    </div>
  );
};

export default RentalReturnForm;