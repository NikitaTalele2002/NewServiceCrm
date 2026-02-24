import React from 'react';
import { useRentalReturn } from '../../hooks/useRentalReturn';

const RentalReturn = ({ onBack }) => {
  const {
    allocatedRequests,
    selectedRequest,
    technicianInventory,
    returns,
    loading,
    setSelectedRequest,
    handleReturnChange,
    handleReturn,
    handleBackToRequests
  } = useRentalReturn(onBack);

  if (!selectedRequest) {
    return (
      <div className="p-6">
        <button onClick={onBack} className="mb-4 bg-gray-500 text-black px-4 py-2 rounded">Back</button>
        <h1 className="text-2xl font-bold mb-4">Rental Return</h1>
        <h2 className="text-xl font-bold mb-4">Select Allocated Request</h2>
        {loading ? (
          <div className="text-center py-4">Loading...</div>
        ) : (
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 p-2">Request ID</th>
                <th className="border border-gray-300 p-2">Technician</th>
                <th className="border border-gray-300 p-2">Call ID</th>
                <th className="border border-gray-300 p-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {allocatedRequests.map((req) => (
                <tr key={req.id}>
                  <td className="border border-gray-300 p-2">{req.requestId}</td>
                  <td className="border border-gray-300 p-2">{req.technicianName}</td>
                  <td className="border border-gray-300 p-2">{req.callId}</td>
                  <td className="border border-gray-300 p-2">
                    <button
                      onClick={() => setSelectedRequest(req)}
                      className="bg-blue-500 text-black px-2 py-1 rounded">Select
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  }

  return (
    <div className="p-6">
      <button onClick={handleBackToRequests} className="mb-4 bg-gray-500 text-black px-4 py-2 rounded">Back to Requests</button>
      <h1 className="text-2xl font-bold mb-4">Return Parts for Request: {selectedRequest.requestId}</h1>
      <h2 className="text-xl font-bold mb-4">Technician: {selectedRequest.technicianName}</h2>
      {loading ? (
        <div className="text-center py-4">Loading inventory...</div>
      ) : (
        <>
          <table className="w-full border-collapse border border-gray-300 mb-4">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 p-2">SKU</th>
                <th className="border border-gray-300 p-2">Part Name</th>
                <th className="border border-gray-300 p-2">Good Qty</th>
                <th className="border border-gray-300 p-2">Defective Qty</th>
                <th className="border border-gray-300 p-2">Return Good Qty</th>
                <th className="border border-gray-300 p-2">Return Defective Qty</th>
              </tr>
            </thead>
            <tbody>
              {technicianInventory.map((item) => (
                <tr key={item.id}>
                  <td className="border border-gray-300 p-2">{item.sku}</td>
                  <td className="border border-gray-300 p-2">{item.spareName}</td>
                  <td className="border border-gray-300 p-2">{item.goodQty}</td>
                  <td className="border border-gray-300 p-2">{item.defectiveQty}</td>
                  <td className="border border-gray-300 p-2">
                    <input
                      type="number"
                      value={returns[item.id]?.goodQty || 0}
                      onChange={(e) => handleReturnChange(item.id, 'goodQty', e.target.value)}
                      className="border p-1 w-20"
                      min="0"
                      max={item.goodQty}
                    />
                  </td>
                  <td className="border border-gray-300 p-2">
                    <input
                      type="number"
                      value={returns[item.id]?.defectiveQty || 0}
                      onChange={(e) => handleReturnChange(item.id, 'defectiveQty', e.target.value)}
                      className="border p-1 w-20"
                      min="0"
                      max={item.defectiveQty}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            onClick={handleReturn}
            className="bg-red-500 text-black px-4 py-2 rounded hover:bg-red-600"
          >
            Return Parts
          </button>
        </>
      )}
    </div>
  );
};

export default RentalReturn;