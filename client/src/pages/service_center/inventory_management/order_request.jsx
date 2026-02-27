import React, { useState, useEffect } from "react";
import OrderRequestModal from "./OrderRequestModal";
import OrderRequestCreate from "./OrderRequestCreate";
import OrderRequestDetails from "./OrderRequestDetails.jsx";
import OrderTrackingModal from "../../../components/OrderTrackingModal";
import { getApiUrl } from "../../../config/apiConfig";

export default function OrderRequest() {
  const [showCreateOrder, setShowCreateOrder] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [trackingModalOpen, setTrackingModalOpen] = useState(false);
  const [trackingRequestId, setTrackingRequestId] = useState(null);
  const [syncingToSAP, setSyncingToSAP] = useState(false);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    status: ''
  });

  // Fetch existing requests on mount
  useEffect(() => {
    fetchMyRequests();
  }, []);

  const fetchMyRequests = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const serviceCenterId = localStorage.getItem('serviceCenterId');
      
      let url = `/api/spare-requests?serviceCenterId=${serviceCenterId}`;
      
      if (filters.dateFrom) {
        url += `&dateFrom=${filters.dateFrom}`;
      }
      if (filters.dateTo) {
        url += `&dateTo=${filters.dateTo}`;
      }
      if (filters.status) {
        url += `&status=${filters.status}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch requests');
      
      const data = await response.json();
      setMyRequests(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
      console.error('Error fetching requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleApplyFilters = () => {
    fetchMyRequests();
  };

  const handleResetFilters = () => {
    setFilters({ dateFrom: '', dateTo: '', status: '' });
  };

  const handleRequestSubmitted = () => {
    fetchMyRequests();
  };

  const handleViewDetails = (requestId) => {
    setSelectedRequestId(requestId);
    setShowDetails(true);
  };

  const handleCloseDetails = () => {
    setShowDetails(false);
    setSelectedRequestId(null);
  };

  const handleTrackOrder = async (requestId) => {
    setSyncingToSAP(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(getApiUrl('/logistics/sync-sap'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ requestId })
      });

      if (res.ok) {
        const data = await res.json();
        setTrackingRequestId(requestId);
        setTrackingModalOpen(true);
      } else {
        let errorMessage = 'Failed to sync with SAP';
        try {
          const errorData = await res.json();
          if (errorData && errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (e) {
          // If response is not JSON, use status text
          errorMessage = res.statusText || 'Server error';
        }
        
        console.error(`Error (${res.status}): ${errorMessage}`);
        alert(`Error: ${errorMessage}`);
      }
    } catch (err) {
      console.error('Error syncing with SAP:', err);
      alert(`Error: ${err.message || 'Failed to connect to server'}`);
    } finally {
      setSyncingToSAP(false);
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

  const getStatusBadge = (status) => {
    const statusMap = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'approved': 'bg-green-100 text-green-800',
      'rejected': 'bg-red-100 text-red-800',
      'completed': 'bg-blue-100 text-blue-800'
    };
    return statusMap[status?.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Order Request</h2>
        <button 
          onClick={() => setShowCreateOrder(true)}
          className="bg-purple-600 text-black px-6 py-2 rounded hover:bg-purple-700 font-medium"
        > + Create Order Request
        </button>
      </div>

      {/* Filters Section */}
      <div className="bg-white border border-gray-300 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-lg mb-4">Filters</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {/* Date From */}
          <div>
            <label className="block text-sm font-medium mb-2">Request From Date</label>
            <input
              type="date"
              name="dateFrom"
              value={filters.dateFrom}
              onChange={handleFilterChange}
              className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-sm font-medium mb-2">To Date</label>
            <input
              type="date"
              name="dateTo"
              value={filters.dateTo}
              onChange={handleFilterChange}
              className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium mb-2">Request Status</label>
            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:border-blue-500">
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleApplyFilters}
            className="bg-blue-600 text-black px-6 py-2 rounded hover:bg-blue-700 font-medium">
            Search
          </button>
          <button
            onClick={handleResetFilters}
            className="border border-gray-300 text-gray-700 px-6 py-2 rounded hover:bg-gray-50 font-medium">
            Reset
          </button>
        </div>
      </div>

      {/* Requests List Section */}
      <div className="bg-white border border-gray-300 rounded-lg p-4">
        <h3 className="font-semibold text-lg mb-4">My Spare Requests</h3>

        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading requests...</div>
        ) : myRequests.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="p-3 text-left text-sm font-semibold">Request ID</th>
                  <th className="p-3 text-left text-sm font-semibold">Date</th>
                  <th className="p-3 text-left text-sm font-semibold">Items</th>
                  <th className="p-3 text-left text-sm font-semibold">Status</th>
                  <th className="p-3 text-left text-sm font-semibold">Order Type</th>
                  <th className="p-3 text-center text-sm font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {myRequests.map(request => (
                  <tr key={request.id || request.requestId} className="border-b hover:bg-gray-50">
                    <td className="p-3 text-sm font-medium">{request.requestId || request.id}</td>
                    <td className="p-3 text-sm">{formatDate(request.createdAt || request.date)}</td>
                    <td className="p-3 text-sm">{request.itemCount || 1}</td>
                    <td className="p-3 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(request.status)}`}>
                        {request.status || 'Pending'}
                      </span>
                    </td>
                    <td className="p-3 text-sm">{request.orderType || 'MSL'}</td>
                    <td className="p-3 text-center">
                      <button 
                        onClick={() => handleViewDetails(request.id)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium mr-3">
                        View Details
                      </button>
                      <button 
                        onClick={() => handleTrackOrder(request.id || request.requestId)}
                        disabled={syncingToSAP}
                        className="text-green-600 hover:text-green-800 text-sm font-medium disabled:text-gray-400"
                        title="Track order and view logistics documents">
                        {syncingToSAP ? 'Syncing...' : 'Track Order'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No requests found. Click "Create Order Request" to create one.
          </div>
        )}
      </div>

      {/* Modal for Create Order Request */}
      <OrderRequestModal 
        open={showCreateOrder} 
        onClose={() => setShowCreateOrder(false)}>
        <OrderRequestCreate 
          onBack={() => setShowCreateOrder(false)}
          onSubmit={handleRequestSubmitted}/>
      </OrderRequestModal>

      {/* Modal for View Order Request Details */}
      <OrderRequestModal 
        open={showDetails} 
        onClose={handleCloseDetails}>
        {selectedRequestId && (
          <OrderRequestDetails 
            requestId={selectedRequestId}
            onClose={handleCloseDetails}
          />
        )}
      </OrderRequestModal>

      {/* Order Tracking Modal */}
      {trackingModalOpen && trackingRequestId && (
        <OrderTrackingModal
          requestId={trackingRequestId}
          onClose={() => {
            setTrackingModalOpen(false);
            setTrackingRequestId(null);
          }}
        />
      )}
    </div>
  );
}
