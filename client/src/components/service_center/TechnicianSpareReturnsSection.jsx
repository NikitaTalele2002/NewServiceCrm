/**
 * TechnicianSpareReturnsSection.jsx
 * 
 * Component to display and process technician spare return requests
 * on the Service Center's Rental Returns page
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';

const TechnicianSpareReturnsSection = ({ serviceCenterId, refreshTrigger }) => {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [returnDetails, setReturnDetails] = useState(null);
  const [processingAction, setProcessingAction] = useState(null);
  const [actionRemarks, setActionRemarks] = useState('');
  const [receivedQuantities, setReceivedQuantities] = useState({});

  const [filter, setFilter] = useState('submitted'); // submitted, received, verified, all

  useEffect(() => {
    fetchTechnicianReturns();
  }, [serviceCenterId, filter, refreshTrigger]);

  const fetchTechnicianReturns = async () => {
    if (!serviceCenterId) {
      setError('Service Center ID not available');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.append('serviceCenterId', serviceCenterId);
      if (filter !== 'all') {
        params.append('status', filter);
      }

      const response = await axios.get(
        `/api/returns/technician-spare-returns/list?${params}`,
        {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }
      );

      if (response.data.success) {
        setReturns(response.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching technician returns:', err);
      setError(`Failed to fetch returns: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchReturnDetails = async (returnId) => {
    try {
      setLoading(true);

      const response = await axios.get(
        `/api/returns/technician-spare-returns/${returnId}/items`,
        {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }
      );

      if (response.data.success) {
        setReturnDetails(response.data.data);
        // Initialize received quantities with requested quantities
        const initialQtys = {};
        response.data.data.forEach(item => {
          initialQtys[item.return_item_id] = item.requested_qty;
        });
        setReceivedQuantities(initialQtys);
      }
    } catch (err) {
      console.error('Error fetching return details:', err);
      setError('Failed to fetch return details');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (returnRecord) => {
    setSelectedReturn(returnRecord);
    fetchReturnDetails(returnRecord.return_id);
  };

  const handleCloseDetails = () => {
    setSelectedReturn(null);
    setReturnDetails(null);
    setProcessingAction(null);
    setActionRemarks('');
  };

  const handleReceiveSparesToReturn = async () => {
    if (!selectedReturn) return;

    try {
      setLoading(true);

      const items = returnDetails.map(item => ({
        returnItemId: item.return_item_id,
        receivedQty: receivedQuantities[item.return_item_id] || item.requested_qty
      }));

      const response = await axios.post(
        `/api/technician-spare-returns/${selectedReturn.return_id}/receive`,
        {
          items,
          receivedRemarks: actionRemarks
        },
        {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }
      );

      if (response.data.success) {
        alert('✅ Spare return received successfully!');
        fetchTechnicianReturns();
        handleCloseDetails();
      }
    } catch (err) {
      console.error('Error receiving return:', err);
      alert(`Error: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyReturn = async () => {
    if (!selectedReturn) return;

    try {
      setLoading(true);

      const items = returnDetails.map(item => ({
        spare_id: item.spare_id,
        verified_qty: receivedQuantities[item.return_item_id] || item.received_qty || item.requested_qty,
        item_type: item.item_type
      }));

      const response = await axios.post(
        `/api/technician-spare-returns/${selectedReturn.return_id}/verify`,
        {
          items,
          verifiedRemarks: actionRemarks
        },
        {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }
      );

      if (response.data.success) {
        alert('✅ Spare return verified and inventory updated!');
        fetchTechnicianReturns();
        handleCloseDetails();
      }
    } catch (err) {
      console.error('Error verifying return:', err);
      alert(`Error: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityChange = (returnItemId, newQty) => {
    setReceivedQuantities(prev => ({
      ...prev,
      [returnItemId]: Math.max(0, parseInt(newQty) || 0)
    }));
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      submitted: 'bg-yellow-100 text-yellow-800',
      received: 'bg-blue-100 text-blue-800',
      verified: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getItemTypeBadge = (itemType) => {
    return itemType === 'defective' 
      ? 'bg-red-100 text-red-800' 
      : 'bg-orange-100 text-orange-800';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-gray-800 mb-4">
          🔧 Technician Spare Returns
        </h3>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {['submitted', 'received', 'verified', 'all'].map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-md font-medium transition ${
                filter === status
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
              {returns.length > 0 && filter === status && ` (${returns.length})`}
            </button>
          ))}
        </div>

        {error && (
          <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-md mb-4">
            ❌ {error}
          </div>
        )}

        {loading && !selectedReturn && (
          <div className="text-center py-8">
            <p className="text-gray-600">Loading technician spare returns...</p>
          </div>
        )}

        {!loading && returns.length === 0 && (
          <div className="text-center py-8 bg-gray-50 rounded-md">
            <p className="text-gray-600">No {filter === 'all' ? 'returns' : filter + ' returns'} found</p>
          </div>
        )}

        {/* Returns List */}
        {!loading && returns.length > 0 && !selectedReturn && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b-2 border-gray-300">
                  <th className="px-4 py-3 text-left font-semibold">Return #</th>
                  <th className="px-4 py-3 text-left font-semibold">Technician</th>
                  <th className="px-4 py-3 text-left font-semibold">Phone</th>
                  <th className="px-4 py-3 text-center font-semibold">Defective</th>
                  <th className="px-4 py-3 text-center font-semibold">Unused</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-left font-semibold">Date</th>
                  <th className="px-4 py-3 text-center font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {returns.map((ret) => (
                  <tr key={ret.return_id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-blue-600 font-semibold">
                      {ret.return_number}
                    </td>
                    <td className="px-4 py-3">{ret.technician_name}</td>
                    <td className="px-4 py-3 text-sm">{ret.technician_phone}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-block bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-semibold">
                        {ret.defective_count || 0} ({ret.defective_qty || 0})
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-block bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-semibold">
                        {ret.unused_count || 0} ({ret.unused_qty || 0})
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${getStatusBadgeColor(ret.return_status)}`}>
                        {ret.return_status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {new Date(ret.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleViewDetails(ret)}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium transition"
                      >
                        View & Process
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail View Modal */}
      {selectedReturn && returnDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-h-[90vh] overflow-y-auto w-full max-w-2xl p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-800">
                  Return Request: {selectedReturn.return_number}
                </h3>
                <p className="text-gray-600 mt-1">
                  Technician: <span className="font-semibold">{selectedReturn.technician_name}</span> 
                  ({selectedReturn.technician_phone})
                </p>
              </div>
              <button
                onClick={handleCloseDetails}
                className="text-gray-600 hover:text-gray-900 text-2xl font-bold"
              >
                ✕
              </button>
            </div>

            {/* Status Badge */}
            <div className="mb-4">
              <span className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${getStatusBadgeColor(selectedReturn.return_status)}`}>
                {selectedReturn.return_status.toUpperCase()}
              </span>
            </div>

            {/* Items Table */}
            <div className="mb-6">
              <h4 className="font-semibold text-gray-800 mb-3">Items to Return</h4>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">Spare Code</th>
                      <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">Description</th>
                      <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold">Type</th>
                      <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold">Requested</th>
                      {selectedReturn.return_status !== 'submitted' && (
                        <>
                          <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold">Received</th>
                          {selectedReturn.return_status === 'verified' && (
                            <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold">Verified</th>
                          )}
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {returnDetails.map((item) => (
                      <tr key={item.return_item_id} className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-3 py-2 font-mono text-sm">
                          {item.spare_code}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-sm">
                          {item.spare_name}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${getItemTypeBadge(item.item_type)}`}>
                            {item.item_type === 'defective' ? 'Defective' : 'Unused'}
                          </span>
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-center font-semibold">
                          {item.requested_qty}
                        </td>
                        {selectedReturn.return_status !== 'submitted' && (
                          <>
                            <td className="border border-gray-300 px-3 py-2 text-center">
                              {selectedReturn.return_status === 'submitted' ? (
                                <input
                                  type="number"
                                  value={receivedQuantities[item.return_item_id] || item.requested_qty}
                                  onChange={(e) =>
                                    handleQuantityChange(item.return_item_id, e.target.value)
                                  }
                                  className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                                  min="0"
                                />
                              ) : (
                                item.received_qty || 0
                              )}
                            </td>
                            {selectedReturn.return_status === 'verified' && (
                              <td className="border border-gray-300 px-3 py-2 text-center">
                                {item.verified_qty || item.received_qty || 0}
                              </td>
                            )}
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Action Remarks */}
            {['submitted', 'received'].includes(selectedReturn.return_status) && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {selectedReturn.return_status === 'submitted' ? 'Receiving Remarks' : 'Verification Remarks'}
                </label>
                <textarea
                  value={actionRemarks}
                  onChange={(e) => setActionRemarks(e.target.value)}
                  placeholder="Add any remarks about this return (condition, discrepancies, etc.)"
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 justify-end">
              <button
                onClick={handleCloseDetails}
                className="bg-gray-400 hover:bg-gray-500 text-white px-6 py-2 rounded-md font-medium transition"
              >
                Close
              </button>

              {selectedReturn.return_status === 'submitted' && (
                <button
                  onClick={handleReceiveSparesToReturn}
                  disabled={loading}
                  className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-6 py-2 rounded-md font-medium transition"
                >
                  {loading ? 'Processing...' : '📥 Receive Return'}
                </button>
              )}

              {selectedReturn.return_status === 'received' && (
                <button
                  onClick={handleVerifyReturn}
                  disabled={loading}
                  className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-6 py-2 rounded-md font-medium transition"
                >
                  {loading ? 'Processing...' : '✓ Verify & Update Inventory'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TechnicianSpareReturnsSection;
