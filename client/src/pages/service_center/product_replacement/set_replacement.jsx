import React from 'react';
import { useProductReplacement } from '../../../hooks/useProductReplacement';
import ProductReplacementForm from '../../../components/product_replacement/ProductReplacementForm';

export default function SetReplacement() {
  const {
    formData,
    options,
    loading,
    complaintLoading,
    isDataFetched,
    handleInputChange,
    handleSubmit,
    fetchComplaint
  } = useProductReplacement();

  return (
    <div>
      <ProductReplacementForm
        formData={formData}
        options={options}
        loading={loading}
        complaintLoading={complaintLoading}
        isDataFetched={isDataFetched}
        onInputChange={handleInputChange}
        onSubmit={handleSubmit}
        onCallIdBlur={fetchComplaint}
      />
    </div>
  );
}


