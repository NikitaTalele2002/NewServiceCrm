/**
 * Status Filter Component
 * Provides dropdown filter for selecting complaint status
 */

import React, { useState, useEffect } from 'react';

const StatusFilterComponent = ({ selectedStatus, onStatusChange }) => {
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatuses();
  }, []);

  const fetchStatuses = async () => {
    try {
      const response = await fetch('/api/call-center/statuses');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setStatuses(data || []);
    } catch (err) {
      console.error('Error fetching statuses:', err);
      setStatuses([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Status
      </label>
      <select
        value={selectedStatus || ''}
        onChange={(e) => onStatusChange(e.target.value)}
        disabled={loading}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
      >
        <option value="">All Statuses</option>
        {statuses.map((status) => (
          <option key={status.id} value={status.statusName}>
            {status.statusName.charAt(0).toUpperCase() + status.statusName.slice(1)}
          </option>
        ))}
      </select>
    </div>
  );
};

export default StatusFilterComponent;
