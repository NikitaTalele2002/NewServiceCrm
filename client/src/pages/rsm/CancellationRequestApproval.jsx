import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../../config/apiConfig';
import Button from '../../components/common/Button';

const formatDate = (dateString) => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleString('en-IN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch {
    return 'Invalid Date';
  }
};

export default function CancellationRequestApproval() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('pending');
  const [searchText, setSearchText] = useState('');
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [approvalRemarks, setApprovalRemarks] = useState('');
  const [approvalAction, setApprovalAction] = useState('approve');

  useEffect(() => {
    fetchCancellationRequests();
  }, [selectedStatus]);

  const fetchCancellationRequests = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl(`/call-center/cancellation-requests?status=${selectedStatus}`), {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch cancellation requests');
      }

      const data = await response.json();
      setRequests(data.data || []);
    } catch (error) {
      console.error('Error fetching cancellation requests:', error);
      alert('Failed to fetch cancellation requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprovalModal = (request, action) => {
    setSelectedRequest(request);
    setApprovalAction(action);
    setApprovalRemarks('');
    setShowApprovalModal(true);
  };

  const submitApprovalDecision = async () => {
    if (!selectedRequest) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const endpoint = approvalAction === 'approve' 
        ? `/call-center/cancellation-requests/${selectedRequest.cancellation_id}/approve`
        : `/call-center/cancellation-requests/${selectedRequest.cancellation_id}/reject`;

      const response = await fetch(getApiUrl(endpoint), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          remarks: approvalRemarks || null
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process approval');
      }

      alert(`Cancellation request ${approvalAction}d successfully`);
      setShowApprovalModal(false);
      setSelectedRequest(null);
      fetchCancellationRequests();
    } catch (error) {
      console.error('Error processing approval:', error);
      alert(`Failed to ${approvalAction} cancellation request: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = requests.filter(req => {
    const searchLower = searchText.toLowerCase();
    return (
      req.call_id.toString().includes(searchLower) ||
      (req.call_details?.serviceCenter?.asc_name || '').toLowerCase().includes(searchLower) ||
      (req.reason || '').toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Call Cancellation Request Approvals</h1>

        {/* Filters */}
        <div className="bg-white p-6 shadow-md mb-6 rounded">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">Status Filter:</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Search:</label>
              <input
                type="text"
                placeholder="Call ID or Service Center..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={fetchCancellationRequests}
                variant="secondary"
                className="w-full"
              >Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Requests Table */}
        <div className="bg-white shadow-md rounded overflow-hidden">
          {loading ? (
            <div className="p-6 text-center text-gray-500">
              Loading...
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No {selectedStatus} cancellation requests found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Call ID</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Service Center</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Reason</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Requested At</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((request, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="px-6 py-4 font-semibold">{request.call_id}</td>
                      <td className="px-6 py-4">
                        {request.call_details?.serviceCenter?.asc_name || 'N/A'}
                      </td>
                      <td className="px-6 py-4">{request.reason || 'N/A'}</td>
                      <td className="px-6 py-4">{formatDate(request.created_at)}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded text-sm font-semibold ${
                            request.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : request.status === 'approved'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {request.status?.charAt(0).toUpperCase() + request.status?.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {request.status === 'pending' && (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleApprovalModal(request, 'approve')}
                              className="px-3 py-1 bg-green-500 text-black rounded hover:bg-green-600 text-sm"
                              title="Approve cancellation"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleApprovalModal(request, 'reject')}
                              className="px-3 py-1 bg-red-500 text-black rounded hover:bg-red-600 text-sm"
                              title="Reject cancellation"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                        {request.status !== 'pending' && (
                          <span className="text-gray-500 text-sm">No action available</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Summary */}
          <div className="px-6 py-4 bg-gray-50 border-t text-sm text-gray-600">
            Total: {filteredRequests.length} request(s)
          </div>
        </div>
      </div>

      {/* Approval Modal */}
      {showApprovalModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-4">
              {approvalAction === 'approve' ? 'Approve' : 'Reject'} Cancellation Request
            </h2>

            <div className="mb-4 space-y-3">
              <div>
                <p className="text-sm text-gray-600">Call ID:</p>
                <p className="font-semibold text-lg">{selectedRequest.call_id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Service Center:</p>
                <p className="font-semibold">
                  {selectedRequest.call_details?.serviceCenter?.asc_name || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Reason:</p>
                <p className="font-semibold">{selectedRequest.reason}</p>
              </div>
              {selectedRequest.remarks && (
                <div>
                  <p className="text-sm text-gray-600">Service Center Remarks:</p>
                  <p className="font-semibold">{selectedRequest.remarks}</p>
                </div>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Your Remarks (Optional):</label>
              <textarea
                value={approvalRemarks}
                onChange={(e) => setApprovalRemarks(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="3"
                placeholder="Enter your remarks..."
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowApprovalModal(false)}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={submitApprovalDecision}
                className={`flex-1 px-4 py-2 text-black rounded ${
                  approvalAction === 'approve'
                    ? 'bg-green-500 hover:bg-green-600'
                    : 'bg-red-500 hover:bg-red-600'
                }`}
                disabled={loading}
              >
                {loading ? 'Processing...' : (approvalAction === 'approve' ? 'Approve' : 'Reject')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
