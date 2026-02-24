import React from 'react';

export default function ExistingProductsList({ products, onContinue, customer, onRegisterComplaint }) {
  if (!products || products.length === 0) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">📦 Registered Products</h3>
        <p className="text-blue-800 text-sm">
          No products registered for {customer.name} yet. Click "Register Product" to add one.
        </p>
        {customer && (
          <div className="mt-4">
            <button
              onClick={onContinue}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
            >
              ➕ Register Product
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">📦 Registered Products ({products.length})</h3>
      
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b">
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Serial No</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Product</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Model</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Purchase Date</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Warranty</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Qty</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product, idx) => (
              <tr key={idx} className="border-b hover:bg-gray-50 transition">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  {product.serial_no}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {product.product_name || product.Product?.product_name || 'Unknown'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {product.model_code || product.ProductModel?.MODEL_CODE || 'N/A'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {product.date_of_purchase ? new Date(product.date_of_purchase).toLocaleDateString() : 'N/A'}
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    product.warranty_status === 'Active' 
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {product.warranty_status || 'Active'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  {product.qty_with_customer || 1}
                </td>
                <td className="px-4 py-3 text-sm text-right">
                  {onRegisterComplaint && (
                    <button
                      onClick={() => onRegisterComplaint(product)}
                      className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold py-1 px-3 rounded-lg transition"
                    >
                      Register Complaint
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 pt-4 border-t">
        <button
          onClick={onContinue}
          className="w-full bg-blue-600 hover:bg-blue-700 text-black font-semibold py-3 px-4 rounded-lg transition duration-200"
        >
          ➕ Register Another Product
        </button>
      </div>
    </div>
  );
}
