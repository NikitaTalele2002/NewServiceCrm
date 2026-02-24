import React from 'react';
import FormInput from '../common/FormInput';
import Button from '../common/Button';

export default function ProductSearchFilters({
  filters,
  onFilterChange,
  onSearch,
  onClear,
  loading
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-800">Search Products</h2>

      {/* Search Filters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-6 rounded-lg shadow">
        <FormInput
          label="Brand"
          type="text"
          name="Brand"
          placeholder="Enter brand name"
          value={filters.Brand}
          onChange={onFilterChange}
        />

        <FormInput
          label="Product Group"
          type="text"
          name="ProductGroup"
          placeholder="Enter product group"
          value={filters.ProductGroup}
          onChange={onFilterChange}
        />

        <FormInput
          label="Product Name"
          type="text"
          name="ProductName"
          placeholder="Enter product name"
          value={filters.ProductName}
          onChange={onFilterChange}
        />

        <FormInput
          label="Model"
          type="text"
          name="Model"
          placeholder="Enter model"
          value={filters.Model}
          onChange={onFilterChange}
        />

        <FormInput
          label="Product Serial No"
          type="text"
          name="ProductSerialNo"
          placeholder="Enter serial number"
          value={filters.ProductSerialNo}
          onChange={onFilterChange}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          onClick={onSearch}
          loading={loading}
          variant="primary"
        >
          Search
        </Button>

        <Button
          onClick={onClear}
          variant="secondary"
        >
          Clear
        </Button>
      </div>
    </div>
  );
}
