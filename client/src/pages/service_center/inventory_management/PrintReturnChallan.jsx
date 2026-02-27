import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getApiUrl } from '../../../config/apiConfig';
import './PrintReturnChallan.css';

export default function PrintReturnChallan() {
  const { requestId } = useParams();
  const navigate = useNavigate();
  
  const [challan, setChallan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const token = localStorage.getItem('token');

  // Fetch challan details
  useEffect(() => {
    const fetchChallan = async () => {
      setLoading(true);
      try {
        const response = await fetch(getApiUrl(`/spare-returns/challan/${requestId}`), {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch challan');
        }

        const data = await response.json();
        setChallan(data.challan);
      } catch (err) {
        console.error('Error fetching challan:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (requestId && token) {
      fetchChallan();
    }
  }, [requestId, token]);

  const handlePrint = () => {
    window.print();
  };

  const handleGoBack = () => {
    navigate('/service-center/inventory/view-spare-return');
  };

  if (loading) {
    return (
      <div className="print-return-challan-container">
        <div className="loading">Loading challan...</div>
      </div>
    );
  }

  if (!challan) {
    return (
      <div className="print-return-challan-container">
        <div className="error-message">
          {error || 'Challan not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="print-return-challan-wrapper">
      <div className="no-print-buttons">
        <button className="btn btn-print" onClick={handlePrint}>
          🖨️ Print Challan
        </button>
        <button className="btn btn-back" onClick={handleGoBack}>
          ← Back to Returns
        </button>
      </div>

      <div className="challan-document" id="challan-print">
        {/* Header */}
        <div className="challan-header">
          <div className="company-header">
            <h1>Spare Part Return Request</h1>
            <p>Delivery Challan</p>
          </div>
          <div className="challan-number">
            <p><strong>Request No.:</strong> {challan.requestNumber}</p>
            <p><strong>Status:</strong> {challan.status}</p>
            <p><strong>Date:</strong> {new Date(challan.createdDate).toLocaleDateString()}</p>
          </div>
        </div>

        {/* From Section */}
        <div className="from-section">
          <h3>FROM (Service Center)</h3>
          <div className="address-box">
            <p><strong>Name:</strong> {challan.serviceCenterName}</p>
            <p><strong>Email:</strong> {challan.serviceCenterEmail || 'N/A'}</p>
            <p><strong>Phone:</strong> {challan.serviceCenterPhone || 'N/A'}</p>
          </div>
        </div>

        {/* Items Table */}
        <div className="items-section">
          <h2>Return Items</h2>
          <table className="items-table">
            <thead>
              <tr>
                <th>S.No.</th>
                <th>Part Code</th>
                <th>Part Description</th>
                <th>Model Code</th>
                <th>Model Description</th>
                <th>Quantity</th>
              </tr>
            </thead>
            <tbody>
              {challan.items && challan.items.map((item, index) => (
                <tr key={index}>
                  <td>{item.srNo}</td>
                  <td>{item.partCode}</td>
                  <td>{item.partDescription}</td>
                  <td>{item.modelCode}</td>
                  <td>{item.modelDescription}</td>
                  <td className="text-center">{item.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div className="summary-section">
          <h3>Summary</h3>
          <div className="summary-items">
            <div className="summary-row">
              <span className="label">Total Items (Lines):</span>
              <span className="value">{challan.totalItems}</span>
            </div>
            <div className="summary-row">
              <span className="label">Total Quantity:</span>
              <span className="value">{challan.totalQuantity}</span>
            </div>
          </div>
        </div>

        {/* Footer with Signatures */}
        <div className="footer-section">
          <div className="signature-box">
            <p>Service Center In-Charge</p>
            <div className="signature-space">_______________________</div>
            <p>Name & Date</p>
          </div>

          <div className="signature-box">
            <p>Plant Receiver</p>
            <div className="signature-space">_______________________</div>
            <p>Name & Date</p>
          </div>

          <div className="signature-box">
            <p>Plant Authority</p>
            <div className="signature-space">_______________________</div>
            <p>Name & Date</p>
          </div>
        </div>

        {/* Terms & Conditions */}
        <div className="terms-section">
          <p><strong>Note:</strong> This is a system-generated delivery challan for the spare part return request. 
          Please verify all quantities and details before accepting the delivery.</p>
        </div>
      </div>
    </div>
  );
}
