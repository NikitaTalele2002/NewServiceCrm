/**
 * Status History Modal Component
 * Shows the complete status change history for a complaint
 */

import React, { useState, useEffect } from 'react';

const StatusHistoryModal = ({ callId, isOpen, onClose }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && callId) {
      fetchHistory();
    }
  }, [isOpen, callId]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/call-center/complaint/${callId}/status-history`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setHistory(data.history || []);
    } catch (err) {
      console.error('Error fetching status history:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gray-100 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Status History</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Loading history...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No status history available</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((entry, index) => (
                <div key={index} className="flex gap-4 pb-4 border-b border-gray-100 last:border-0">
                  {/* Timeline indicator */}
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-blue-500 mt-2"></div>
                    {index < history.length - 1 && (
                      <div className="w-0.5 h-12 bg-blue-200 my-1"></div>
                    )}
                  </div>

                  {/* Entry details */}
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {entry.oldStatus?.statusName || 'N/A'} → {entry.newStatus?.statusName || 'N/A'}
                        </p>
                        {entry.oldSubStatus && entry.newSubStatus && (
                          <p className="text-sm text-gray-600">
                            {entry.oldSubStatus.subStatusName} → {entry.newSubStatus.subStatusName}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(entry.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {entry.User && (
                      <p className="text-sm text-gray-600">
                        Changed by: <strong>{entry.User.username || entry.User.email}</strong>
                      </p>
                    )}
                    {entry.remarks && (
                      <p className="text-sm text-gray-700 mt-1">
                        Remarks: {entry.remarks}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatusHistoryModal;
