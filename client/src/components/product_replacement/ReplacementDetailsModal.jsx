import React from 'react';
import CallView from '../../pages/call_centre/CallView';

const ReplacementDetailsModal = ({ selectedReplacement, fullReplacement, modalLoading, onClose, onPrint }) => {
  if (!selectedReplacement) return null;

  // Use the full complaint data if available, otherwise use the selected replacement as fallback
  const callData = fullReplacement || selectedReplacement;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" onClick={onClose}>
      <div className="relative top-4 mx-auto p-5 border w-full max-w-6xl shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-2xl font-medium text-gray-900">View Product Replacement</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >Close
          </button>
        </div>

        {modalLoading ? (
          <div className="text-center py-8">Loading full details...</div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {/* Customer Information */}
            <CustomerInformation call={customerData} />

            {/* Product Information */}
            <ProductInformation call={productData} findProductGroupName={(group) => group || ''} />

            {/* Call Information */}
            <CallInformation call={callData} />

            {/* Product Replacement Information */}
            <div className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">Product Replacement Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium">Requested By / At</label>
                  <input readOnly value={selectedReplacement.requestedBy || ''} className="w-full p-2 border rounded" />
                </div>
                <div>
                  <label className="block text-sm font-medium">Spare Request Order Type</label>
                  <input readOnly value={selectedReplacement.orderType || ''} className="w-full p-2 border rounded" />
                </div>
                <div>
                  <label className="block text-sm font-medium">Spare Request Order Request No</label>
                  <input readOnly value={selectedReplacement.requestNumber || ''} className="w-full p-2 border rounded" />
                </div>
                <div>
                  <label className="block text-sm font-medium">Spare Request Order Status</label>
                  <input readOnly value={selectedReplacement.spareStatus || ''} className="w-full p-2 border rounded" />
                </div>
                <div>
                  <label className="block text-sm font-medium">Product Replacement Request Status</label>
                  <input readOnly value={selectedReplacement.replacementStatus || ''} className="w-full p-2 border rounded" />
                </div>
                <div>
                  <label className="block text-sm font-medium">Replacement Approved By / At (RSM)</label>
                  <input readOnly value={selectedReplacement.approvedByRSM || ''} className="w-full p-2 border rounded" />
                </div>
                <div>
                  <label className="block text-sm font-medium">Replacement Approved By / At (HOD)</label>
                  <input readOnly value={selectedReplacement.approvedByHOD || ''} className="w-full p-2 border rounded" />
                </div>
                <div>
                  <label className="block text-sm font-medium">Old Product Serial No</label>
                  <input readOnly value={selectedReplacement.oldSerialNo || ''} className="w-full p-2 border rounded" />
                </div>
                <div>
                  <label className="block text-sm font-medium">New Product Serial No</label>
                  <input readOnly value={selectedReplacement.newSerialNo || ''} className="w-full p-2 border rounded" />
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-end space-x-4 mt-8">
              <button
                onClick={() => onPrint(fullReplacement || selectedReplacement)}
                className="bg-blue-500 hover:bg-blue-700 text-black font-bold py-2 px-6 rounded border"
              > Print Service Tag
              </button>
              <button
                onClick={onClose}
                className="bg-gray-500 hover:bg-gray-700 text-black font-bold py-2 px-6 rounded border"
              > &lt;&lt; Back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReplacementDetailsModal;