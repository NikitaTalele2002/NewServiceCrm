import { useState, useCallback } from 'react';
import {
  getStatesApi,
  getCitiesApi,
  getPincodesApi,
  uploadLocationExcelApi
} from '../services/locationService';

export const useLocation = () => {
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [pincodes, setPincodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getStates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getStatesApi();
      setStates(result);
      return { success: true, data: result };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const getCities = useCallback(async (stateId) => {
    setLoading(true);
    setError(null);
    setCities([]); // Clear old cities immediately before fetching
    try {
      const result = await getCitiesApi(stateId);
      setCities(result);
      return { success: true, data: result };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const getPincodes = useCallback(async (cityId) => {
    setLoading(true);
    setError(null);
    setPincodes([]); // Clear old pincodes immediately before fetching
    try {
      const result = await getPincodesApi(cityId);
      setPincodes(result);
      return { success: true, data: result };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const uploadLocationExcel = useCallback(async (file, mode = 'replace') => {
    setLoading(true);
    setError(null);
    try {
      const result = await uploadLocationExcelApi(file, mode);
      return { success: true, data: result };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    states,
    cities,
    pincodes,
    loading,
    error,
    getStates,
    getCities,
    getPincodes,
    uploadLocationExcel
  };
};