import React from 'react';

const CustomerInformation = ({ call }) => {
  const fields = [
    ['Name', call.CustomerName],
    ['Mobile', call.MobileNo],
    ['Email', call.Email],
    ['House Number', call.HouseNo || call.HouseNumber],
    ['Building Name', call.BuildingName],
    ['Street Name', call.StreetName],
    ['Landmark', call.Landmark],
    ['Area', call.Area],
    ['City', call.City],
    ['State', call.State],
    ['Pin Code', call.Pincode || call.PinCode],
  ];

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-semibold mb-4">Customer Information</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {fields.map(([label, value]) => (
          <div key={label} className="bg-white p-4 rounded border border-gray-300">
            <p className="text-xs text-gray-600 font-semibold uppercase mb-1">{label}</p>
            <p className="text-gray-800 font-medium text-sm">{value || '-'}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CustomerInformation;