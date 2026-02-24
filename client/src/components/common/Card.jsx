import React from 'react';

const Card = ({
  children,
  title,
  className = '',
  headerClassName = '',
  bodyClassName = '',
  footer,
  footerClassName = ''
}) => {
  return (
    <div className={`bg-white shadow rounded-lg overflow-hidden ${className}`}>
      {title && (
        <div className={`px-4 py-5 sm:px-6 border-b border-gray-200 ${headerClassName}`}>
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            {title}
          </h3>
        </div>
      )}
      <div className={`px-4 py-5 sm:p-6 ${bodyClassName}`}>
        {children}
      </div>
      {footer && (
        <div className={`px-4 py-4 sm:px-6 border-t border-gray-200 bg-gray-50 ${footerClassName}`}>
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;