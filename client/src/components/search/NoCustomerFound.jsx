import React from 'react';

export default function NoCustomerFound({ onAddNew }) {
  return (
    <div className="mt-8 p-8 bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-dashed border-amber-300 rounded-lg">
      <div className="flex flex-col items-center text-center">
        <span className="text-4xl mb-3">📭</span>
        <h3 className="text-xl font-semibold text-amber-900 mb-2">No Customer Found</h3>
        <p className="text-amber-800 mb-4 max-w-md">
          The customer you're looking for is not in our system. You can add them as a new customer.
        </p>

        <button
          onClick={onAddNew}
          className="bg-orange-600 hover:bg-orange-700 text-white font-semibold py-2 px-6 rounded-lg transition duration-200 flex items-center gap-2"
        >
          ➕ Add New Customer
        </button>
      </div>
    </div>
  );
}
