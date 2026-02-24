import { useState, useEffect } from 'react';
import { dcfService } from '../services/dcfService';

export const useDCF = () => {
  const [dcfData, setDcfData] = useState([]);
  const [filteredDcfData, setFilteredDcfData] = useState([]);
  const [dcfNoFilter, setDcfNoFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAllDCFData();
  }, []);

  useEffect(() => {
    // Filter data based on dcfNoFilter
    if (dcfNoFilter.trim() === '') {
      setFilteredDcfData(dcfData);
    } else {
      const filtered = dcfData.filter(item =>
        item.dcfNo.toString().toLowerCase().includes(dcfNoFilter.toLowerCase())
      );
      setFilteredDcfData(filtered);
    }
  }, [dcfData, dcfNoFilter]);

  const fetchAllDCFData = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please log in to access this page');
      return;
    }
    setLoading(true);
    try {
      const data = await dcfService.fetchAllDCFData(token);
      setDcfData(data);
      setError(null);
    } catch (error) {
      setError('Failed to load DCF data');
    } finally {
      setLoading(false);
    }
  };

  return {
    dcfData,
    filteredDcfData,
    dcfNoFilter,
    setDcfNoFilter,
    loading,
    error,
    refetch: fetchAllDCFData
  };
};

export const useDCFDetails = (requestId) => {
  const [request, setRequest] = useState(null);
  const [items, setItems] = useState([]);
  const [cnDate, setCnDate] = useState(null);
  const [cnValue, setCnValue] = useState(null);
  const [cnCount, setCnCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (requestId) fetchDetails(requestId);
  }, [requestId]);

  const fetchDetails = async (id) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const { request, items, cnDate: cnDateData, cnValue: cnValueData, cnCount: cnCountData } = await dcfService.fetchDCFDetails(id, token);
      setRequest(request);
      setItems(items);
      setCnDate(cnDateData);
      setCnValue(cnValueData);
      setCnCount(cnCountData);
      setError(null);
    } catch (err) {
      setError('Failed to load request details');
    } finally {
      setLoading(false);
    }
  };

  return {
    request,
    items,
    cnDate,
    cnValue,
    cnCount,
    loading,
    error,
    refetch: () => fetchDetails(requestId)
  };
};
