import React, { useState, useEffect } from 'react';
import { getCallCurrentStatus, getStatusColor, getSubStatusIcon, formatStatusName, formatSubStatusName } from '../../services/statusService';

/**
 * StatusBadge Component
 * Displays current status and sub-status of a complaint/call
 * Can be used in list views or detail views
 */
const StatusBadge = ({ callId, size = 'medium', showSubStatus = true, showIcon = true, onStatusLoaded = null }) => {
  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        setLoading(true);
        const response = await getCallCurrentStatus(callId);
        setStatusData(response);
        if (onStatusLoaded) {
          onStatusLoaded(response);
        }
      } catch (err) {
        setError(err.message);
        console.error('Error loading status:', err);
      } finally {
        setLoading(false);
      }
    };

    if (callId) {
      fetchStatus();
    }
  }, [callId, onStatusLoaded]);

  if (loading) {
    return (
      <div className={`inline-flex items-center px-2 py-1 rounded-full border ${size === 'small' ? 'text-xs' : 'text-sm'} bg-gray-100 text-gray-700 border-gray-300`}>
        <span className="animate-pulse">Loading...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`inline-flex items-center px-2 py-1 rounded-full border ${size === 'small' ? 'text-xs' : 'text-sm'} bg-red-100 text-red-800 border-red-300`}>
        <span>Error</span>
      </div>
    );
  }

  if (!statusData) {
    return null;
  }

  const { currentStatus, currentSubStatus } = statusData;
  const badgeColor = getStatusColor(currentStatus);
  const subStatusIcon = getSubStatusIcon(currentSubStatus);
  
  const sizeClasses = {
    small: 'text-xs px-2 py-0.5',
    medium: 'text-sm px-3 py-1',
    large: 'text-base px-4 py-2'
  };

  return (
    <div className="flex items-center gap-1 flex-wrap">
      <div className={`inline-flex items-center gap-1 rounded-full border ${badgeColor} ${sizeClasses[size]}`}>
        {showIcon && <span className="text-lg">{getSubStatusIcon(currentSubStatus)}</span>}
        <span className="font-semibold">{formatStatusName(currentStatus)}</span>
      </div>
      {showSubStatus && currentSubStatus && (
        <div className="text-xs text-gray-600">
          {subStatusIcon} {formatSubStatusName(currentSubStatus)}
        </div>
      )}
    </div>
  );
};

export default StatusBadge;
