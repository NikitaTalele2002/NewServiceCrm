import { useState } from 'react';
import { searchService } from '../services/searchService';

const initialState = {
  mobileNo: '',
  altMobile: '',
  productSerialNo: '',
  customerCode: '',
  name: '',
  state: null,
  city: null,
  pincode: null,
};

export const useSearch = () => {
  const [searchForm, setSearchForm] = useState(initialState);
  const [searchResult, setSearchResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Update form field
  const updateSearchField = (field, value) => {
    setSearchForm((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  // Update multiple fields (for location selector)
  const updateSearchFields = (fields) => {
    setSearchForm((prev) => ({ ...prev, ...fields }));
  };

  // Validate form has at least one field filled
  const validateForm = () => {
    const isEmpty = Object.values(searchForm).every((val) => !val);
    if (isEmpty) {
      setError('Please enter at least one field before searching.');
      return false;
    }
    return true;
  };

  // Execute search
  const performSearch = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setError(null);
    setSearchResult(null);

    try {
      const result = await searchService.searchCustomers(searchForm);
      setSearchResult(result);
    } catch (err) {
      setError(err.message);
      setSearchResult(null);
    } finally {
      setLoading(false);
    }
  };

  // Clear form and reset
  const clearSearch = () => {
    setSearchForm(initialState);
    setSearchResult(null);
    setError(null);
  };

  // Reset after customer creation
  const resetSearchResult = () => {
    setSearchResult(null);
    setSearchForm(initialState);
  };

  return {
    searchForm,
    updateSearchField,
    updateSearchFields,
    searchResult,
    setSearchResult,
    loading,
    error,
    performSearch,
    clearSearch,
    resetSearchResult,
  };
};
