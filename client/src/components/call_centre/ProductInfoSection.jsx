import React from 'react';

export default function ProductInfoSection({ selectedProduct }) {
  const fields = [
    ['Brand', selectedProduct?.Brand],
    ['Product Category', selectedProduct?.ProductGroupName || selectedProduct?.ProductGroup],
    ['Product Name', selectedProduct?.ProductName],
    ['Product Model', selectedProduct?.ModelName || selectedProduct?.Model],
    ['Serial No.', selectedProduct?.ProductSerialNo],
    ['Warranty Status', selectedProduct?.WarrantyStatus],
    ['Purchase Date', selectedProduct?.PurchaseDate ? new Date(selectedProduct.PurchaseDate).toLocaleDateString() : '-'],
    ['Dealer Name', selectedProduct?.DealerName],
    ['Previous Calls', selectedProduct?.PreviousCalls || '0'],
  ];

  return (
    <div className="mb-6 p-6 bg-green-50 rounded-lg shadow">
      <h4 className="font-semibold text-lg mb-4 text-gray-800">Product Information</h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {fields.map(([label, value]) => (
          <div key={label} className="bg-white p-4 rounded border border-green-200">
            <p className="text-xs text-gray-600 font-semibold uppercase mb-1">{label}</p>
            <p className="text-gray-800 font-medium text-sm">{value ?? '-'}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
