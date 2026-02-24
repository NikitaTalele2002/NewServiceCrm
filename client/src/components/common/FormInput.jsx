import React from 'react';

const FormInput = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder = '',
  required = false,
  error = '',
  disabled = false,
  className = '',
  inputClassName = '',
  labelClassName = '',
  ...props
}) => {
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const inputValue = type === 'checkbox' ? checked : value;
    onChange && onChange({ target: { name, value: inputValue } });
  };

  if (type === 'checkbox') {
    return (
      <div className={`flex items-center ${className}`}>
        <input
          type="checkbox"
          id={name}
          name={name}
          checked={value || false}
          onChange={handleChange}
          disabled={disabled}
          className={`h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded ${inputClassName}`}
          {...props}
        />
        <label
          htmlFor={name}
          className={`ml-2 block text-sm text-gray-900 ${labelClassName}`}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={name}
          className={`block text-sm font-medium text-gray-700 mb-1 ${labelClassName}`}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        type={type}
        id={name}
        name={name}
        value={value || ''}
        onChange={handleChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
          error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''
        } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''} ${inputClassName}`}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export default FormInput;