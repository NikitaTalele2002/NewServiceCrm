import React, { useState, useEffect } from 'react';
import { getCallStatusHistory, getSubStatusIcon, formatStatusName, formatSubStatusName } from '../../services/statusService';

/**
 * StatusTimeline Component
 * Displays the complete status history of a complaint/call as a timeline
 * Shows each status change with timestamp and actor information
 */
const StatusTimeline = ({ callId }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const response = await getCallStatusHistory(callId);
        // Sort by createdAt descending (newest first)
        const sortedHistory = Array.isArray(response.data) ? response.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) : [];
        setHistory(sortedHistory);
      } catch (err) {
        setError(err.message);
        console.error('Error loading status history:', err);
      } finally {
        setLoading(false);
      }
    };

    if (callId) {
      fetchHistory();
    }
  }, [callId]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded p-4">
        <p className="text-red-800">Error loading status history: {error}</p>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
        <p className="text-yellow-800">No status history available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {history.map((entry, index) => (
        <div key={entry.id || index} className="relative flex gap-4">
          {/* Timeline line */}
          {index < history.length - 1 && (
            <div className="absolute top-12 left-6 w-0.5 h-12 bg-gray-300"></div>
          )}
          
          {/* Timeline dot */}
          <div className="flex-shrink-0">
            <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-white border-2 border-blue-500">
              <span className="text-lg">{getSubStatusIcon(entry.subStatus)}</span>
            </div>
          </div>
          
          {/* Timeline content */}
          <div className="pt-2 pb-4">
            <div className="flex items-baseline gap-2">
              <h3 className="text-sm font-bold text-gray-900">
                {formatStatusName(entry.status)}
              </h3>
              {entry.subStatus && (
                <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                  {formatSubStatusName(entry.subStatus)}
                </span>
              )}
            </div>
            
            <div className="mt-1 text-sm text-gray-500 space-y-0.5">
              <p className="font-medium">{formatDate(entry.createdAt)}</p>
              {entry.updatedBy && (
                <p className="text-xs">Updated by: <span className="font-medium">{entry.updatedBy}</span></p>
              )}
              {entry.remarks && (
                <p className="text-xs italic">Remarks: {entry.remarks}</p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatusTimeline;
