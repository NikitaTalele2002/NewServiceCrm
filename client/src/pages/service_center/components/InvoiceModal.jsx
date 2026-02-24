import React from 'react';

export default function InvoiceModal({ open, data, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded max-w-6xl max-h-screen overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Invoice History</h2>
          <button onClick={onClose} className="text-red-500 text-xl">×</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300">
            <thead className="bg-gray-100">
              <tr>
                <th className="border border-gray-300 px-4 py-2 text-left">Invoice Number</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Invoice Date</th>
                <th className="border border-gray-300 px-4 py-2 text-left">SKU Code</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Part Name</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Invoice Quantity</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(data) && data.map((item, index) => (
                <tr key={index} className="border-b border-gray-300">
                  <td className="border border-gray-300 px-4 py-2">{item['Invoice Number']}</td>
                  <td className="border border-gray-300 px-4 py-2">{item['Invoice Date'] ? new Date(item['Invoice Date']).toLocaleDateString('en-GB') : ''}</td>
                  <td className="border border-gray-300 px-4 py-2">{item['SKU/Part Code']}</td>
                  <td className="border border-gray-300 px-4 py-2">{item['Part Name']}</td>
                  <td className="border border-gray-300 px-4 py-2">{item['Invoice Quantity']}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
