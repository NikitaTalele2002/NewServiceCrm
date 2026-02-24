import { useState, useEffect, useCallback } from 'react';
import { formatOptions, normalizeResponse } from '../utils/formatters';

/**
 * useCascadingSelectors Hook
 * Manages cascading select dropdowns (group → type → model → spare)
 * Eliminates 50-70 lines of duplicate code from 5+ files
 * 
 * Usage:
 * const { selectedValues, options, loading, handleSelect } = useCascadingSelectors({
 *   chain: ['productGroup', 'productType', 'model', 'spare'],
 *   apiEndpoints: {
 *     productGroup: '/api/master-data?type=productgroup',
 *     productType: (parentId) => `/api/master-data?type=product&groupId=${parentId}`,
 *     model: (parentId) => `/api/master-data?type=models&productId=${parentId}`,
 *     spare: (parentId) => `/api/master-data?type=spares&modelId=${parentId}`
 *   }
 * });
 */
export const useCascadingSelectors = (config = {}) => {
  const {
    chain = [],
    apiEndpoints = {},
    dependencyFields = {},
    formatConfig = {},
  } = config;

  const [selectedValues, setSelectedValues] = useState(
    chain.reduce((acc, field) => ({ ...acc, [field]: '' }), {})
  );

  const [options, setOptions] = useState(
    chain.reduce((acc, field) => ({ ...acc, [field]: [] }), {})
  );

  const [loading, setLoading] = useState(
    chain.reduce((acc, field) => ({ ...acc, [field]: false }), {})
  );

  const [errors, setErrors] = useState({});

  // Load options for a specific level
  const loadLevelOptions = useCallback(
    async (level, parentValue = null) => {
      try {
        setLoading((prev) => ({ ...prev, [level]: true }));
        setErrors((prev) => ({ ...prev, [level]: '' }));

        const endpoint = apiEndpoints[level];
        if (!endpoint) {
          console.warn(`No API endpoint configured for level: ${level}`);
          return;
        }

        // Determine the URL based on endpoint type (string or function)
        let url;
        if (typeof endpoint === 'function') {
          url = endpoint(parentValue);
        } else {
          url = endpoint;
        }

        const token = localStorage.getItem('token');
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to load ${level} options`);
        }

        const data = await response.json();
        const normalizedData = normalizeResponse(data);
        const formattedOptions = formatOptions(normalizedData, formatConfig[level]);

        setOptions((prev) => ({
          ...prev,
          [level]: formattedOptions,
        }));
      } catch (err) {
        console.error(`Error loading ${level} options:`, err);
        setErrors((prev) => ({
          ...prev,
          [level]: err.message || `Failed to load ${level} options`,
        }));
        setOptions((prev) => ({
          ...prev,
          [level]: [],
        }));
      } finally {
        setLoading((prev) => ({ ...prev, [level]: false }));
      }
    },
    [apiEndpoints, formatConfig]
  );

  // Load initial (first level) options on mount
  useEffect(() => {
    if (chain.length > 0) {
      loadLevelOptions(chain[0]);
    }
  }, [chain, loadLevelOptions]);

  // Load dependent levels when parent value changes
  useEffect(() => {
    for (let i = 1; i < chain.length; i++) {
      const currentLevel = chain[i];
      const parentLevel = chain[i - 1];
      const parentValue = selectedValues[parentLevel];

      if (parentValue) {
        loadLevelOptions(currentLevel, parentValue);
      } else {
        // Clear this level and all dependent levels
        setSelectedValues((prev) => {
          const newValues = { ...prev };
          for (let j = i; j < chain.length; j++) {
            newValues[chain[j]] = '';
          }
          return newValues;
        });

        setOptions((prev) => {
          const newOptions = { ...prev };
          for (let j = i; j < chain.length; j++) {
            newOptions[chain[j]] = [];
          }
          return newOptions;
        });
      }
    }
  }, [selectedValues, chain, loadLevelOptions]);

  // Handle selection change
  const handleSelect = useCallback((level, value) => {
    const levelIndex = chain.indexOf(level);
    if (levelIndex === -1) {
      console.warn(`Level ${level} not found in chain`);
      return;
    }

    setSelectedValues((prev) => {
      const newValues = { ...prev, [level]: value };

      // Clear all dependent levels
      for (let i = levelIndex + 1; i < chain.length; i++) {
        newValues[chain[i]] = '';
      }

      return newValues;
    });
  }, [chain]);

  // Get value for a specific level
  const getValue = useCallback((level) => {
    return selectedValues[level] || '';
  }, [selectedValues]);

  // Get label for selected value
  const getLabel = useCallback((level) => {
    const value = selectedValues[level];
    if (!value) return '';

    const option = options[level]?.find((o) => String(o.id) === String(value));
    return option?.label || '';
  }, [selectedValues, options]);

  // Get options for a specific level
  const getLevelOptions = useCallback((level) => {
    return options[level] || [];
  }, [options]);

  // Check if level is disabled (parent not selected)
  const isLevelDisabled = useCallback((level) => {
    const levelIndex = chain.indexOf(level);
    if (levelIndex === 0) return false;

    const parentLevel = chain[levelIndex - 1];
    return !selectedValues[parentLevel];
  }, [chain, selectedValues]);

  // Reset all selections
  const resetAll = useCallback(() => {
    setSelectedValues(
      chain.reduce((acc, field) => ({ ...acc, [field]: '' }), {})
    );
  }, [chain]);

  // Reset from a specific level onwards
  const resetFrom = useCallback((level) => {
    const levelIndex = chain.indexOf(level);
    if (levelIndex === -1) return;

    setSelectedValues((prev) => {
      const newValues = { ...prev };
      for (let i = levelIndex; i < chain.length; i++) {
        newValues[chain[i]] = '';
      }
      return newValues;
    });
  }, [chain]);

  return {
    selectedValues,
    options,
    loading,
    errors,
    handleSelect,
    getValue,
    getLabel,
    getLevelOptions,
    isLevelDisabled,
    resetAll,
    resetFrom,
    loadLevelOptions,
  };
};

export default useCascadingSelectors;
