import { useState, useEffect, useCallback } from 'react';
import { rentalAllocationApi } from '../services/rentalAllocationService';

export const useRentalAllocation = () => {
  const [view, setView] = useState('list'); // 'list', 'detail', or 'return'
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [filters, setFilters] = useState({
    fromDate: '',
    toDate: '',
    callId: '',
    technician: '',
    status: 'All'
  });
  const [loading, setLoading] = useState(false);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const data = await rentalAllocationApi.fetchRequests(filters);
      setRequests(data);
    } catch (error) {
      console.error('Error fetching requests:', error);
      setRequests([]);
    }
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    if (view === 'list') {
      fetchRequests();
    }
  }, [view, fetchRequests]);

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleViewDetail = (request) => {
    setSelectedRequest(request);
    setView('detail');
  };

  const handleViewReturn = () => {
    setView('return');
  };

  const handleBack = () => {
    setView('list');
    setSelectedRequest(null);
  };

  return {
    view,
    requests,
    selectedRequest,
    filters,
    loading,
    fetchRequests,
    handleFilterChange,
    handleViewDetail,
    handleViewReturn,
    handleBack
  };
};
