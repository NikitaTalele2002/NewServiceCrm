import React from 'react';
import { FilterSelect } from '../common';

/**
 * UnifiedInventoryFilters Component
 * Replaces duplicate inventory filter implementations across multiple pages
 * Provides consistent cascading: productGroup → productType → model → spare
 * 
 * Usage:
 * <UnifiedInventoryFilters
 *   selectedValues={selectedValues}
 *   options={options}
 *   loading={loading}
 *   onSelect={handleSelect}
 *   onSearch={handleSearch}
 * />
 */
export default function UnifiedInventoryFilters({
  selectedValues = {},
  options = {},
  loading = {},
  onSelect,
  onSearch,
  onClear,
  searchLoading = false,
  includeFilter = 'all', // 'all', 'good', 'defective'
  includeSortBy = false,
  sortBy = 'sku',
  onSortChange = () => {}
}) {
  return (
    <div className="bg-white shadow rounded-lg p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Filter Inventory</h3>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        {/* Product Group Select */}
        <FilterSelect
          label="Product Group"
          value={selectedValues.productGroup || ''}
          onChange={(e) => onSelect('productGroup', e.target.value)}
          options={options.productGroup || []}
          placeholder="Select product group"
          disabled={loading.productGroup}
        />

        {/* Product Type Select */}
        <FilterSelect
          label="Product Type"
          value={selectedValues.productType || ''}
          onChange={(e) => onSelect('productType', e.target.value)}
          options={options.productType || []}
          placeholder="Select product type"
          disabled={!selectedValues.productGroup || loading.productType}
        />

        {/* Model Select */}
        <FilterSelect
          label="Model"
          value={selectedValues.model || ''}
          onChange={(e) => onSelect('model', e.target.value)}
          options={options.model || []}
          placeholder="Select model"
          disabled={!selectedValues.productType || loading.model}
        />

        {/* Spare Part Select */}
        <FilterSelect
          label="Spare Part"
          value={selectedValues.spare || ''}
          onChange={(e) => onSelect('spare', e.target.value)}
          options={options.spare || []}
          placeholder="Select spare part"
          disabled={!selectedValues.model || loading.spare}
        />
      </div>

      {/* Optional: Filter and Sort Row */}
      {(includeFilter !== false || includeSortBy) && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          {includeFilter !== false && (
            <FilterSelect
              label="Filter"
              value={includeFilter}
              onChange={(e) => onSortChange('filter', e.target.value)}
              options={[
                { id: 'all', label: 'All Items' },
                { id: 'good', label: 'Good Condition' },
                { id: 'defective', label: 'Defective' }
              ]}
            />
          )}

          {includeSortBy && (
            <FilterSelect
              label="Sort By"
              value={sortBy}
              onChange={(e) => onSortChange('sortBy', e.target.value)}
              options={[
                { id: 'sku', label: 'SKU' },
                { id: 'name', label: 'Name' },
                { id: 'qty', label: 'Quantity' }
              ]}
            />
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end">
        <button
          onClick={onClear}
          className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
        >
          Clear
        </button>
        <button
          onClick={onSearch}
          disabled={searchLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {searchLoading ? 'Searching...' : 'Search'}
        </button>
      </div>
    </div>
  );
}
