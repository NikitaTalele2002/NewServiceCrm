import { useState } from 'react';
import { callViewService } from '../services/callViewService';

export const useActionLog = () => {
  const [showActionLogModal, setShowActionLogModal] = useState(false);
  const [actionLogData, setActionLogData] = useState([]);
  const [loading, setLoading] = useState(false);

  const getToken = () => localStorage.getItem('token');

  const handleActionLog = async (callId) => {
    if (!callId) {
      alert('Call ID is required');
      return;
    }

    setLoading(true);
    try {
      const token = getToken();
      const data = await callViewService.fetchActionLog(callId, token);
      setActionLogData(data);
      setShowActionLogModal(true);
    } catch (error) {
      console.error('Error fetching action log:', error);
      alert('Error fetching action log');
    } finally {
      setLoading(false);
    }
  };

  return {
    showActionLogModal,
    setShowActionLogModal,
    actionLogData,
    loading,
    handleActionLog
  };
};
