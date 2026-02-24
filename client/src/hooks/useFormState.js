import { useState } from 'react';

/**
 * useFormState Hook
 * Encapsulates form state management and handlers
 * Eliminates duplicate form logic across 7+ files
 * 
 * Usage:
 * const { formData, handleChange, handleSetField, resetForm, errors, setErrors } = 
 *   useFormState({ name: '', email: '' }, (data) => submitForm(data));
 */
export const useFormState = (initialState) => {
  const [formData, setFormData] = useState(initialState);
  const [errors, setErrors] = useState({});

  // Handle input change events
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field if it exists
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  // Handle value change for programmatic updates (select, date, etc.)
  const handleValueChange = (name, value) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  // Set multiple form fields at once
  const handleSetFields = (fields) => {
    setFormData((prev) => ({
      ...prev,
      ...fields,
    }));
  };

  // Reset form to initial state
  const resetForm = () => {
    setFormData(initialState);
    setErrors({});
  };

  // Set validation errors
  const setFieldError = (field, error) => {
    setErrors((prev) => ({
      ...prev,
      [field]: error,
    }));
  };

  // Clear errors for a field
  const clearFieldError = (field) => {
    setErrors((prev) => ({
      ...prev,
      [field]: '',
    }));
  };

  // Check if form has any errors
  const hasErrors = Object.values(errors).some((err) => err !== '');

  return {
    formData,
    handleChange,
    handleValueChange,
    handleSetFields,
    resetForm,
    errors,
    setErrors,
    setFieldError,
    clearFieldError,
    hasErrors,
  };
};

export default useFormState;
