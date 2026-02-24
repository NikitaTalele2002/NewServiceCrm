import React from 'react';
import { DataTable, Button } from '../common';

const SpareReturnCart = ({ cart, onRemoveItem, onSubmitCart, loading }) => {
  const columns = [
    { key: 'spareName', header: 'Spare Part' },
    { key: 'quantity', header: 'Quantity' },
    { key: 'reason', header: 'Reason' },
    {
      key: 'actions',
      header: 'Actions',
      render: (item, index) => (
        <Button
          variant="danger"
          size="sm"
          onClick={() => onRemoveItem(index)}>
          Remove
        </Button>
      )
    }
  ];

  const totalItems = cart.reduce((sum, item) => sum + parseInt(item.quantity || 0), 0);

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Return Cart ({cart.length} items, Total: {totalItems})
        </h3>
        {cart.length > 0 && (
          <Button
            onClick={onSubmitCart}
            loading={loading}
            variant="success"
          >Submit Return Request
          </Button>
        )}
      </div>

      {cart.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No items in cart</p>
      ) : (
        <DataTable
          columns={columns}
          data={cart}
          emptyMessage="No items in cart"
        />
      )}
    </div>
  );
};

export default SpareReturnCart;