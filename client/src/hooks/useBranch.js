import { useState, useCallback } from 'react';
import {
  getBranchDashboardApi,
  getBranchesApi,
  getRsmBranchesApi,
  getServiceCentersByBranchApi,
  getBranchRequestsApi,
  approveBranchRequestApi,
  getBranchInventoryApi,
  adjustBranchInventoryApi,
  getBranchReturnRequestsApi,
  getBranchReturnRequestDetailsApi,
  createSpareRequestApi
} from '../services/branchService';

export const useBranch = () => {
  const [dashboard, setDashboard] = useState(null);
  const [branchRequests, setBranchRequests] = useState([]);
  const [branchInventory, setBranchInventory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getBranchDashboardApi();
      setDashboard(result);
      return { success: true, data: result };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const getBranchRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getBranchRequestsApi();
      setBranchRequests(result);
      return { success: true, data: result };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const approveBranchRequest = useCallback(async (requestId) => {
    setLoading(true);
    setError(null);
    try {
      const result = await approveBranchRequestApi(requestId);
      return { success: true, data: result };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const getBranchInventory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getBranchInventoryApi();
      setBranchInventory(result);
      return { success: true, data: result };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const adjustBranchInventory = useCallback(async (adjustData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await adjustBranchInventoryApi(adjustData);
      return { success: true, data: result };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const createSpareRequest = useCallback(async (requestData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await createSpareRequestApi(requestData);
      return { success: true, data: result };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const getBranches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getBranchesApi();
      return { success: true, data: result };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const getServiceCentersByBranch = useCallback(async (branchId) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getServiceCentersByBranchApi(branchId);
      return { success: true, data: result };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const getBranchReturnRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getBranchReturnRequestsApi();
      return { success: true, data: result };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const getBranchReturnRequestDetails = useCallback(async (requestId) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getBranchReturnRequestDetailsApi(requestId);
      return { success: true, data: result };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const getRsmBranches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getRsmBranchesApi();
      return { success: true, data: result };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    dashboard,
    branchRequests,
    branchInventory,
    loading,
    error,
    getDashboard,
    getBranchRequests,
    approveBranchRequest,
    getBranchInventory,
    adjustBranchInventory,
    createSpareRequest,
    getBranches,
    getRsmBranches,
    getServiceCentersByBranch,
    getBranchReturnRequests,
    getBranchReturnRequestDetails
  };
};
