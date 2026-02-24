import React, { useState, useEffect } from 'react';
import { getStatusColor, formatStatusName } from '../../services/statusService';

/**
 * StatusFilter Component
 * Allows filtering complaints by status
 * Can be used in search/filter forms
 */
const StatusFilter = ({ value, onChange, multiple = false }) => {
  const [statusOptions, setStatusOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStatusOptions = async () => {
      try {
        setLoading(true);
        // Fetch all available statuses from the backend
        const response = await fetch('/api/status', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        if (!response.ok) {
          // Fall back to predefined statuses if API fails
          throw new Error('Failed to fetch statuses');
        }
        const data = await response.json();
        setStatusOptions(data);
      } catch (err) {
        // Use predefined statuses as fallback
        setStatusOptions([
          { id: 1, name: 'Open', displayName: 'Open' },
          { id: 2, name: 'Pending', displayName: 'Pending' },
          { id: 3, name: 'Closed', displayName: 'Closed' },
          { id: 4, name: 'Rejected', displayName: 'Rejected' },
          { id: 5, name: 'Cancelled', displayName: 'Cancelled' }
        ]);
        console.log('Using fallback statuses');
      } finally {
        setLoading(false);
      }
    };

    fetchStatusOptions();
  }, []);

  if (loading) {
    return <div className="text-sm text-gray-500">Loading statuses...</div>;
  }

  if (error) {
    return <div className="text-sm text-red-500">Error loading statuses</div>;
  }

  return (
    <select
      multiple={multiple}
      value={value}
      onChange={onChange}
      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
    >
      <option value="">Select Status</option>
      {statusOptions.map((status) => (
        <option key={status.id} value={status.name || status.displayName}>
          {formatStatusName(status.name || status.displayName)}
        </option>
      ))}
    </select>
  );
};

export default StatusFilter;
