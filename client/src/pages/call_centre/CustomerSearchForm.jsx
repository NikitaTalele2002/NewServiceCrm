import React, { useState } from 'react';
import LocationSelector from '../../components/LocationSelector';

export default function CustomerSearchForm({ onCustomerFound, onNewCustomer, onNotFound, loading }) {
  const [searchForm, setSearchForm] = useState({
    mobileNo: '',
    altMobile: '',
    customerCode: '',
    name: '',
    state: '',
    city: '',
    pincode: '',
  });

  const [error, setError] = useState('');
  const [searching, setSearching] = useState(false);

  function updateSearchField(field, value) {
    setSearchForm((prev) => ({ ...prev, [field]: value }));
    setError('');
  }

  function updateSearchFields(updates) {
    setSearchForm((prev) => ({ ...prev, ...updates }));
  }

  const handleSearch = async (e) => {
    e.preventDefault();
    
    // Validate at least one field is filled
    const isEmpty = Object.values(searchForm).every((val) => !val);
    if (isEmpty) {
      setError('Please enter at least one search field');
      return;
    }

    setSearching(true);
    setError('');

    try {
      // Try mobile number first (most reliable)
      if (searchForm.mobileNo.trim()) {
        const cleanPhone = searchForm.mobileNo.trim();
        console.log('🔍 Searching customer by mobile:', cleanPhone);
        
        try {
          const res = await fetch(`http://localhost:5000/api/call-center/customer/${cleanPhone}`);

          // If backend returned non-OK, log and continue to fallback search
          if (!res.ok) {
            console.warn('Mobile lookup returned non-OK status', res.status);
          } else {
            const data = await res.json();
            console.log('📱 Mobile lookup response:', { 
              status: res.status, 
              success: data.success, 
              hasCustomer: !!data.customer,
              productCount: data.products?.length || 0
            });

            if (data && data.customer) {
              console.log('✓ Customer found via mobile!');
              onCustomerFound(data.customer, data.products || []);
              return;
            }
          }
          // For 404 or any other non-ok, we'll fall back to multi-criteria search
          if (res.status === 404) console.log('ℹ Customer not found by mobile, trying multi-criteria search...');
        } catch (err) {
          console.error('Mobile search error:', err);
          // Continue to multi-criteria search
        }
      }

      // Multi-criteria search fallback
      const payload = {};
      if (searchForm.mobileNo) payload.mobileNo = searchForm.mobileNo;
      if (searchForm.altMobile) payload.altMobile = searchForm.altMobile;
      if (searchForm.customerCode) payload.customerCode = searchForm.customerCode;
      if (searchForm.name) payload.name = searchForm.name;
      if (searchForm.state) payload.state = searchForm.state;
      if (searchForm.city) payload.city = searchForm.city;
      if (searchForm.pincode) payload.pincode = searchForm.pincode;

      console.log('🔍 Multi-criteria search with:', payload);

      const res = await fetch('http://localhost:5000/api/customers/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      console.log('📊 Multi-criteria search response:', { 
        status: res.status, 
        exists: data.exists,
        hasData: Array.isArray(data) && data.length > 0
      });

      if (res.ok) {
        if (data.exists && data.customer) {
          console.log('✓ Customer found via criteria!');
          console.log('📦 Customer object (criteria):', data.customer);
          onCustomerFound(data.customer, []);
        } else if (Array.isArray(data) && data.length > 0) {
          console.log('✓ Customer found in results!');
          console.log('📦 Customer object (array):', data[0]);
          onCustomerFound(data[0], []);
        } else {
          console.log('✗ No customer found - showing registration form');
          onNotFound?.();
        }
      } else {
        setError(data.error || 'Search failed. Try registering as new customer.');
        onNotFound?.();
      }
    } catch (err) {
      console.error('❌ Search error:', err);
      setError(`Error: ${err.message}`);
      onNotFound?.();
    } finally {
      setSearching(false);
    }
  };

  const handleClear = () => {
    setSearchForm({
      mobileNo: '',
      altMobile: '',
      customerCode: '',
      name: '',
      state: '',
      city: '',
      pincode: '',
    });
    setError('');
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mb-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">🔍 Search Customer</h2>
      
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded p-3">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSearch} className="space-y-6">
        {/* Main Search Fields Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Mobile No */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mobile Number
            </label>
            <input
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
              type="tel"
              placeholder="Enter alternate mobile"
              value={searchForm.altMobile}
              onChange={(e) => updateSearchField('altMobile', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>

          {/* Customer Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Customer Code
            </label>
            <input
              type="text"
              placeholder="Enter customer code"
              value={searchForm.customerCode}
              onChange={(e) => updateSearchField('customerCode', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>

          {/* Customer Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Customer Name
            </label>
            <input
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
            disabled={searching}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-black font-semibold py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center gap-2"
          >
            {searching ? (
              <>
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                Searching...
              </>
            ) : (
              <>🔍 Search</>
            )}
          </button>

          <button
            type="button"
            onClick={handleClear}
            className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 font-semibold py-3 px-4 rounded-lg transition duration-200"
          >
            Clear
          </button>

          <button
            type="button"
            onClick={onNewCustomer}
            className="flex-1 bg-green-600 hover:bg-green-700 text-black font-semibold py-3 px-4 rounded-lg transition duration-200"
          >
            + New Customer
          </button>
        </div>
      </form>
    </div>
  );
}
