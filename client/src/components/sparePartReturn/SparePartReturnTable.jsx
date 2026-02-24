import React from 'react';

export const SparePartReturnTable = ({
  inventory,
  selectedItems,
  handleSelectItem,
  handleReturnQtyChange,
  loading
}) => {
  return (
    <div className="mb-6">
      <table className="w-full border-collapse border border-gray-300">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 p-2">Select</th>
            <th className="border border-gray-300 p-2">Part Code</th>
            <th className="border border-gray-300 p-2">Part Description</th>
            <th className="border border-gray-300 p-2">Remaining QTY</th>
            <th className="border border-gray-300 p-2">Return QTY</th>
          </tr>
        </thead>
        <tbody>
          {inventory.map(item => (
            <tr key={item.sku}>
              <td className="border border-gray-300 p-2 text-center">
                <input
                  type="checkbox"
                  checked={!!selectedItems[item.sku]}
                  onChange={(e) => handleSelectItem(item.sku, e.target.checked)}
                />
              </td>
              <td className="border border-gray-300 p-2">{item.sku}</td>
              <td className="border border-gray-300 p-2">{item.spareName}</td>
              <td className="border border-gray-300 p-2">{item.remainingQty}</td>
              <td className="border border-gray-300 p-2">
                <input
                  type="number"
                  min="0"
                  max={item.remainingQty}
                  value={selectedItems[item.sku]?.returnQty || ''}
                  onChange={(e) => handleReturnQtyChange(item.sku, e.target.value)}
                  className="w-full p-1 border border-gray-300 rounded"
                  disabled={!selectedItems[item.sku]}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {loading && <p className="mt-4">Loading...</p>}
    </div>
  );
};
