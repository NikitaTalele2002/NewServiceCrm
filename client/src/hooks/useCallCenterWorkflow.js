/**
 * Custom hooks for Call Center Workflow
 */

import { useState, useCallback } from "react";

/**
 * Hook to manage form state with validation
 */
export const useCallCenterForm = (initialState) => {
  const [formData, setFormData] = useState(initialState);

  const updateField = useCallback((fieldName, value) => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  }, []);

  const updateMultipleFields = useCallback((updates) => {
    setFormData((prev) => ({
      ...prev,
      ...updates,
    }));
  }, []);

  const resetForm = useCallback(() => {
    setFormData(initialState);
  }, [initialState]);

  return {
    formData,
    updateField,
    updateMultipleFields,
    resetForm,
  };
};

/**
 * Hook to manage API request state (loading, error, success)
 */
export const useAsyncRequest = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const executeRequest = useCallback(async (requestFn) => {
    setLoading(true);
    setError("");
    try {
      const result = await requestFn();
      return result;
    } catch (err) {
      const errorMessage = err?.message || "An error occurred";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError("");
  }, []);

  return {
    loading,
    error,
    executeRequest,
    clearError,
  };
};

/**
 * Hook to manage workflow step navigation
 */
export const useWorkflowSteps = (initialStep = "login") => {
  const [currentStep, setCurrentStep] = useState(initialStep);

  const goToStep = useCallback((step) => {
    setCurrentStep(step);
  }, []);

  const resetToStart = useCallback(() => {
    setCurrentStep(initialStep);
  }, [initialStep]);

  return {
    currentStep,
    goToStep,
    resetToStart,
  };
};
