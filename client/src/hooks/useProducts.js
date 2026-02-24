import { useState, useCallback } from 'react';
import {
  searchProductsApi,
  getProductsByPhoneApi,
  getProductGroupsApi,
  getProductsApi,
  getModelsApi,
  searchCustomersApi,
  assignServiceCentreApi,
  createComplaintApi,
  getInventoryApi
} from '../services/productsService';

export const useProducts = () => {
  const [products, setProducts] = useState([]);
  const [productGroups, setProductGroups] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [models, setModels] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const searchProducts = useCallback(async (searchParams) => {
    setLoading(true);
    setError(null);
    try {
      const result = await searchProductsApi(searchParams);
      setProducts(result);
      return { success: true, data: result };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const getProductsByPhone = useCallback(async (phone) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getProductsByPhoneApi(phone);
      setProducts(result);
      return { success: true, data: result };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const getProductGroups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getProductGroupsApi();
      setProductGroups(result);
      return { success: true, data: result };
    } catch (err) {
      setError(err.message);
      console.error('Error fetching product groups:', err);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const getProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getProductsApi();
      setAllProducts(result);
      return { success: true, data: result };
    } catch (err) {
      setError(err.message);
      console.error('Error fetching products:', err);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const getModels = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getModelsApi();
      setModels(result);
      return { success: true, data: result };
    } catch (err) {
      setError(err.message);
      console.error('Error fetching models:', err);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const searchCustomers = useCallback(async (searchParams) => {
    setLoading(true);
    setError(null);
    try {
      const result = await searchCustomersApi(searchParams);
      setCustomers(result);
      return { success: true, data: result };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const assignServiceCentre = useCallback(async (assignmentData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await assignServiceCentreApi(assignmentData);
      return { success: true, data: result };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const createComplaint = useCallback(async (complaintData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await createComplaintApi(complaintData);
      return { success: true, data: result };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const getInventory = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getInventoryApi(filters);
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
    products,
    productGroups,
    allProducts,
    models,
    customers,
    inventory,
    loading,
    error,
    searchProducts,
    getProductsByPhone,
    getProductGroups,
    getProducts,
    getModels,
    searchCustomers,
    assignServiceCentre,
    createComplaint,
    getInventory
  };
};