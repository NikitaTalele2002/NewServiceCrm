import React from 'react';
import { DataTable, LoadingSpinner, ErrorMessage } from '../common';

const TechnicianInventoryTable = ({ inventory, technician, loading, error, onRetry }) => {
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleDateString('en-IN', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch (e) {
      console.error('Date formatting error:', e);
      return 'N/A';
    }
  };

  const getSafeValue = (value, fallback = '-') => {
    if (value === null || value === undefined || value === '') return fallback;
    return value;
  };

  const columns = [
    { key: 'PART', header: 'SKU' },
    { key: 'DESCRIPTION', header: 'Part Name' },
    { key: 'qty_good', header: 'Good Qty' },
    { key: 'qty_defective', header: 'Defective Qty' },
    {
      key: 'total',
      header: 'Total',
      render: (item) => (item.qty_good || 0) + (item.qty_defective || 0)
    },
    {
      key: 'updated_at',
      header: 'Last Updated',
      render: (item) => formatDate(item.updated_at || item.created_at)
    }
  ];

  if (loading) {
    return <LoadingSpinner text="Loading technician inventory..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={onRetry} />;
  }

  if (!technician) {
    return (
      <div className="text-center py-8 text-gray-500">
        Please select a technician to view their inventory
      </div>
    );
  }

  // Map data to ensure safe display
  const mappedData = (inventory || []).map((item) => ({
    PART: getSafeValue(item.PART),
    DESCRIPTION: getSafeValue(item.DESCRIPTION),
    qty_good: getSafeValue(item.qty_good, 0),
    qty_defective: getSafeValue(item.qty_defective, 0),
    created_at: item.created_at,
    updated_at: item.updated_at
  }));

  // Debug logging
  console.log('📊 TechnicianInventoryTable - Raw inventory:', inventory);
  console.log('📊 TechnicianInventoryTable - Mapped data:', mappedData);
  console.log('📊 TechnicianInventoryTable - Technician:', technician);

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Inventory for {technician.Name || technician.technician_name || 'Technician'}
      </h3>
      
      {mappedData.length === 0 ? (
        <div className="text-center py-4 text-gray-500">
          No inventory items found for this technician
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider"
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {mappedData.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  {columns.map((col) => {
                    let cellContent = col.render ? col.render(item) : item[col.key];
                    
                    // Apply specific styling for different columns
                    let cellClass = "px-6 py-4 whitespace-nowrap text-sm text-gray-900";
                    
                    if (col.key === 'PART') {
                      cellClass = "px-6 py-4 whitespace-nowrap text-sm font-mono font-semibold text-gray-900";
                    } else if (col.key === 'qty_good') {
                      cellClass = "px-6 py-4 whitespace-nowrap";
                      cellContent = (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                          {cellContent}
                        </span>
                      );
                    } else if (col.key === 'qty_defective') {
                      cellClass = "px-6 py-4 whitespace-nowrap";
                      cellContent = (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                          {cellContent}
                        </span>
                      );
                    } else if (col.key === 'total') {
                      cellClass = "px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900";
                    } else if (col.key === 'updated_at') {
                      cellClass = "px-6 py-4 whitespace-nowrap text-sm text-gray-600";
                    }
                    
                    return (
                      <td key={col.key} className={cellClass}>
                        {cellContent}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TechnicianInventoryTable;