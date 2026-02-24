import React from 'react';
import './PrintChallan.css';

const PrintChallanForm = ({
  returnRequests,
  selectedRequest,
  onRequestChange,
  loading,
  error
}) => {
  return (
    <div className="print-challan-form">
      <div className="form-section">
        <h3 className="section-title">Select Return Request</h3>

        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}

        <div className="form-group">
          <label htmlFor="request-select" className="form-label">
            Spare Part Return Request No.:
          </label>
          <select
            id="request-select"
            value={selectedRequest?.requestId || ''}
            onChange={(e) => onRequestChange(e.target.value)}
            className="form-select"
            disabled={loading}>
            <option value="">
              {loading ? 'Loading requests...' : 'Select Request'}
            </option>
            {returnRequests.map(req => (
              <option key={req.requestId} value={req.requestId}>
                {req.requestNumber} ({req.status})
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default PrintChallanForm;