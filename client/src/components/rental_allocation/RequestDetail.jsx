import React from 'react';
import { useRequestDetail } from '../../hooks/useRequestDetail';

const RequestDetail = ({ request, onBack }) => {
  const {
    parts,
    loading,
    allocations,
    isApproved,
    handleAllocationChange,
    handleOrder,
    getPartStatus,
    canAllocate,
    handleAllocate,
    handleViewCart
  } = useRequestDetail(request, onBack);

  if (loading) {
    return <div className="p-6 text-center">Loading request details...</div>;
  }

  // Show approval notification if already approved
  if (isApproved) {
    return (
      <div className="p-6">
        <button onClick={onBack} className="mb-4 bg-gray-500 text-black px-4 py-2 rounded">Back</button>
        <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 rounded">
          <h2 className="text-lg font-bold text-green-700 flex items-center gap-2">
            ✅ Request Already Approved
          </h2>
          <p className="text-green-600 mt-2">This request has been approved and spares have been allocated to the technician.</p>
          <p className="text-green-600 mt-1">No further changes can be made. View the details below:</p>
        </div>
        
        <div className="mb-4">
          <div className="flex gap-4 mb-2">
            <div>
              <label className="block text-sm font-medium">Request ID:</label>
              <input type="text" value={request?.requestId ?? ''} readOnly className="border p-2 rounded bg-gray-50" />
            </div>
            <div>
              <label className="block text-sm font-medium">Technician:</label>
              <input type="text" value={request?.technicianName ?? ''} readOnly className="border p-2 rounded bg-gray-50" />
            </div>
          </div>
          <div className="flex gap-4 mb-2">
            <div>
              <label className="block text-sm font-medium">Created At:</label>
              <input type="text" value={request?.createdAt ? new Date(request.createdAt).toLocaleDateString() : ''} readOnly className="border p-2 rounded bg-gray-50" />
            </div>
            <div>
              <label className="block text-sm font-medium">Call Id:</label>
              <input type="text" value={request?.callId ?? request?.call_id ?? ''} readOnly className="border p-2 rounded bg-gray-50" />
            </div>
          </div>
        </div>
        
        <h2 className="text-xl font-bold mb-4">Allocated Spare Parts:</h2>
        <table className="w-full border-collapse border border-gray-300 mb-4">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 p-2">Part code</th>
              <th className="border border-gray-300 p-2">Part Description</th>
              <th className="border border-gray-300 p-2">Requested QTY</th>
              <th className="border border-gray-300 p-2">Allocated QTY</th>
              <th className="border border-gray-300 p-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {parts.map((part, index) => {
              const partKey = part.spare_request_item_id || index;
              const approvedQty = allocations[partKey] || part.approvedQty || 0;
              
              return (
                <tr key={`${part.spare_request_item_id}-${index}`} className="bg-green-50">
                  <td className="border border-gray-300 p-2">{part.spare_part_code || 'N/A'}</td>
                  <td className="border border-gray-300 p-2">{part.spare_part_name || 'N/A'}</td>
                  <td className="border border-gray-300 p-2 text-center font-semibold">{part.quantity_requested || 0}</td>
                  <td className="border border-gray-300 p-2 text-center font-bold text-blue-600">{approvedQty}</td>
                  <td className="border border-gray-300 p-2 text-center">
                    <span className="bg-green-200 text-green-800 px-2 py-1 rounded text-sm font-semibold">Allocated</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="p-6">
      <button onClick={onBack} className="mb-4 bg-gray-500 text-black px-4 py-2 rounded">Back</button>
      <div className="mb-4">
        <div className="flex gap-4 mb-2">
          <div>
            <label className="block text-sm font-medium">Request ID:</label>
            <input type="text" value={request?.requestId ?? ''} readOnly className="border p-2 rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium">Technician:</label>
            <input type="text" value={request?.technicianName ?? ''} readOnly className="border p-2 rounded" />
          </div>
        </div>
        <div className="flex gap-4 mb-2">
          <div>
            <label className="block text-sm font-medium">Created At:</label>
            <input type="text" value={request?.createdAt ? new Date(request.createdAt).toLocaleDateString() : ''} readOnly className="border p-2 rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium">Call Id:</label>
            <input type="text" value={request?.callId ?? request?.call_id ?? ''} readOnly className="border p-2 rounded" />
          </div>
        </div>
      </div>
      <h2 className="text-xl font-bold mb-4">Requested Spare Part List:</h2>
      <table className="w-full border-collapse border border-gray-300 mb-4">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 p-2">Part code</th>
            <th className="border border-gray-300 p-2">Part Description</th>
            <th className="border border-gray-300 p-2">Requested QTY</th>
            {/* <th className="border border-gray-300 p-2">Check Availability</th> */}
            <th className="border border-gray-300 p-2">No. Of Spares Available</th>
            <th className="border border-gray-300 p-2">Allocate No. Of Spares</th>
            <th className="border border-gray-300 p-2">Order Spares</th>
            <th className="border border-gray-300 p-2">Shortage</th>
            <th className="border border-gray-300 p-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {parts.map((part, index) => {
            const partKey = part.spare_request_item_id || index;
            const allocatedQty = allocations[partKey] || 0;
            const availableQty = part.available !== undefined && part.available !== null ? part.available : 0;
            const requestedQty = part.quantity_requested || 0;
            const shortage = Math.max(0, requestedQty - availableQty);
            const status = getPartStatus(part);
            const maxAllowable = Math.min(requestedQty, availableQty);
            
            return (
              <tr key={`${part.spare_request_item_id}-${index}`} className="hover:bg-gray-50">
                <td className="border border-gray-300 p-2">{part.spare_part_code || 'N/A'}</td>
                <td className="border border-gray-300 p-2">{part.spare_part_name || 'N/A'}</td>
                <td className="border border-gray-300 p-2 text-center font-semibold">{requestedQty}</td>
                <td className="border border-gray-300 p-2 text-center font-semibold">
                  {availableQty > 0 ? (
                    <span className="font-semibold text-green-600">{availableQty}</span>
                  ) : (
                    <span className="font-semibold text-red-600">Unavailable</span>
                  )}
                </td>
                <td className="border border-gray-300 p-2">
                  <input
                    type="number"
                    value={allocatedQty}
                    onChange={(e) => {
                      console.log(`Changing allocation for item ${partKey}:`, e.target.value);
                      handleAllocationChange(partKey, e.target.value, part);
                    }}
                    className="border p-1 w-16 focus:outline-none focus:border-blue-500 text-center"
                    min="0"
                    max={maxAllowable}
                    disabled={maxAllowable === 0 || isApproved}
                    placeholder="0"
                  />
                </td>
                <td className="border border-gray-300 p-2">
                  <button
                    onClick={() => handleOrder(part)}
                    className="bg-green-500 text-black px-2 py-1 rounded hover:bg-green-600 text-sm"
                  >Add to cart
                  </button>
                </td>
                <td className="border border-gray-300 p-2 text-center font-semibold">
                  {shortage > 0 ? (
                    <span className="text-red-600">{shortage}</span>
                  ) : (
                    <span className="text-green-600">0</span>
                  )}
                </td>
                <td className="border border-gray-300 p-2 text-center">
                  {status === 'Completed' ? (
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-semibold">Completed</span>
                  ) : (
                    <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-sm font-semibold">Pending</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="flex gap-4 mt-6">
        <button
          onClick={handleViewCart}
          className="bg-blue-500 text-black px-4 py-2 rounded hover:bg-blue-600"
        >View Cart
        </button>
        {!isApproved && (
          <button
            onClick={handleAllocate}
            disabled={!canAllocate()}
            title={!canAllocate() ? 'Allocate only when all items are Completed and at least one allocation is made' : 'Allocate selected spares'}
            className={`px-4 py-2 rounded font-semibold transition ${canAllocate() ? 'bg-green-500 text-black hover:bg-green-600 cursor-pointer' : 'bg-gray-400 text-gray-700 cursor-not-allowed'}`}
          >
            {canAllocate() ? 'Allocate' : 'Allocate (All items must be Completed)'}
          </button>
        )}
      </div>
    </div>
  );
};

export default RequestDetail;
