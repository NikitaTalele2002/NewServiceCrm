import React from 'react';

export default function CustomerResultsCard({ customer, onEdit, onContinue }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md mb-6 border-l-4 border-green-500">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">✓ Customer Found</h2>

      {/* Customer Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Basic Info */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Basic Information</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Name:</span>
              <span className="font-medium text-gray-900">{customer.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Mobile:</span>
              <span className="font-medium text-gray-900">{customer.mobile_no}</span>
            </div>
            {customer.alt_mob_no && (
              <div className="flex justify-between">
                <span className="text-gray-600">Alt Mobile:</span>
                <span className="font-medium text-gray-900">{customer.alt_mob_no}</span>
              </div>
            )}
            {customer.email && (
              <div className="flex justify-between">
                <span className="text-gray-600">Email:</span>
                <span className="font-medium text-gray-900">{customer.email}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Customer Code:</span>
              <span className="font-medium text-blue-600">{customer.customer_code}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Priority:</span>
              <span className="font-medium capitalize">{customer.customer_priority || customer.priority}</span>
            </div>
          </div>
        </div>

        {/* Address Info */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Address Information</h3>
          <div className="space-y-2 text-sm">
            {(customer.address?.house_no || customer.house_no) && (
              <div className="flex justify-between">
                <span className="text-gray-600">House No:</span>
                <span className="font-medium text-gray-900">{customer.address?.house_no || customer.house_no}</span>
              </div>
            )}
            {(customer.address?.street_name || customer.street_name) && (
              <div className="flex justify-between">
                <span className="text-gray-600">Street:</span>
                <span className="font-medium text-gray-900">{customer.address?.street_name || customer.street_name}</span>
              </div>
            )}
            {(customer.address?.building_name || customer.building_name) && (
              <div className="flex justify-between">
                <span className="text-gray-600">Building:</span>
                <span className="font-medium text-gray-900">{customer.address?.building_name || customer.building_name}</span>
              </div>
            )}
            {(customer.address?.area || customer.area) && (
              <div className="flex justify-between">
                <span className="text-gray-600">Area:</span>
                <span className="font-medium text-gray-900">{customer.address?.area || customer.area}</span>
              </div>
            )}
            {(customer.address?.landmark || customer.landmark) && (
              <div className="flex justify-between">
                <span className="text-gray-600">Landmark:</span>
                <span className="font-medium text-gray-900">{customer.address?.landmark || customer.landmark}</span>
              </div>
            )}
            {(customer.address?.pincode || customer.pincode) && (
              <div className="flex justify-between">
                <span className="text-gray-600">Pincode:</span>
                <span className="font-medium text-gray-900">{customer.address?.pincode || customer.pincode}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4 border-t">
        <button
          onClick={onContinue}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-black font-semibold py-3 px-4 rounded-lg transition duration-200"
        >
          📦 View Products / Register New
        </button>
        <button
          onClick={onEdit}
          className="flex-1 bg-gray-500 hover:bg-gray-600 text-black font-semibold py-3 px-4 rounded-lg transition duration-200"
        >
          ✎ Edit Customer Details
        </button>
      </div>
    </div>
  );
}
