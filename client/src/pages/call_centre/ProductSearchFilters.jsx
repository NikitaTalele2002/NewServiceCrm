import React from 'react';
import FormInput from '../../components/common/FormInput';
import Button from '../../components/common/Button';

export default function ProductSearchFilters({ filters, onFilterChange, onSearch, loading }) {
  const handleChange = (e) => {
    const { name, value } = e.target;
    onFilterChange(name, value);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
      <FormInput
        type="text"
        name="Brand"
        placeholder="Brand"
        value={filters.Brand}
        onChange={handleChange}
      />

      <FormInput
        type="text"
        name="ProductGroup"
        placeholder="Product Group"
        value={filters.ProductGroup}
        onChange={handleChange}
      />

      <FormInput
        type="text"
        name="ProductName"
        placeholder="Product Name"
        value={filters.ProductName}
        onChange={handleChange}
      />

      <FormInput
        type="text"
        name="Model"
        placeholder="Model"
        value={filters.Model}
        onChange={handleChange}
      />

      <FormInput
        type="text"
        name="ProductSerialNo"
        placeholder="Serial No"
        value={filters.ProductSerialNo}
        onChange={handleChange}
      />

      <div className="flex gap-2">
        <Button
          onClick={onSearch}
          variant="primary"
          disabled={loading}
        >
          {loading ? 'Searching...' : 'Search'}
        </Button>
      </div>
    </div>
  );
}