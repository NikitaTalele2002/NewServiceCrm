import { useState, useEffect } from 'react';
import { rentalReturnService } from '../services/rentalReturnService';

export const useRentalReturn = () => {
  const [view, setView] = useState('list'); // 'list', 'details', or 'approve'
  const [allocatedRequests, setAllocatedRequests] = useState([]); // For display
  const [pendingReturns, setPendingReturns] = useState([]); // New: pending return requests
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [technicians, setTechnicians] = useState([]);
  const [selectedTechnician, setSelectedTechnician] = useState('');
  const [inventoryType, setInventoryType] = useState('All');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [rentalReturns, setRentalReturns] = useState([]);
  const [returns, setReturns] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [approvalRemarks, setApprovalRemarks] = useState('');

  const token = localStorage.getItem('token');
  const serviceCenterId = localStorage.getItem('serviceCenterId');

  // Fetch allocated requests (legacy - keep for compatibility)
  const fetchAllocatedRequests = async () => {
    if (!token) {
      setError('No authentication token found');
      return;
    }
    setLoading(true);
    try {
      setError(null);
      setDebugInfo(`Fetching from: /api/spare-requests?status=Allocated (SC: ${serviceCenterId})`);
      
      const data = await rentalReturnService.getAllocatedRequests(token);
      const requestsArray = Array.isArray(data) ? data : [];
      
      console.log('✅ Allocated requests fetched:', {
        count: requestsArray.length,
        data: requestsArray
      });
      
      setAllocatedRequests(requestsArray);
      
      if (requestsArray.length === 0) {
        setError('No allocated requests found for your service center');
        setDebugInfo(`No data returned. Service Center: ${serviceCenterId}`);
      }
    } catch (error) {
      console.error('Error fetching allocated requests:', error);
      setError(`API Error: ${error.message}`);
      setDebugInfo(`Error details: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch pending return requests (NEW)
  const fetchPendingReturns = async () => {
    if (!token) {
      setError('No authentication token found');
      return;
    }
    setLoading(true);
    try {
      setError(null);
      console.log(`📋 Fetching pending return requests...`);
      
      const data = await rentalReturnService.getPendingReturnRequests(token);
      const returnsArray = Array.isArray(data) ? data : [];
      
      console.log('✅ Pending returns fetched:', {
        count: returnsArray.length,
        data: returnsArray
      });
      
      setPendingReturns(returnsArray);
      
      // Also set as allocated requests for display in list view
      setAllocatedRequests(returnsArray);
      
      if (returnsArray.length === 0) {
        setError('No pending return requests from technicians');
      }
    } catch (error) {
      console.error('Error fetching pending returns:', error);
      setError(`Failed to fetch pending returns: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch return request details
  const fetchReturnDetails = async (requestId) => {
    if (!token) {
      setError('No authentication token found');
      return;
    }
    setLoading(true);
    try {
      setError(null);
      const details = await rentalReturnService.getReturnRequestDetails(requestId, token);
      setSelectedReturn(details);
    } catch (error) {
      console.error('Error fetching return details:', error);
      setError(`Failed to fetch return details: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchTechnicianInventory = async (technicianId) => {
    if (!token || !technicianId) return;
    setLoading(true);
    try {
      setError(null);
      console.log(`🔄 Fetching inventory for technician ${technicianId}`);
      
      const data = await rentalReturnService.getTechnicianInventory(technicianId, token);
      console.log(`📦 Inventory response:`, data);
      
      // Handle both array and object responses
      const inventoryArray = Array.isArray(data) ? data : (data.data || data.inventory || []);
      console.log(`✅ Processing ${inventoryArray.length} inventory items`);
      
      setRentalReturns(inventoryArray);
      
      // Initialize returns with 0 quantities
      const initialReturns = {};
      if (Array.isArray(inventoryArray)) {
        inventoryArray.forEach(item => {
          initialReturns[item.id] = { goodQty: 0, defectiveQty: 0 };
        });
      }
      setReturns(initialReturns);
      
      // Show message if no inventory
      if (!inventoryArray || inventoryArray.length === 0) {
        console.warn(`⚠️ Technician ${technicianId} has no inventory for return`);
        setError(`Technician has no items available for return`);
      }
    } catch (error) {
      console.error('❌ Error fetching technician inventory:', error);
      setError(`Failed to fetch technician inventory: ${error.message}`);
      setRentalReturns([]);
      setReturns({});
    }
    setLoading(false);
  };

  // Handle return list view
  useEffect(() => {
    if (view === 'list') {
      fetchPendingReturns();
    }
  }, [view, token]);

  const handleSelectReturn = (returnRequest) => {
    console.log('🔍 Selected return request:', returnRequest);
    setSelectedReturn(returnRequest);
    setView('approve');
  };

  const handleSelectRequest = (request) => {
    setSelectedRequest(request);
    setView('return');
    fetchTechnicianInventory(request.technicianId);
  };

  const handleReturnChange = (itemId, type, value) => {
    setReturns(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [type]: parseInt(value) || 0
      }
    }));
  };

  const handleReturn = async () => {
    const returnItems = Object.entries(returns)
      .filter(([_, quantities]) => quantities.goodQty > 0 || quantities.defectiveQty > 0)
      .map(([itemId, quantities]) => {
        const item = rentalReturns.find(i => i.id === parseInt(itemId));
        return {
          inventoryItemId: item.id,
          spareId: item.spareId,
          sku: item.sku,
          name: item.name,
          goodQty: quantities.goodQty,
          defectiveQty: quantities.defectiveQty,
          technicianId: selectedRequest.technicianId
        };
      });

    if (returnItems.length === 0) {
      setError('No items to return');
      return;
    }

    try {
      setError(null);
      console.log('📤 Submitting return items:', returnItems);
      
      // Submit with technicianId so it routes to correct ASC
      const result = await rentalReturnService.submitReturns(
        returnItems,
        token,
        selectedRequest.technicianId
      );
      
      console.log('✅ Return submitted successfully:', result);
      // Refresh inventory after successful return
      fetchTechnicianInventory(selectedRequest.technicianId);
      setReturns({});
      setError(null);
      // Show success message
      alert(`Return submitted successfully!\nStatus: ${result.status}\n\nWaiting for service center approval.`);
    } catch (error) {
      console.error('Error returning parts:', error);
      setError(error.message || 'Failed to submit return');
    }
  };

  // Handle return approval (NEW)
  const handleApproveReturn = async () => {
    if (!selectedReturn) {
      setError('No return selected');
      return;
    }

    setApprovalLoading(true);
    try {
      setError(null);
      console.log(`✅ Approving return request ${selectedReturn.id}...`);
      
      const result = await rentalReturnService.approveReturnRequest(
        selectedReturn.id,
        token,
        approvalRemarks
      );
      
      console.log('✅ Return approved:', result);
      alert(`✅ Return request approved successfully!\nItems: ${result.itemsProcessed}\nTotal Qty: ${result.totalQtyApproved}`);
      
      // Refresh pending returns list
      await fetchPendingReturns();
      
      // Reset approval state and go back to list
      setSelectedReturn(null);
      setApprovalRemarks('');
      setView('list');
    } catch (error) {
      console.error('Error approving return:', error);
      setError(error.message || 'Failed to approve return');
    } finally {
      setApprovalLoading(false);
    }
  };

  const handleBack = () => {
    setView('list');
    setSelectedReturn(null);
    setSelectedRequest(null);
    setApprovalRemarks('');
  };

  const handleBackToRequests = () => {
    setView('return');
    setSelectedRequest(null);
  };

  return {
    view,
    setView,
    allocatedRequests,
    pendingReturns,
    selectedRequest,
    selectedReturn,
    technicians,
    selectedTechnician,
    inventoryType,
    fromDate,
    toDate,
    rentalReturns,
    returns,
    loading,
    approvalLoading,
    error,
    debugInfo,
    approvalRemarks,
    setApprovalRemarks,
    setSelectedRequest,
    setSelectedTechnician,
    setInventoryType,
    setFromDate,
    setToDate,
    handleFilterChange: (field, value) => {
      if (field === 'technician') setSelectedTechnician(value);
      if (field === 'inventoryType') setInventoryType(value);
      if (field === 'fromDate') setFromDate(value);
      if (field === 'toDate') setToDate(value);
    },
    handleSelectRequest,
    handleSelectReturn,
    handleReturnChange,
    handleReturn,
    handleApproveReturn,
    handleBack,
    handleBackToRequests,
    fetchPendingReturns,
    fetchReturnDetails
  };
};