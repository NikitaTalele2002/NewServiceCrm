import { useState } from 'react';

/**
 * useFilterState Hook
 * Encapsulates filter state management and handlers
 * Eliminates duplicate filter logic across 8+ files
 * 
 * Usage:
 * const { filters, handleFilterChange, handleMultipleChange, resetFilters } = 
 *   useFilterState({ Brand: '', ProductGroup: '', Model: '' });
 */
export const useFilterState = (initialState) => {
  const [filters, setFilters] = useState(initialState);

  // Handle single filter change from input events
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle direct value change (non-event)
  const handleValueChange = (name, value) => {
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle multiple filter changes at once
  const handleMultipleChange = (changes) => {
    setFilters((prev) => ({
      ...prev,
      ...changes,
    }));
  };

  // Reset filters to initial state
  const resetFilters = () => setFilters(initialState);

  return {
    filters,
    handleFilterChange,
    handleValueChange,
    handleMultipleChange,
    resetFilters,
  };
};

export default useFilterState;
