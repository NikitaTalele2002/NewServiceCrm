import { useState, useCallback } from 'react';
import {
  getProductGroupsApi,
  getProductsByGroupApi,
  getModelsByProductApi,
  getServiceCenterInventoryApi
} from '../services/inventoryService';

export const useInventoryFilters = () => {
  const [productGroups, setProductGroups] = useState([]);
  const [products, setProducts] = useState([]);
  const [models, setModels] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchProductGroups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching product groups...');
      const data = await getProductGroupsApi();
      console.log('Product groups response:', data);
      const groups = Array.isArray(data) ? data : data?.data || data?.rows || [];
      setProductGroups(groups);
      return groups;
    } catch (err) {
      console.error('Error fetching product groups:', err);
      setError(err.message);
      setProductGroups([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProducts = useCallback(async (groupId) => {
    if (!groupId) {
      setProducts([]);
      return [];
    }
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching products for group:', groupId);
      const data = await getProductsByGroupApi(groupId);
      console.log('Products response:', data);
      const prods = Array.isArray(data) ? data : data?.data || data?.rows || [];
      setProducts(prods);
      return prods;
    } catch (err) {
      console.error('Error fetching products:', err);
      setError(err.message);
      setProducts([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchModels = useCallback(async (productId) => {
    if (!productId) {
      setModels([]);
      return [];
    }
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching models for product:', productId);
      const data = await getModelsByProductApi(productId);
      console.log('Models response:', data);
      const mods = Array.isArray(data) ? data : data?.data || data?.rows || [];
      setModels(mods);
      return mods;
    } catch (err) {
      console.error('Error fetching models:', err);
      setError(err.message);
      setModels([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching inventory...');
      const data = await getServiceCenterInventoryApi();
      console.log('Inventory response:', data);
      const inv = Array.isArray(data) ? data : data?.data || data?.inventory || data?.rows || [];
      setInventory(inv);
      return inv;
    } catch (err) {
      console.error('Error fetching inventory:', err);
      setError(err.message);
      setInventory([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    productGroups,
    products,
    models,
    inventory,
    loading,
    error,
    fetchProductGroups,
    fetchProducts,
    fetchModels,
    fetchInventory
  };
};
