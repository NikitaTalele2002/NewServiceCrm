import React from 'react';

const ReplacementHistoryPagination = ({ pagination, onPageChange }) => {
  if (!pagination || pagination.pages <= 1) return null;

  return (
    <div className="flex justify-center mt-6">
      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
        <button
          onClick={() => onPageChange(pagination.page - 1)}
          disabled={pagination.page === 1}
          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
        >Previous
        </button>
        {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium ${
              page === pagination.page
                ? 'text-blue-600 bg-blue-50 border-blue-500'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            {page}
          </button>
        ))}
        <button
          onClick={() => onPageChange(pagination.page + 1)}
          disabled={pagination.page === pagination.pages}
          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
        >Next
        </button>
      </nav>
    </div>
  );
};

export default ReplacementHistoryPagination;