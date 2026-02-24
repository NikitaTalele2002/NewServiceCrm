import React from 'react';

export default function SearchResults({ customer }) {
  if (!customer) return null;

  return (
    <div className="mt-8 p-6 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg">
      <div className="flex items-start gap-3 mb-4">
        <span className="text-2xl">✓</span>
        <h3 className="text-lg font-semibold text-green-900">Customer Found</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Basic Info */}
        <div>
          <p className="text-xs text-gray-600 uppercase tracking-wide font-semibold">Name</p>
          <p className="text-lg font-semibold text-gray-900">{customer.name || 'N/A'}</p>
        </div>

        <div>
          <p className="text-xs text-gray-600 uppercase tracking-wide font-semibold">Mobile</p>
          <p className="text-lg font-semibold text-gray-900">{customer.mobileNo || 'N/A'}</p>
        </div>

        {customer.altMobile && (
          <div>
            <p className="text-xs text-gray-600 uppercase tracking-wide font-semibold">Alt Mobile</p>
            <p className="text-lg font-semibold text-gray-900">{customer.altMobile}</p>
          </div>
        )}

        {customer.customerCode && (
          <div>
            <p className="text-xs text-gray-600 uppercase tracking-wide font-semibold">Customer Code</p>
            <p className="text-lg font-semibold text-gray-900">{customer.customerCode}</p>
          </div>
        )}

        {customer.productSerialNo && (
          <div>
            <p className="text-xs text-gray-600 uppercase tracking-wide font-semibold">Serial No</p>
            <p className="text-lg font-semibold text-gray-900">{customer.productSerialNo}</p>
          </div>
        )}

        {/* Address */}
        {(customer.address || customer.city || customer.state) && (
          <div className="md:col-span-2">
            <p className="text-xs text-gray-600 uppercase tracking-wide font-semibold mb-1">Address</p>
            <p className="text-gray-900">
              {customer.address && <span>{customer.address}</span>}
              {customer.city && <span>{customer.city}</span>}
              {customer.state && <span>, {customer.state}</span>}
            </p>
          </div>
        )}

        {/* Additional Details */}
        {(customer.email || customer.pincode) && (
          <>
            {customer.email && (
              <div>
                <p className="text-xs text-gray-600 uppercase tracking-wide font-semibold">Email</p>
                <p className="text-gray-900">{customer.email}</p>
              </div>
            )}

            {customer.pincode && (
              <div>
                <p className="text-xs text-gray-600 uppercase tracking-wide font-semibold">Pincode</p>
                <p className="text-gray-900">{customer.pincode}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
