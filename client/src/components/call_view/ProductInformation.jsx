import React from 'react';

const ProductInformation = ({ call, findProductGroupName }) => {
  const productFields = [
    ["Brand", call.Brand || ''],
    ["Product Category", findProductGroupName(call.ProductGroup) || call.ProductGroup || ''],
    ["Product Name", call.Product || ''],
    ["Product Model", call.ModelDescription || call.Model || ''],
    ["Serial No.", call.ProductSerialNo || ''],
    ["Warranty Status", call.WarrantyStatus || ''],
    ["Purchase Date", call.PurchaseDate ? new Date(call.PurchaseDate).toLocaleDateString('en-GB') : ''],
    ["Dealer Name", call.DealerName || ''],
    ["Prev Calls", ''],
  ];

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-semibold mb-4">Product Information</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {productFields.map(([label, value]) => (
          <div key={label} className="bg-white p-4 rounded border border-gray-300">
            <p className="text-xs text-gray-600 font-semibold uppercase mb-1">{label}</p>
            <p className="text-gray-800 font-medium text-sm">{value ?? "-"}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductInformation;