import { useState, useCallback } from 'react';
import {
  getProductGroupsApi,
  getProductsByGroupApi,
  getSparesByGroupApi,
  getModelsByProductApi,
  getSparesByProductApi,
  getSparesByModelApi,
  getServiceCenterInventoryApi,
  getInventoryBySkuApi,
  getTechnicianInventoryApi,
  getServiceInventoryApi
} from '../services/inventoryService';

export const useInventory = () => {
  const [productGroups, setProductGroups] = useState([]);
  const [products, setProducts] = useState([]);
  const [models, setModels] = useState([]);
  const [spares, setSpares] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getProductGroups = useCallback(async () => {
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

  const getProductsByGroup = useCallback(async (groupId) => {
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

  const getSparesByGroup = useCallback(async (groupId) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getSparesByGroupApi(groupId);
      setSpares(result);
      return { success: true, data: result };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const getModelsByProduct = useCallback(async (productId) => {
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

  const getSparesByProduct = useCallback(async (productId) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getSparesByProductApi(productId);
      setSpares(result);
      return { success: true, data: result };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const getSparesByModel = useCallback(async (modelId) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getSparesByModelApi(modelId);
      setSpares(result);
      return { success: true, data: result };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const getServiceCenterInventory = useCallback(async () => {
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

  const getServiceInventory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getServiceInventoryApi();
      setInventory(result);
      return { success: true, data: result };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const getInventoryBySku = useCallback(async (sku) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getInventoryBySkuApi(sku);
      return { success: true, data: result };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const getTechnicianInventory = useCallback(async (technicianId) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getTechnicianInventoryApi(technicianId);
      setInventory(result);
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
    spares,
    inventory,
    loading,
    error,
    getProductGroups,
    getProductsByGroup,
    getSparesByGroup,
    getModelsByProduct,
    getSparesByProduct,
    getSparesByModel,
    getServiceCenterInventory,
    getServiceInventory,
    getInventoryBySku,
    getTechnicianInventory
  };
};