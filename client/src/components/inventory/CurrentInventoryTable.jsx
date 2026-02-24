import React from 'react';
import { DataTable, LoadingSpinner, ErrorMessage } from '../common';

const CurrentInventoryTable = ({ inventory, loading, error, onRetry }) => {
  const columns = [
    { key: 'sku', header: 'Part Code' },
    { key: 'spareName', header: 'Part Description' },
    { key: 'remainingQty', header: 'Remaining Qty' },
    { key: 'location', header: 'Location' },
    { key: 'lastUpdated', header: 'Last Updated' }
  ];

  if (loading) {
    return <LoadingSpinner text="Loading inventory..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={onRetry} />;
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Inventory</h3>
      <DataTable
        columns={columns}
        data={inventory}
        emptyMessage="No inventory items found"
      />
    </div>
  );
};

export default CurrentInventoryTable;
