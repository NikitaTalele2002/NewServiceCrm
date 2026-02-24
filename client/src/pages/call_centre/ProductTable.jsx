import React from 'react';

export default function ProductTable({ rows, loading, onViewDetails }) {
  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-2">Loading products...</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse border border-gray-300">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-2 py-2">Product ID</th>
            <th className="border px-2 py-2">Brand</th>
            <th className="border px-2 py-2">Product Group</th>
            <th className="border px-2 py-2">Product Name</th>
            <th className="border px-2 py-2">Model</th>
            <th className="border px-2 py-2">Serial No</th>
            <th className="border px-2 py-2">Customer Name</th>
            <th className="border px-2 py-2">Mobile</th>
            <th className="border px-2 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan="9" className="border px-2 py-4 text-center text-gray-500">
                No products found
              </td>
            </tr>
          ) : (
            rows.map((p) => (
              <tr key={p.ProductID} className="hover:bg-gray-50">
                <td className="border px-2 py-1">{p.ProductID}</td>
                <td className="border px-2 py-1">{p.Brand}</td>
                <td className="border px-2 py-1">{p.ProductGroupName || p.Description || p.ProductGroup || ""}</td>
                <td className="border px-2 py-1">{p.ProductGroupName ? `${p.ProductGroupName} - ${p.ProductName}` : p.ProductName}</td>
                <td className="border px-2 py-1">{p.ModelName || p.Model}</td>
                <td className="border px-2 py-1">{p.ProductSerialNo}</td>
                <td className="border px-2 py-1">{p.Customer?.Name || "-"}</td>
                <td className="border px-2 py-1">{p.Customer?.MobileNo || "-"}</td>
                <td className="border px-2 py-1">
                  <button
                    onClick={() => onViewDetails(p)}
                    className="bg-indigo-600 text-black px-2 py-1 rounded hover:bg-indigo-700">View Details
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}