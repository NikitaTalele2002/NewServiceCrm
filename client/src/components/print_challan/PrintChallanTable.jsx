import React from 'react';
import './PrintChallan.css';

const PrintChallanTable = ({ challanData, onPrint }) => {
  if (!challanData) return null;

  const columns = [
    { key: 'srNo', header: 'S.No', width: '8%' },
    { key: 'partCode', header: 'Part Code', width: '18%' },
    { key: 'partDescription', header: 'Part Description', width: '28%' },
    { key: 'modelCode', header: 'Model Code', width: '15%' },
    { key: 'modelDescription', header: 'Model Description', width: '16%' },
    { key: 'quantity', header: 'Return Qty', width: '15%' }
  ];

  return (
    <div className="print-challan-table">
      <div className="challan-header">
        <h3 className="challan-title">Challan Details</h3>
        <button
          onClick={onPrint}
          className="print-button"
        >
          <span className="print-icon">🖨️</span>
          Print Challan
        </button>
      </div>

      <div className="challan-info">
        <div className="info-row">
          <span className="info-label">Request Number:</span>
          <span className="info-value">{challanData.requestNumber}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Status:</span>
          <span className="info-value">{challanData.status}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Service Center:</span>
          <span className="info-value">{challanData.serviceCenterName}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Total Items:</span>
          <span className="info-value">{challanData.totalItems}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Total Quantity:</span>
          <span className="info-value">{challanData.totalQuantity}</span>
        </div>
      </div>

      <div className="table-container">
        <table className="challan-table">
          <thead>
            <tr>
              {columns.map(column => (
                <th
                  key={column.key}
                  style={{ width: column.width }}
                  className="table-header">
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {challanData.items.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="empty-row">
                  No items found
                </td>
              </tr>
            ) : (
              challanData.items.map((item, index) => (
                <tr key={index} className="table-row">
                  {columns.map(column => (
                    <td
                      key={column.key}
                      className="table-cell"
                      style={{ width: column.width }}>
                      {column.render ? column.render(item) : item[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="challan-footer">
        <div className="signature-section">
          <div className="signature-box">
            <p className="signature-label">Service Center In-Charge</p>
            <div className="signature-line">_______________________</div>
          </div>
          <div className="signature-box">
            <p className="signature-label">Plant Receiver</p>
            <div className="signature-line">_______________________</div>
          </div>
          <div className="signature-box">
            <p className="signature-label">Plant Authority</p>
            <div className="signature-line">_______________________</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintChallanTable;
