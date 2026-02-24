import { useState, useCallback } from 'react';
import {
  getServiceCenterInventoryApi,
  getServiceCenterRequestsApi,
  createBranchRequestApi,
  getTechnicianInventoryApi,
  getTechniciansByCentreApi
} from '../services/serviceCenterService';

export const useServiceCenter = () => {
  const [inventory, setInventory] = useState([]);
  const [requests, setRequests] = useState([]);
  const [technicianInventory, setTechnicianInventory] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchServiceCenterInventory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getServiceCenterInventoryApi();
      setInventory(result);
      return { success: true, data: result };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchServiceCenterRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getServiceCenterRequestsApi();
      setRequests(result);
      return { success: true, data: result };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const createBranchRequest = useCallback(async (requestData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await createBranchRequestApi(requestData);
      return { success: true, data: result };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTechnicianInventory = useCallback(async (technicianId) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getTechnicianInventoryApi(technicianId);
      setTechnicianInventory(result);
      return { success: true, data: result };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);
  
  const fetchTechniciansByCentre = useCallback(async (centerId) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getTechniciansByCentreApi(centerId);
      setTechnicians(result.technicians || result.data || result);
      return { success: true, data: result };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    inventory,
    requests,
    technicianInventory,
    technicians,
    loading,
    error,
    fetchServiceCenterInventory,
    fetchServiceCenterRequests,
    createBranchRequest,
    fetchTechnicianInventory,
    fetchTechniciansByCentre
  };
};

