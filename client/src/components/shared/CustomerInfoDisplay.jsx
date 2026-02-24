import React from 'react';

/**
 * Universal Customer Information Display Component
 * Works with both call objects and customer objects
 * @param {Object} data - Customer data (can be from call or customer object)
 * @param {string} bgColor - Background color class (default: bg-blue-50)
 * @param {string} titleColor - Title color class
 * @param {Function} getStateName - Optional function to lookup state description
 * @param {Function} getCityName - Optional function to lookup city description
 */
export default function CustomerInfoDisplay({ data, bgColor = 'bg-blue-50', titleColor = 'text-gray-800', getStateName, getCityName }) {
  // Support both call object and customer object structures
  const rawState = data?.State || data?.state || '';
  const rawCity = data?.City || data?.city || '';

  // Use provided lookup functions or fall back to raw values
  const stateName = getStateName && typeof getStateName === 'function' ? getStateName(rawState) || rawState : rawState;
  const cityName = getCityName && typeof getCityName === 'function' ? getCityName(rawCity) || rawCity : rawCity;

  const customerData = {
    name: data?.CustomerName || data?.Name || '',
    mobile: data?.MobileNo || data?.mobile || '',
    email: data?.Email || data?.email || '',
    houseNumber: data?.HouseNo || data?.HouseNumber || data?.houseNumber || '',
    buildingName: data?.BuildingName || data?.buildingName || '',
    streetName: data?.StreetName || data?.streetName || '',
    landmark: data?.Landmark || data?.landmark || '',
    area: data?.Area || data?.area || '',
    city: cityName,
    state: stateName,
    pinCode: data?.Pincode || data?.PinCode || data?.PIN || data?.pinCode || '',
  };

  const fields = [
    ['Name', customerData.name],
    ['Mobile', customerData.mobile],
    ['Email', customerData.email],
    ['House Number', customerData.houseNumber],
    ['Building Name', customerData.buildingName],
    ['Street Name', customerData.streetName],
    ['Landmark', customerData.landmark],
    ['Area', customerData.area],
    ['City', customerData.city],
    ['State', customerData.state],
    ['Pin Code', customerData.pinCode],
  ];

  return (
    <div className={`mb-6 p-4 ${bgColor} rounded`}>
      <h4 className={`font-semibold text-lg mb-3 ${titleColor}`}>Customer Information</h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {fields.map(([label, value]) => (
          <div key={label}>
            <label className="block text-sm font-medium text-gray-700">{label}</label>
            <input
              readOnly
              value={value || ''}
              className="w-full p-2 border rounded bg-white text-gray-700"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
