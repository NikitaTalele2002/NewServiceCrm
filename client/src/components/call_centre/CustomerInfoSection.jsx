import React from 'react';

export default function CustomerInfoSection({ customer, selectedProduct }) {
  const customerData = customer || selectedProduct?.Customer || {};
  
  const fields = [
    ['Name', customerData?.Name],
    ['Mobile', customerData?.MobileNo],
    ['Email', customerData?.Email],
    ['House Number', customerData?.HouseNumber],
    ['Building Name', customerData?.BuildingName],
    ['Street Name', customerData?.StreetName],
    ['Landmark', customerData?.Landmark],
    ['Area', customerData?.Area],
    ['City', customerData?.City],
    ['State', customerData?.State],
    ['Pin Code', customerData?.PinCode],
  ];

  return (
    <div className="mb-6 p-6 bg-blue-50 rounded-lg shadow">
      <h4 className="font-semibold text-lg mb-4 text-gray-800">Customer Information</h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {fields.map(([label, value]) => (
          <div key={label} className="bg-white p-4 rounded border border-blue-200">
            <p className="text-xs text-gray-600 font-semibold uppercase mb-1">{label}</p>
            <p className="text-gray-800 font-medium text-sm">{value || '-'}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
