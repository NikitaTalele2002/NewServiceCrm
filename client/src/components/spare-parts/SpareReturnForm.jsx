import React, { useEffect } from 'react';
import { FormInput, Button, FilterSelect } from '../common';
import { useFormState } from '../../hooks/useFormState';
import { useCascadingSelectors } from '../../hooks/useCascadingSelectors';
import { formatOptions, normalizeResponse } from '../../utils/formatters';

const SpareReturnForm = ({ onSubmit, loading, error }) => {
  // Use form state hook for basic fields
  const { formData, handleChange, handleValueChange, resetForm } = useFormState({
    returnType: '',
    quantity: '',
    reason: ''
  });

  // Use cascading selectors for product hierarchy
  const { selectedValues, options, loading: cascadeLoading, handleSelect } = useCascadingSelectors({
    chain: ['productGroup', 'productType', 'model', 'spare'],
    apiEndpoints: {
      productGroup: '/api/admin/master-data?type=productgroup',
      productType: (groupId) => `/api/admin/master-data?type=product&groupId=${groupId}`,
      model: (productId) => `/api/admin/master-data?type=models&productId=${productId}`,
      spare: (modelId) => `/api/admin/master-data?type=spares&modelId=${modelId}`
    }
  });

  // Load return types on mount
  const [returnTypeOptions, setReturnTypeOptions] = React.useState([]);

  React.useEffect(() => {
    const loadReturnTypes = async () => {
      setReturnTypeOptions([
        { id: 'defective', label: 'Defective' },
        { id: 'excess', label: 'Excess' },
        { id: 'damaged', label: 'Damaged' }
      ]);
    };
    loadReturnTypes();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit && onSubmit({
      ...formData,
      ...selectedValues
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FilterSelect
          label="Return Type"
          value={formData.returnType}
          onChange={(e) => handleValueChange('returnType', e.target.value)}
          options={returnTypeOptions}
          placeholder="Select return type"
          required
        />

        <FilterSelect
          label="Product Group"
          value={selectedValues.productGroup}
          onChange={(e) => handleSelect('productGroup', e.target.value)}
          options={options.productGroup}
          placeholder="Select product group"
          required
        />

        <FilterSelect
          label="Product Type"
          value={selectedValues.productType}
          onChange={(e) => handleSelect('productType', e.target.value)}
          options={options.productType}
          placeholder="Select product type"
          required
          disabled={!selectedValues.productGroup}
        />

        <FilterSelect
          label="Model"
          value={selectedValues.model}
          onChange={(e) => handleSelect('model', e.target.value)}
          options={options.model}
          placeholder="Select model"
          required
          disabled={!selectedValues.productType}
        />

        <FilterSelect
          label="Spare Part"
          value={selectedValues.spare}
          onChange={(e) => handleSelect('spare', e.target.value)}
          options={options.spare}
          placeholder="Select spare part"
          required
          disabled={!selectedValues.model}
        />

        <FormInput
          label="Quantity"
          name="quantity"
          type="number"
          value={formData.quantity}
          onChange={handleChange}
          placeholder="Enter quantity"
          required
          min="1"
        />
      </div>

      <FormInput
        label="Reason"
        name="reason"
        type="textarea"
        value={formData.reason}
        onChange={handleChange}
        placeholder="Enter reason for return"
        required
      />

      {error && (
        <div className="text-red-600 text-sm">{error}</div>
      )}

      <div className="flex justify-end">
        <Button
          type="submit"
          loading={loading}
          disabled={cascadeLoading.productGroup || cascadeLoading.productType || cascadeLoading.model || cascadeLoading.spare}
        >
          Add to Cart
        </Button>
      </div>
    </form>
  );
};

export default SpareReturnForm;