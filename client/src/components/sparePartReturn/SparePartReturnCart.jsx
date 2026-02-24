import React from 'react';

export const SparePartReturnCart = ({ cart, removeFromCart }) => {
  if (cart.length === 0) return null;

  return (
    <div className="mb-6 p-4 border border-gray-300 rounded">
      <h3 className="text-lg font-semibold mb-2">Cart ({cart.length} items)</h3>
      <div className="space-y-2">
        {cart.map((item, index) => (
          <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
            <div>
              <span className="font-medium">{item.sku}</span> - {item.spareName} (Qty: {item.returnQty})
            </div>
            <button
              onClick={() => removeFromCart(index)}
              className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
            > Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
