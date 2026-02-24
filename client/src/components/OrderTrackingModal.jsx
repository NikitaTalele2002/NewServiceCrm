import React, { useEffect, useState } from 'react';

export default function OrderTrackingModal({ requestId, onClose }) {
  const [trackingData, setTrackingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchTrackingData() {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(
          `http://localhost:5000/api/logistics/summary/${requestId}`,
          {
            headers: { 'Authorization': `Bearer ${token}` }
          }
        );

        if (!res.ok) {
          throw new Error('Failed to fetch tracking data');
        }

        const data = await res.json();
        setTrackingData(data);
      } catch (err) {
        setError(err.message);
        console.error('Error fetching tracking data:', err);
      } finally {
        setLoading(false);
      }
    }

    if (requestId) {
      fetchTrackingData();
    }
  }, [requestId]);

  const handleExportPDF = () => {
    // Basic PDF export functionality
    const element = document.getElementById('tracking-content');
    if (element) {
      const printWindow = window.open('', '', 'width=800,height=600');
      printWindow.document.write(element.innerHTML);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full mx-4 mb-4">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex justify-between items-center rounded-t-lg">
          <div>
            <h2 className="text-2xl font-bold">My Spare Request</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white text-2xl hover:text-gray-200 transition"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div id="tracking-content" className="p-8 space-y-6">
          {loading && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin">⏳</div>
              <p className="text-gray-600 mt-2">Loading tracking information...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-4 text-red-700">
              Error: {error}
            </div>
          )}

          {trackingData && !loading && (
            <>
              {/* Request Header Section */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {trackingData.request.number}
                </div>
              </div>

              {/* Status Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-600 font-semibold">Created</div>
                  <div className="text-base">
                    {trackingData.request.createdAt
                      ? new Date(trackingData.request.createdAt).toLocaleString()
                      : 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 font-semibold">Status</div>
                  <div className="text-base">
                    <span className="inline-block px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                      {trackingData.request.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Approval Details */}
              <div className="border-t pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-600 font-semibold">Approved</div>
                    <div className="text-base">
                      {trackingData.request.createdAt
                        ? new Date(new Date(trackingData.request.createdAt).getTime() + 60 * 60 * 1000).toLocaleString()
                        : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 font-semibold">Approved By</div>
                    <div className="text-base">USERNAME</div>
                  </div>
                </div>
              </div>

              {/* Order Items Section */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-bold mb-4">Order Items:</h3>
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold">Part Code</th>
                        <th className="px-4 py-3 text-left font-semibold">Part Description</th>
                        <th className="px-4 py-3 text-right font-semibold">Requested QTY</th>
                        <th className="px-4 py-3 text-right font-semibold">Approved QTY</th>
                        <th className="px-4 py-3 text-right font-semibold">Dispatched QTY</th>
                        <th className="px-4 py-3 text-right font-semibold">Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trackingData.items && trackingData.items.map((item, idx) => (
                        <tr key={idx} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3">{item.partCode}</td>
                          <td className="px-4 py-3 text-sm">{item.partDescription}</td>
                          <td className="px-4 py-3 text-right">{item.requestedQty}</td>
                          <td className="px-4 py-3 text-right">{item.approvedQty}</td>
                          <td className="px-4 py-3 text-right">{item.dispatchedQty}</td>
                          <td className="px-4 py-3 text-right">₹{item.cost || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SAP Documents Section */}
              <div className="border-t pt-6 space-y-4">
                {trackingData.salesOrder && (
                  <div className="bg-blue-50 border border-blue-200 rounded p-4">
                    <div className="text-lg font-bold text-blue-900">
                      Sales Order No.: {trackingData.salesOrder.number}
                    </div>
                    <div className="text-sm text-blue-700 mt-1">
                      Date: {trackingData.salesOrder.date
                        ? new Date(trackingData.salesOrder.date).toLocaleDateString()
                        : 'N/A'}
                    </div>
                  </div>
                )}

                {trackingData.deliveryNote && (
                  <div>
                    <div className="bg-green-50 border border-green-200 rounded p-4 mb-3">
                      <div className="text-lg font-bold text-green-900">
                        DN No.: {trackingData.deliveryNote.number}
                      </div>
                      <div className="text-sm text-green-700 mt-1">
                        Date: {trackingData.deliveryNote.date
                          ? new Date(trackingData.deliveryNote.date).toLocaleDateString()
                          : 'N/A'}
                      </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded p-4 mb-3">
                      <div className="text-lg font-bold text-amber-900">
                        Dispatch Date: {trackingData.deliveryNote.dispatchDate
                          ? new Date(trackingData.deliveryNote.dispatchDate).toLocaleDateString()
                          : 'N/A'}
                      </div>
                    </div>

                    <div className="bg-purple-50 border border-purple-200 rounded p-4">
                      <div className="text-lg font-bold text-purple-900">
                        Branch / ASC: {trackingData.deliveryNote.branch || 'N/A'}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Challan and Transport Section */}
              <div className="border-t pt-6 space-y-4">
                {trackingData.challan && (
                  <>
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
                      <div className="text-lg font-bold text-yellow-900 mb-2">
                        Challan Document: <a href="#" className="text-blue-600 hover:underline">Download</a>
                      </div>
                      <div className="text-sm text-yellow-700">
                        Document No.: {trackingData.challan.number}
                      </div>
                    </div>

                    <div className="bg-indigo-50 border border-indigo-200 rounded p-4">
                      <div className="text-lg font-bold text-indigo-900 mb-2">
                        Transport Details:
                      </div>
                      <div className="text-sm text-indigo-700 space-y-1">
                        <div>
                          <strong>Courier Name:</strong>{' '}
                          {trackingData.challan.transportDetails?.courierName || 'N/A'}
                        </div>
                        <div>
                          <strong>Tracking No.:</strong>{' '}
                          {trackingData.challan.transportDetails?.trackingNumber || 'N/A'}
                        </div>
                        {trackingData.challan.transportDetails?.estimatedDelivery && (
                          <div>
                            <strong>Est. Delivery:</strong>{' '}
                            {new Date(trackingData.challan.transportDetails.estimatedDelivery).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer with Action Buttons */}
        {!loading && !error && trackingData && (
          <div className="border-t bg-gray-50 px-8 py-4 rounded-b-lg flex justify-end gap-3">
            <button
              onClick={handleExportPDF}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition font-semibold"
            >
              Export to PDF
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500 transition font-semibold"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
