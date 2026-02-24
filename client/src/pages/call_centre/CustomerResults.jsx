import React from 'react';
import Button from '../../components/common/Button';

export default function CustomerResults({ searchResults, onSelectCustomer, onBackToSearch }) {
  return (
    <div>
      <div className="mb-4 flex justify-between">
        <h3 className="text-lg font-semibold">Customer Results</h3>
        <Button onClick={onBackToSearch} variant="secondary" className="text-sm">Back</Button>
      </div>

      <div className="space-y-3">
        {searchResults.length === 0 ? (
          <div className="text-gray-500">No customers found</div>
        ) : ( 
          searchResults.map((c) => (
            <div key={c.id || c.CustomerId || c.mobileNo} className="p-3 border rounded flex justify-between items-center">
              <div>
                <div className="font-semibold">{c.name || c.Name || c.customerName || c.CustomerName}</div>
                <div className="text-sm text-gray-600">{c.mobile || c.MobileNo || c.mobileNo}</div>
              </div>
              <div>
                <button onClick={() => onSelectCustomer(c)} className="px-3 py-1 bg-green-600 text-black rounded">Select</button>
                <button onClick={() => onSelectCustomer(c)} className="px-3 py-1 bg-green-600 text-black rounded">Deselect</button>
                <button onClick={() => onSelectProduct(p)} className="px-3 py-1 bg-red-600 text-red rounded">refresh</button>
              </div>
            </div>


          ))
        )}
      </div>
    </div>
  );
}
import React from 'react';

export default function CustomerResults({ searchResults, onSelectCustomer, onBackToSearch }) {
  return (
    <div className="bg-white p-6 rounded shadow mt-6">
      <h2 className="text-xl font-bold mb-4">Customer Search Results</h2>

      {searchResults.length === 0 ? (
        <p className="text-gray-500">No customers found.</p>
      ) : (
        <table className="w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-2 py-1">Name</th>
              <th className="border px-2 py-1">Mobile No</th>
              <th className="border px-2 py-1">State</th>
              <th className="border px-2 py-1">City</th>
              <th className="border px-2 py-1">Actions</th>
            </tr>
          </thead>
          <tbody>
            {searchResults.map((customer, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="border px-2 py-1">{customer.name || customer.Name}</td>
                <td className="border px-2 py-1">{customer.mobileNo || customer.MobileNo}</td>
                <td className="border px-2 py-1">{customer.state || customer.State}</td>
                <td className="border px-2 py-1">{customer.city || customer.City}</td>
                <td className="border px-2 py-1">
                  <button
                    onClick={() => onSelectCustomer(customer)}
                    className="bg-blue-600 text-black px-3 py-1 rounded hover:bg-blue-700"
                  >
                    Select
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <button
        onClick={onBackToSearch}
        className="mt-4 bg-gray-500 text-black px-4 py-2 rounded hover:bg-gray-600">
        Back to Search
      </button>
    </div>
  );
}