import { useState, useEffect } from 'react';
import { searchClaimsApi, updateClaimApi, submitClaimApi } from '../services/claimService';

export const useClaims = () => {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const searchClaims = async (params) => {
    setLoading(true);
    setError(null);
    try {
      const data = await searchClaimsApi(params);
      setClaims(data.claims || data);
      return { success: true, data };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const updateClaim = async (claimData) => {
    try {
      const data = await updateClaimApi(claimData);
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const submitClaim = async (claimData) => {
    try {
      const data = await submitClaimApi(claimData);
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  return {
    claims,
    loading,
    error,
    searchClaims,
    updateClaim,
    submitClaim
  };
};