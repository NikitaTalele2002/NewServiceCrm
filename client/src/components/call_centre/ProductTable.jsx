import React from 'react';
import Button from '../common/Button';

export default function ProductTable({ rows, loading, onViewDetails, customer, onRegisterProduct }) {
  return (
    <div className="mt-6 overflow-auto">
      <table className="w-full border-collapse border border-gray-300">
        <thead>
          <tr className="bg-gray-200">
            <th className="border px-2 py-1 text-left">ID</th>
            <th className="border px-2 py-1 text-left">Brand</th>
            <th className="border px-2 py-1 text-left">Group</th>
            <th className="border px-2 py-1 text-left">Product</th>
            <th className="border px-2 py-1 text-left">Model</th>
            <th className="border px-2 py-1 text-left">Serial</th>
            <th className="border px-2 py-1 text-left">Customer Name</th>
            <th className="border px-2 py-1 text-left">Mobile</th>
            <th className="border px-2 py-1 text-left">Action</th>
          </tr>
        </thead>

        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan="9" className="text-center p-4 text-gray-600">
                {loading ? (
                  'Loading...'
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div>No products found</div>
                    {customer ? (
                      <div>
                        <Button onClick={onRegisterProduct} variant="primary" className="mt-2">
                          Register Product
                        </Button>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">Select or search a customer to register a product.</div>
                    )}
                  </div>
                )}
              </td>
            </tr>
          ) : (
            rows.map((product) => (
              <tr key={product.ProductID} className="hover:bg-gray-50">
                <td className="border px-2 py-1">{product.ProductID}</td>
                <td className="border px-2 py-1">{product.Brand}</td>
                <td className="border px-2 py-1">{product.ProductGroupName || product.Description || product.ProductGroup || ''}</td>
                <td className="border px-2 py-1">
                  {product.ProductGroupName ? `${product.ProductGroupName} - ${product.ProductName}` : product.ProductName}
                </td>
                <td className="border px-2 py-1">{product.ModelName || product.Model}</td>
                <td className="border px-2 py-1">{product.ProductSerialNo}</td>
                <td className="border px-2 py-1">{product.Customer?.Name || '-'}</td>
                <td className="border px-2 py-1">{product.Customer?.MobileNo || '-'}</td>
                <td className="border px-2 py-1">
                  <Button
                    onClick={() => onViewDetails(product)}
                    variant="primary"
                    className="text-sm py-1"
                  >
                    View Details
                  </Button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
