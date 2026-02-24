import React, { useEffect, useState } from 'react';
import { useRole } from '../../context/RoleContext';

export default function RsmOrderRequests() {
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [approvals, setApprovals] = useState({}); // { itemId: approvedQty }
  const { user, role } = useRole();

  // Debug: Log when approvals change
  useEffect(() => {
    console.log('[State Change] Approvals updated:', approvals);
  }, [approvals]);

  // Helper to normalize status to lowercase
  const normalizeStatus = (status) => {
    if (!status) return 'pending';
    return String(status).toLowerCase().trim();
  };

  // Fetch order requests for RSM's plant
  useEffect(() => {
    async function fetchRequests() {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('http://localhost:5000/api/rsm/spare-requests', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        console.log('[API Response] Raw data:', data);
        
        // API returns { ok: true, requests: { legacy: [...], modern: [...] } }
        let allRequests = [];
        if (data.requests) {
          // Combine legacy and modern requests
          const legacy = data.requests.legacy || [];
          const modern = data.requests.modern || [];
          allRequests = [...legacy, ...modern];
        }
        
        // Transform API response to match component structure
        const transformed = Array.isArray(allRequests) ? allRequests.map(req => ({
          id: req.id || req.request_id || req.Id,
          requestId: req.request_id || req.RequestNumber || req.requestId,
          status: normalizeStatus(req.request_status || req.Status || req.status),
          createdAt: req.created_at || req.CreatedAt || req.createdAt || new Date().toISOString(),
          items: (req.items || req.Items || []).map(item => ({
            id: item.id || item.Id,
            sku: item.sku || item.Sku || item.PART || '',
            spareName: item.spareName || item.SpareName || item.DESCRIPTION || '',
            requestedQty: item.requestedQty || item.requested_qty || item.RequestedQty || 0,
            approvedQty: item.approvedQty || item.approved_qty || item.ApprovedQty || 0,
            availableQty: item.availableQty || item.available_qty || item.AvailableQty || 0
          }))
        })) : [];
        
        console.log('[API Response] Transformed requests:', transformed);
        setRequests(transformed);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    if (role === 'rsm') fetchRequests();
  }, [role, user]);

  // Show spare list for selected request
  function handleSelectRequest(request) {
    console.log('[DEBUG] Selected request:', request);
    console.log('[DEBUG] Request status:', request.status);
    console.log('[DEBUG] Items count:', request.items?.length || 0);
    setSelectedRequest(request);
  }

  // Handle approval qty input
  function handleApprovalQtyChange(itemId, value) {
    const numValue = typeof value === 'string' ? parseInt(value) || 0 : Number(value) || 0;
    setApprovals(prev => ({
      ...prev,
      [itemId]: numValue
    }));
  }

  // Submit approval
  async function handleApprove() {
    console.log('[handleApprove] Called. Selected request:', selectedRequest);
    console.log('[handleApprove] Current approvals:', approvals);
    
    if (!selectedRequest || Object.keys(approvals).length === 0) {
      alert('Please enter approved quantities for at least one item');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const approvalsForApi = {};
      for (const [itemId, approvedQty] of Object.entries(approvals)) {
        approvalsForApi[itemId] = { approvedQty };
      }
      
      const res = await fetch(
        `http://localhost:5000/api/rsm/spare-requests/${selectedRequest.id}/approve`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ approvals: approvalsForApi })
        }
      );
      
      const data = await res.json();
      
      if (res.ok) {
        alert('Request approved successfully!');
        setApprovals({});
        setSelectedRequest(null);
        // Refresh requests
        const refreshRes = await fetch('http://localhost:5000/api/rsm/spare-requests', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await refreshRes.json();
        
        let allRequests = [];
        if (result.requests) {
          const legacy = result.requests.legacy || [];
          const modern = result.requests.modern || [];
          allRequests = [...legacy, ...modern];
        }
        
        const transformed = Array.isArray(allRequests) ? allRequests.map(req => ({
          id: req.id || req.request_id || req.Id,
          requestId: req.request_id || req.RequestNumber || req.requestId,
          status: normalizeStatus(req.request_status || req.Status || req.status),
          createdAt: req.created_at || req.CreatedAt || req.createdAt || new Date().toISOString(),
          items: (req.items || req.Items || []).map(item => ({
            id: item.id || item.Id,
            sku: item.sku || item.Sku || item.PART || '',
            spareName: item.spareName || item.SpareName || item.DESCRIPTION || '',
            requestedQty: item.requestedQty || item.requested_qty || item.RequestedQty || 0,
            approvedQty: item.approvedQty || item.approved_qty || item.ApprovedQty || 0
          }))
        })) : [];
        setRequests(transformed);
      } else {
        alert('Error: ' + (data.error || 'Failed to approve'));
      }
    } catch (err) {
      alert('Error: ' + err.message);
      console.error('Error approving request:', err);
    }
  }

  // Submit rejection
  async function handleReject() {
    if (!selectedRequest) return;
    
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `http://localhost:5000/api/rsm/spare-requests/${selectedRequest.id}/reject`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ reason })
        }
      );
      
      const data = await res.json();
      
      if (res.ok) {
        alert('Request rejected successfully!');
        setApprovals({});
        setSelectedRequest(null);
        // Refresh requests
        const refreshRes = await fetch('http://localhost:5000/api/rsm/spare-requests', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await refreshRes.json();
        
        let allRequests = [];
        if (result.requests) {
          const legacy = result.requests.legacy || [];
          const modern = result.requests.modern || [];
          allRequests = [...legacy, ...modern];
        }
        
        const normalizeStatus = (status) => {
          if (!status) return 'pending';
          return String(status).toLowerCase().trim();
        };
        
        const transformed = Array.isArray(allRequests) ? allRequests.map(req => ({
          id: req.id || req.request_id || req.Id,
          requestId: req.request_id || req.RequestNumber || req.requestId,
          status: normalizeStatus(req.request_status || req.Status || req.status),
          createdAt: req.created_at || req.CreatedAt || req.createdAt || new Date().toISOString(),
          items: (req.items || req.Items || []).map(item => ({
            id: item.id || item.Id,
            sku: item.sku || item.Sku || item.PART || '',
            spareName: item.spareName || item.SpareName || item.DESCRIPTION || '',
            requestedQty: item.requestedQty || item.requested_qty || item.RequestedQty || 0,
            approvedQty: item.approvedQty || item.approved_qty || item.ApprovedQty || 0
          }))
        })) : [];
        setRequests(transformed);
      } else {
        alert('Error: ' + (data.error || 'Failed to reject'));
      }
    } catch (err) {
      alert('Error: ' + err.message);
      console.error('Error rejecting request:', err);
    }
  }

  return (
    <div className="flex gap-4 h-full">
      {/* LEFT SIDE - List of Requests */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6">Order Requests for Approval</h2>
          
          {loading && <div className="p-6 text-center">Loading...</div>}
          {error && <div className="p-6 text-red-600 text-center">Error: {error}</div>}
          {!loading && !error && requests.length === 0 && (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <div className="text-gray-500 mb-2">No order requests found</div>
            </div>
          )}
          
          {!loading && !error && requests.length > 0 && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-100 border-b">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Request ID</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Items</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Created</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Action</th>
                  </tr>
                {/* */}
                </thead>
                <tbody>
                  {requests.map(req => (
                    <tr key={req.id || req.requestId} className="border-b hover:bg-gray-50 transition">
                      <td className="px-4 py-3 font-medium text-blue-600">{req.requestId || req.id || 'N/A'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          req.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          req.status === 'approved_by_rsm' ? 'bg-green-100 text-green-800' :
                          req.status === 'rejected_by_rsm' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">{req.items.length} item(s)</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(req.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-center space-x-2 flex justify-center gap-2">
                        <button
                          onClick={() => {
                            handleSelectRequest(req);
                            setApprovals({});
                          }}
                          className="px-3 py-1 bg-blue-600 text-black text-xs rounded hover:bg-blue-700 transition"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT SIDE - Request Details & Approval Form */}
      {selectedRequest && (
        <div className="w-96 bg-white shadow-lg border-l overflow-y-auto">
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
            <div>
              <div className="text-xs text-gray-600">Request ID</div>
              <h3 className="font-bold text-lg">{selectedRequest.requestId || selectedRequest.id || 'N/A'}</h3>
            </div>
            <button
              onClick={() => setSelectedRequest(null)}
              className="text-gray-500 hover:text-gray-700 text-xl"> ✕
            </button>
          </div>

          <div className="p-4 space-y-4">
            {/* Request Info */}
            <div className="text-sm">
              <div className="text-gray-600">Status</div>
              <div className="font-semibold">{selectedRequest.status}</div>
            </div>

             <div className="text-sm">
              <div className="text-gray-600">Created</div>
              <div className="font-semibold">{new Date(selectedRequest.createdAt).toLocaleString()}</div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-bold mb-3">Items for Approval</h4>
              
              <div className="space-y-4">
                {selectedRequest.items && selectedRequest.items.map((item) => {
                  const itemKey = String(item.id || item.Id);
                  const approvedQty = approvals[itemKey] !== undefined ? Number(approvals[itemKey]) : 0;
                  const availableQty = item.availableQty || 0;  // Available at SOURCE plant/branch (what RSM can allocate)
                  const requestedQty = item.requestedQty || item.RequestedQty || 0;
                  const maxAllowed = Math.min(availableQty, requestedQty);  // Can't approve more than available OR requested
                  
                  console.log(`[Item ${itemKey}] Requested: ${requestedQty}, Available at source plant: ${availableQty}, Max approvable: ${maxAllowed}, State:`, approvals);
                  
                  const decreaseQty = () => {
                    const newQty = Math.max(0, approvedQty - 1);
                    console.log(`[Decrease] ${itemKey}: ${approvedQty} → ${newQty}`);
                    setApprovals(prev => ({
                      ...prev,
                      [itemKey]: newQty
                    }));
                  };
                  
                  const increaseQty = () => {
                    const newQty = Math.min(maxAllowed, approvedQty + 1);
                    console.log(`[Increase] ${itemKey}: ${approvedQty} → ${newQty}`);
                    setApprovals(prev => ({
                      ...prev,
                      [itemKey]: newQty
                    }));
                  };
                  
                  const handleChange = (newVal) => {
                    const val = newVal === '' ? 0 : parseInt(newVal) || 0;
                    const finalVal = Math.max(0, Math.min(maxAllowed, val));
                    console.log(`[Input] ${itemKey}: ${newVal} → ${finalVal}`);
                    setApprovals(prev => ({
                      ...prev,
                      [itemKey]: finalVal
                    }));
                  };
                  
                  return (
                    <div key={itemKey} className="border rounded p-3 bg-gray-50">
                      <div className="mb-2">
                        <div className="text-xs font-semibold text-gray-600 uppercase">PART Code</div>
                        <div className="font-medium text-sm">{item.sku}</div>
                      </div>
                      
                      <div className="mb-2">
                        <div className="text-xs font-semibold text-gray-600 uppercase">Description</div>
                        <div className="text-sm text-gray-700">{item.spareName || 'N/A'}</div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mb-2 text-sm">
                        <div>
                          <div className="text-xs font-semibold text-gray-600 uppercase">Requested</div>
                          <div className="font-bold text-blue-600">{requestedQty}</div>
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-gray-600 uppercase">Available</div>
                          <div className="font-bold text-green-600">{availableQty} (at plant)</div>
                        </div>
                      </div>

                      <div className="mb-3">
                        <label className="text-xs font-semibold text-gray-600 uppercase block mb-2">
                          Approve Quantity
                        </label>
                        <div className="flex items-center gap-2 mb-3">
                          <button
                            onClick={decreaseQty}
                            disabled={approvedQty === 0}
                            className="px-3 py-2 bg-red-500 text-black font-bold text-lg rounded hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                          >
                            −
                          </button>
                          <input
                            type="number"
                            min="0"
                            max={maxAllowed}
                            value={approvedQty}
                            onChange={e => handleChange(e.target.value)}

                            className="flex-1 border-2 border-blue-400 rounded p-3 text-lg font-bold text-center disabled:bg-gray-100 focus:outline-none focus:border-blue-600"
                          />
                          <button
                            onClick={increaseQty}
                            disabled={approvedQty >= maxAllowed}
                            className="px-3 py-2 bg-green-500 text-black font-bold text-lg rounded hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                          >
                            +
                          </button>
                        </div>
                        <div className="text-xs text-gray-500">
                          Approved: {approvedQty} of {maxAllowed} available | Requested: {requestedQty}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            {selectedRequest && selectedRequest.status === 'pending' && (
              <div className="border-t pt-4 space-y-2 sticky bottom-0 bg-white shadow-lg z-10">
                <button
                  onClick={handleApprove}
                  className="w-full px-4 py-4 bg-green-600 text-black font-bold text-lg rounded hover:bg-green-700 transition shadow-lg"
                  title="Click to approve the selected quantities"
                >
                  ✓ APPROVE REQUEST
                </button>
                <button
                  onClick={handleReject}
                  className="w-full px-4 py-4 bg-red-600 text-black font-bold text-lg rounded hover:bg-red-700 transition shadow-lg"
                  title="Click to reject this order request"
                >
                  ✕ REJECT REQUEST
                </button>
              </div>
            )}
            {selectedRequest && selectedRequest.status !== 'pending' && (
              <div className="border-t pt-4 bg-blue-50 rounded p-3 text-sm text-gray-600">
                <p className="font-semibold mb-1">Status: <span className="text-gray-800">{selectedRequest.status}</span></p>
                <p className="text-xs">This request has already been {selectedRequest.status === 'approved_by_rsm' ? 'approved' : 'processed'}.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}