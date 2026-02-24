import { useState, useCallback } from 'react';
import {
  getServiceCenterReturnRequestsApi,
  getReturnRequestDetailsApi,
  createReturnRequestApi
} from '../services/returnsService';

export const useReturns = () => {
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
      setReturnRequests(result);
      return { success: true, data: result };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchReturnRequestDetails = useCallback(async (requestId) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getReturnRequestDetailsApi(requestId);
      setChallanData(result);
      return { success: true, data: result };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const createReturnRequest = useCallback(async (returnData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await createReturnRequestApi(returnData);
      return { success: true, data: result };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const selectRequest = useCallback((request) => {
    setSelectedRequest(request);
  }, []);

  return {
    returnRequests,
    selectedRequest,
    challanData,
    loading,
    error,
    fetchReturnRequests,
    fetchReturnRequestDetails,
    createReturnRequest,
    selectRequest
  };
};