import { useState, useEffect, useCallback } from 'react';
import { getServiceCenterReturnRequestsApi, getReturnRequestDetailsApi, getChallanDetailsApi } from '../services/printChallanService';

export const usePrintChallan = () => {
  const [returnRequests, setReturnRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [challanData, setChallanData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchReturnRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getServiceCenterReturnRequestsApi();
      console.log('📋 Fetched return requests:', result);
      setReturnRequests(result);
      return { success: true, data: result };
    } catch (err) {
      console.error('❌ Error fetching return requests:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const selectRequest = useCallback(async (requestId) => {
    if (!requestId) {
      setSelectedRequest(null);
      setChallanData(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Fetch request details
      const requestDetails = await getReturnRequestDetailsApi(requestId);
      console.log('📋 Fetched request details:', requestDetails);

      // Find the selected request from the list
      const selectedReq = returnRequests.find(req => req.requestId === parseInt(requestId));

      setSelectedRequest({
        ...selectedReq,
        ...requestDetails
      });

      // Fetch challan data
      const challan = await getChallanDetailsApi(requestId);
      console.log('📄 Fetched challan data:', challan);

      // Format challan data for display
      setChallanData({
        requestNumber: challan.requestNumber,
        status: challan.status,
        serviceCenterName: challan.serviceCenterName,
        serviceCenterEmail: challan.serviceCenterEmail,
        serviceCenterPhone: challan.serviceCenterPhone,
        createdDate: challan.createdDate,
        items: (challan.items || []).map((item, idx) => ({
          srNo: idx + 1,
          partCode: item.partCode,
          partDescription: item.partDescription,
          modelCode: item.modelCode,
          modelDescription: item.modelDescription,
          quantity: item.quantity
        })),
        totalItems: challan.totalItems,
        totalQuantity: challan.totalQuantity
      });

      return { success: true, data: challan };
    } catch (err) {
      console.error('❌ Error selecting request:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [returnRequests]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // Load return requests on mount
  useEffect(() => {
    fetchReturnRequests();
  }, [fetchReturnRequests]);

  return {
    returnRequests,
    selectedRequest,
    challanData,
    loading,
    error,
    fetchReturnRequests,
    selectRequest,
    handlePrint
  };
};