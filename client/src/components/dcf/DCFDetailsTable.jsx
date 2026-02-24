import React from 'react';

const DCFDetailsTable = ({ items, cnDate, cnValue, cnCount }) => {
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      return date.toLocaleDateString('en-IN', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
      });
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="border border-gray-300 p-3 mt-3">
      {/* CN Information */}
      {(cnDate || cnValue || cnCount) && (
        <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded">
          <h3 className="m-0 mb-2 text-sm font-bold">Credit Note Information</h3>
          <div className="flex gap-5 flex-wrap">
            <div>
              <label className="text-xs text-gray-600">CN Date:</label>
              <div className="text-sm font-medium">{formatDate(cnDate) || 'N/A'}</div>
            </div>
            <div>
              <label className="text-xs text-gray-600">CN Value:</label>
              <div className="text-sm font-medium">₹ {cnValue ? parseFloat(cnValue).toFixed(2) : 'N/A'}</div>
            </div>
            <div>
              <label className="text-xs text-gray-600">CN Count:</label>
              <div className="text-sm font-medium">{cnCount || 0}</div>
            </div>
          </div>
        </div>
      )}

      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 p-2 text-sm font-semibold">Part Code</th>
            <th className="border border-gray-300 p-2 text-sm font-semibold">Part Description</th>
            <th className="border border-gray-300 p-2 text-sm font-semibold">QTY DCF</th>
            <th className="border border-gray-300 p-2 text-sm font-semibold">C&F Received QTY</th>
            <th className="border border-gray-300 p-2 text-sm font-semibold">C&F Approved QTY</th>
            <th className="border border-gray-300 p-2 text-sm font-semibold">C&F Rejected QTY</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, idx) => (
            <tr key={idx} className="hover:bg-gray-50">
              <td className="border border-gray-300 p-2 text-sm">{it.sku}</td>
              <td className="border border-gray-300 p-2 text-sm">{it.spareName}</td>
              <td className="border border-gray-300 p-2 text-sm text-center">{it.requestedQty}</td>
              <td className="border border-gray-300 p-2 text-sm text-center">{it.receivedQty}</td>
              <td className="border border-gray-300 p-2 text-sm text-center">{it.approvedQty}</td>
              <td className="border border-gray-300 p-2 text-sm text-center">{it.rejectedQty}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DCFDetailsTable;