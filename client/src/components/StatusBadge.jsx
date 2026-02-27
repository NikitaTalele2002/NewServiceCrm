/**
 * Status Badge Component
 * Displays current status and sub-status with color coding
 */

import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../config/apiConfig';

const StatusBadge = ({ callId, status, subStatus, showSubStatus = true, size = 'md' }) => {
  const [displayStatus, setDisplayStatus] = useState(null);
  const [loading, setLoading] = useState(!status);

  useEffect(() => {
    if (!status && callId) {
      // Fetch current status if not provided
      const fetchStatus = async () => {
        try {
          const response = await fetch(getApiUrl(`/call-center/complaint/${callId}/status`));
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          if (data) {
            setDisplayStatus({
              status: data.status,
              subStatus: data.subStatus
            });
          }
        } catch (err) {
          console.error('Error fetching status:', err);
        } finally {
          setLoading(false);
        }
      };
      fetchStatus();
    } else if (status) {
      setDisplayStatus({ status, subStatus });
    }
  }, [callId, status, subStatus]);

  if (loading) {
    return <span className="inline-block px-2 py-1 rounded text-xs font-semibold bg-gray-200 text-gray-700">Loading...</span>;
  }

  if (!displayStatus) {
    return <span className="inline-block px-2 py-1 rounded text-xs font-semibold bg-gray-200 text-gray-700">Unknown</span>;
  }

  const { status: stat, subStatus: subStat } = displayStatus;

  // Status color mapping
  const statusColors = {
    'open': { bg: 'bg-blue-100', text: 'text-blue-800' },
    'pending': { bg: 'bg-yellow-100', text: 'text-yellow-800' },
    'closed': { bg: 'bg-green-100', text: 'text-green-800' },
    'cancelled': { bg: 'bg-gray-100', text: 'text-gray-800' },
    'rejected': { bg: 'bg-red-100', text: 'text-red-800' },
    'approved': { bg: 'bg-green-100', text: 'text-green-800' }
  };

  const sizeClasses = {
    'sm': 'px-2 py-1 text-xs',
    'md': 'px-3 py-2 text-sm',
    'lg': 'px-4 py-2 text-base'
  };

  const statusName = stat?.statusName || 'Unknown';
  const colors = statusColors[statusName.toLowerCase()] || statusColors['pending'];
  const sizeClass = sizeClasses[size] || sizeClasses['md'];

  return (
    <div className="flex items-center gap-2">
      <span className={`inline-block ${sizeClass} rounded-full font-semibold ${colors.bg} ${colors.text}`}>
        {statusName.charAt(0).toUpperCase() + statusName.slice(1)}
      </span>
      {showSubStatus && subStat && (
        <span className="inline-block px-2 py-1 rounded text-xs bg-gray-100 text-gray-700">
          {subStat.subStatusName}
        </span>
      )}
    </div>
  );
};

export default StatusBadge;
