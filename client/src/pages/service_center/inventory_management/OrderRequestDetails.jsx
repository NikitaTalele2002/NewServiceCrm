import React, { useState, useEffect } from "react";

export default function OrderRequestDetails({ requestId, onClose }) {
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchRequestDetails();
  }, [requestId]);

  const fetchRequestDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/spare-requests/${requestId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch request details');
      
      const data = await response.json();
      setRequest(data);
    } catch (err) {
      console.error('Error fetching request details:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'approved_by_rsm': 'bg-green-100 text-green-800',
      'rejected_by_rsm': 'bg-red-100 text-red-800',
      'completed': 'bg-blue-100 text-blue-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-600">Loading request details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded p-4 text-red-800">
          <p>Error loading request: {error}</p>
        </div>
        <button
          onClick={onClose}
          className="mt-4 bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
        >
          Close
        </button>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="p-6">
        <p className="text-gray-600">Request not found</p>
        <button
          onClick={onClose}
          className="mt-4 bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-h-96 overflow-y-auto">
      <h3 className="text-xl font-bold mb-4">Spare Request Details</h3>

      {/* Request Header Information */}
      <div className="bg-gray-50 p-4 rounded MB-6 mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold text-gray-600">Request ID</label>
            <p className="text-lg text-gray-900">{request.request_id}</p>
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-600">Created Date</label>
            <p className="text-lg text-gray-900">{formatDate(request.created_at)}</p>
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-600">Request Type</label>
            <p className="text-lg text-gray-900">{request.request_type || 'Normal'}</p>
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-600">Request Reason</label>
            <p className="text-lg text-gray-900">{request.request_reason || 'MSL'}</p>
          </div>
        </div>
      </div>

      {/* Status Section */}
      <div className="bg-gray-50 p-4 rounded mb-6">
        <div>
          <label className="text-sm font-semibold text-gray-600">Status</label>
          <div className="mt-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(request.status_name)}`}>
              {request.status_name?.replace(/_/g, ' ').toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Approval History Section */}
      {request.approval_history && request.approval_history.length > 0 && (
        <div className="bg-gray-50 p-4 rounded mb-6">
          <h4 className="font-semibold text-gray-900 mb-4">Approval History</h4>
          <div className="space-y-3">
            {request.approval_history.map((approval, idx) => (
              <div key={idx} className="border-l-4 border-blue-500 p-3 bg-white rounded">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {approval.approval_level_name} Approval
                    </p>
                    <p className="text-sm text-gray-600">
                      By: <span className="font-medium">{approval.approver_name}</span>
                    </p>
                    {approval.approval_remarks && (
                      <p className="text-sm text-gray-600 mt-1">
                        Remarks: <span className="font-medium">{approval.approval_remarks}</span>
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      approval.approval_status === 'approved' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {approval.approval_status?.toUpperCase()}
                    </span>
                    {approval.approved_at && (
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(approval.approved_at).toLocaleDateString('en-IN')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Items Section */}
      <div className="bg-gray-50 p-4 rounded mb-6">
        <h4 className="font-semibold text-gray-900 mb-4">Spare Parts</h4>
        {request.items && request.items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-200">
                <tr>
                  <th className="text-left p-2">SKU</th>
                  <th className="text-left p-2">Part Name</th>
                  <th className="text-right p-2">Requested Qty</th>
                  <th className="text-right p-2">Approved Qty</th>
                </tr>
              </thead>
              <tbody>
                {request.items.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-300">
                    <td className="p-2">{item.sku || item.spare_id}</td>
                    <td className="p-2">{item.spareName || 'N/A'}</td>
                    <td className="text-right p-2">{item.requested_qty || item.requestedQty}</td>
                    <td className="text-right p-2">
                      <span className="font-semibold">
                        {item.approved_qty !== undefined ? item.approved_qty : (item.approvedQty || 'Pending')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-600">No items in this request</p>
        )}
      </div>

      {/* Close Button */}
      <div className="flex justify-end">
        <button
          onClick={onClose}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
        >
          Close
        </button>
      </div>
    </div>
  );
}
