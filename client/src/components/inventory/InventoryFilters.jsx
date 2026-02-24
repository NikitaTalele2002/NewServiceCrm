import React from 'react';
import { FilterSelect, Button } from '../common';

const InventoryFilters = ({
  filters,
  options,
  onFilterChange,
  onSearch,
  loading
}) => {
  const handleSelectChange = (fieldName) => (value) => {
    onFilterChange(fieldName, value);
  };

  return (
    <div className="bg-white shadow rounded-lg p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Filter Inventory</h3>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <FilterSelect
          label="Product Group"
          value={filters.productGroup}
          onChange={handleSelectChange('productGroup')}
          options={options.productGroups}
          placeholder="Select product group"
        />

        <FilterSelect
          label="Product Type"
          value={filters.productType}
          onChange={handleSelectChange('productType')}
          options={options.products}
          placeholder="Select product type"
          disabled={!filters.productGroup}
        />

        <FilterSelect
          label="Model"
          value={filters.model}
          onChange={handleSelectChange('model')}
          options={options.models}
          placeholder="Select model"
          disabled={!filters.productType}
        />

      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-end">
          <Button
            onClick={onSearch}
            loading={loading}
            className="w-full">Search Inventory
          </Button>
        </div>
      </div>
    </div>
  );
};

export default InventoryFilters;