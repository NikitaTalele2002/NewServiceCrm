import React from 'react';

const FilterSelect = ({
  label,
  value,
  onChange,
  options = [],
  placeholder = "Select an option",
  disabled = false,
  required = false,
  className = "",
  optionValue = "id",
  optionLabel = "label"
}) => {
  // Ensure options is always an array
  const safeOptions = Array.isArray(options) ? options : [];

  return (
    <div className={`mb-4 ${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={required}
        className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
          disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
        }`}
      >
        <option value="">{placeholder}</option>
        {safeOptions && safeOptions.length > 0 && safeOptions.map((option, index) => {
          if (!option) return null;
          
          const optionId = option[optionValue] || option.id;
          const optionText = option[optionLabel] || option.label || option.name || String(option);
          
          // Skip ID validation for empty/falsy IDs - they're placeholders
          if (!optionId) {
            // Don't log warning, just skip this option
            return null;
          }
          
          return (
            <option 
              key={`${optionId}-${index}`}
              value={optionId}
            >
              {optionText || 'Unknown'}
            </option>
          );
        })}
      </select>
      {safeOptions.length === 0 && !disabled && (
        <p className="text-xs text-gray-500 mt-1">No options available</p>
      )}
    </div>
  );
};

export default FilterSelect;