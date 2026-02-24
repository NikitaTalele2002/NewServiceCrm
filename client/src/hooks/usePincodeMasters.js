import { useState, useEffect, useCallback } from 'react';
import { useLocation } from './useLocation';

export const usePincodeMasters = () => {
  const {
    states,
    cities,
    pincodes,
    loading,
    error,
    getStates,
    getCities,
    getPincodes,
    uploadLocationExcel
  } = useLocation();

  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedPincode, setSelectedPincode] = useState('');

  // Load states initially
  useEffect(() => {
    getStates();
  }, [getStates]);

  // Reload cities when state changes
  useEffect(() => {
    setSelectedCity('');
    setSelectedPincode('');
    if (selectedState) getCities(selectedState);
  }, [selectedState, getCities]);

  // Reload pincodes when city changes
  useEffect(() => {
    setSelectedPincode('');
    if (selectedCity) getPincodes(selectedCity);
  }, [selectedCity, getPincodes]);

  const handleStateChange = useCallback((stateId) => {
    setSelectedState(stateId);
  }, []);

  const handleCityChange = useCallback((cityId) => {
    setSelectedCity(cityId);
  }, []);

  const handlePincodeChange = useCallback((pincodeId) => {
    setSelectedPincode(pincodeId);
  }, []);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    if (!selectedState || !selectedCity || !selectedPincode) {
      alert('Please select state, city and pincode.');
      return;
    }
    alert(`Saved: State=${selectedState}, City=${selectedCity}, Pincode=${selectedPincode}`);
  }, [selectedState, selectedCity, selectedPincode]);

  const handleUpload = useCallback(async (file, mode = 'replace') => {
    const result = await uploadLocationExcel(file, mode);
    if (result.success) {
      // Refresh states after upload
      getStates();
    }
    return result;
  }, [uploadLocationExcel, getStates]);

  return {
    states,
    cities,
    pincodes,
    selectedState,
    selectedCity,
    selectedPincode,
    loading,
    error,
    handleStateChange,
    handleCityChange,
    handlePincodeChange,
    handleSubmit,
    handleUpload
  };
};