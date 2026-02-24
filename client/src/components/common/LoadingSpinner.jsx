import React from 'react';

const LoadingSpinner = ({
  size = 'md',
  color = 'blue',
  className = '',
  text = ''
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  const colorClasses = {
    blue: 'border-blue-600',
    gray: 'border-gray-600',
    white: 'border-white'
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className={`animate-spin rounded-full border-b-2 ${sizeClasses[size]} ${colorClasses[color]}`}></div>
      {text && <span className="ml-2 text-gray-600">{text}</span>}
    </div>
  );
};

export default LoadingSpinner;