import React from 'react';
import LocationSelector from '../../components/LocationSelector';

export default function SearchFormFields({
  searchForm,
  updateSearchField,
  updateSearchFields,
  loading,
  onSearch,
  onClear,
}) {
  return (
    <form onSubmit={onSearch} className="space-y-6">
      {/* Main Search Fields Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Mobile No */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Mobile Number
          </label>
          <input
            name="mobileNo"
            type="tel"
            placeholder="Enter mobile number"
            value={searchForm.mobileNo}
            onChange={(e) => updateSearchField('mobileNo', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
        </div>

        {/* Alt Mobile */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Alternate Mobile
          </label>
          <input
            name="altMobile"
            type="tel"
            placeholder="Enter alternate mobile"
            value={searchForm.altMobile}
            onChange={(e) => updateSearchField('altMobile', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
        </div>

        {/* Product Serial No */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Product Serial Number
          </label>
          <input
            name="productSerialNo"
            type="text"
            placeholder="Enter product serial number"
            value={searchForm.productSerialNo}
            onChange={(e) => updateSearchField('productSerialNo', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
        </div>

        {/* Customer Code */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Customer Code
          </label>
          <input
            name="customerCode"
            type="text"
            placeholder="Enter customer code"
            value={searchForm.customerCode}
            onChange={(e) => updateSearchField('customerCode', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
        </div>

        {/* Customer Name */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Customer Name
          </label>
          <input
            name="name"
            type="text"
            placeholder="Enter customer name"
            value={searchForm.name}
            onChange={(e) => updateSearchField('name', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
        </div>
      </div>

      {/* Location Selector */}
      <div className="border-t pt-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Location (Optional)</h3>
        <LocationSelector
          value={{ state: searchForm.state, city: searchForm.city, pincode: searchForm.pincode }}
          onChange={(loc) =>
            updateSearchFields({
              state: loc.state,
              city: loc.city,
              pincode: loc.pincode,
            })
          }
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Searching...
            </>
          ) : (
            <>
              🔍 Search
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onClear}
          className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 font-semibold py-3 px-4 rounded-lg transition duration-200"
        >
          Clear
        </button>
      </div>
    </form>
  );
}
