import { useState, useCallback } from 'react';
import {
  getProductGroupsApi,
  getProductsByGroupApi,
  getModelsByProductApi,
  getServiceCentersApi,
  getUsersApi,
  createReplacementRequestApi,
  getReplacementHistoryApi
} from '../services/replacementService';

export const useReplacement = () => {
  const [productGroups, setProductGroups] = useState([]);
  const [products, setProducts] = useState([]);
  const [models, setModels] = useState([]);
  const [serviceCenters, setServiceCenters] = useState([]);
  const [users, setUsers] = useState([]);
  const [replacementHistory, setReplacementHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchProductGroups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getProductGroupsApi();
      setProductGroups(result);
      return { success: true, data: result };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProductsByGroup = useCallback(async (groupId) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getProductsByGroupApi(groupId);
      setProducts(result);
      return { success: true, data: result };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchModelsByProduct = useCallback(async (productId) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getModelsByProductApi(productId);
      setModels(result);
      return { success: true, data: result };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchServiceCenters = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getServiceCentersApi();
      setServiceCenters(result);
      return { success: true, data: result };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getUsersApi();
      setUsers(result);
      return { success: true, data: result };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const createReplacementRequest = useCallback(async (replacementData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await createReplacementRequestApi(replacementData);
      return { success: true, data: result };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchReplacementHistory = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getReplacementHistoryApi(filters);
      setReplacementHistory(result);
      return { success: true, data: result };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    productGroups,
    products,
    models,
    serviceCenters,
    users,
    replacementHistory,
    loading,
    error,
    fetchProductGroups,
    fetchProductsByGroup,
    fetchModelsByProduct,
    fetchServiceCenters,
    fetchUsers,
    createReplacementRequest,
    fetchReplacementHistory
  };
};