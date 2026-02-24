import React from 'react';

/**
 * Universal Product Information Display Component
 * Works with both product details and product data from calls
 * @param {Object} product - Product data object
 * @param {string} bgColor - Background color class (default: bg-green-50)
 * @param {string} titleColor - Title color class
 * @param {Function} getProductGroupName - Optional function to lookup product group description
 */
export default function ProductInfoDisplay({ product, bgColor = 'bg-green-50', titleColor = 'text-gray-800', getProductGroupName }) {
  // Use provided lookup function or fall back to simple property access
  const resolveProductGroup = () => {
    if (getProductGroupName && typeof getProductGroupName === 'function') {
      const groupId = product?.ProductGroupName || product?.ProductGroup || product?.GroupName || product?.group;
      if (groupId) {
        const description = getProductGroupName(groupId);
        if (description) return description;
      }
    }
    // Fallback to direct property values
    return product?.ProductGroupName || product?.ProductGroup || product?.GroupName || product?.group || '';
  };

  const fields = [
    ['Brand', product?.Brand || product?.ProductBrand || product?.brand || ''],
    ['Product Category', resolveProductGroup()],
    ['Product Name', product?.Product || product?.ProductName || product?.Name || product?.name || ''],
    ['Product Model', product?.ModelDescription || product?.ModelName || product?.Model || product?.ProductModel || product?.model || ''],
    ['Serial No.', product?.ProductSerialNo || product?.SerialNo || product?.SerialNumber || product?.serialNo || ''],
    ['Warranty Status', product?.WarrantyStatus || product?.Warranty || product?.warranty || ''],
    [
      'Purchase Date',
      product?.PurchaseDate
        ? new Date(product.PurchaseDate).toLocaleDateString()
        : product?.purchaseDate
        ? new Date(product.purchaseDate).toLocaleDateString()
        : '-',
    ],
    ['Dealer Name', product?.DealerName || product?.dealerName || ''],
    ['Previous Calls', product?.PreviousCalls || product?.previousCalls || '0'],
  ];

  return (
    <div className={`mb-6 p-4 ${bgColor} rounded`}>
      <h4 className={`font-semibold text-lg mb-3 ${titleColor}`}>Product Information</h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {fields.map(([label, value]) => (
          <div key={label}>
            <label className="block text-sm font-medium text-gray-700">{label}</label>
            <input
              readOnly
              value={value ?? ''}
              className="w-full p-2 border rounded bg-white text-gray-700"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
