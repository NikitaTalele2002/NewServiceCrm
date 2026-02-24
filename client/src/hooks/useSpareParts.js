import { useState, useCallback } from 'react';
import {
  getSparePartsApi,
  getSparePartsByFiltersApi,
  createSpareReturnRequestApi,
  getSpareInventoryApi
} from '../services/sparePartsService';

export const useSpareParts = () => {
  const [spareParts, setSpareParts] = useState([]);
  const [filteredSpareParts, setFilteredSpareParts] = useState([]);
  const [spareInventory, setSpareInventory] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchSpareParts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getSparePartsApi();
      setSpareParts(result);
      return { success: true, data: result };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSparePartsByFilters = useCallback(async (filters) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getSparePartsByFiltersApi(filters);
      setFilteredSpareParts(result);
      return { success: true, data: result };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSpareInventory = useCallback(async (centerId) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getSpareInventoryApi(centerId);
      setSpareInventory(result);
      return { success: true, data: result };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const createSpareReturnRequest = useCallback(async (returnData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await createSpareReturnRequestApi(returnData);
      return { success: true, data: result };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const addToCart = useCallback((item) => {
    setCart(prev => [...prev, item]);
  }, []);

  const removeFromCart = useCallback((index) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  return {
    spareParts,
    filteredSpareParts,
    spareInventory,
    cart,
    loading,
    error,
    fetchSpareParts,
    fetchSparePartsByFilters,
    fetchSpareInventory,
    createSpareReturnRequest,
    addToCart,
    removeFromCart,
    clearCart
  };
};

