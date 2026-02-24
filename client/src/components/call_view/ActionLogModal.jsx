import React from 'react';
import Button from '../common/Button';

const ActionLogModal = ({ isOpen, onClose, actionLogData, loading }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" onClick={onClose}>
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-2xl font-medium text-gray-900">Action Log</h3>
          <Button onClick={onClose} variant="secondary" className="text-sm">
            Close
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-8">Loading action log...</div>
        ) : (
          <div className="space-y-4">
            {actionLogData.length === 0 ? (
              <p className="text-gray-500">No action log entries found.</p>
            ) : (
              actionLogData.map((entry, index) => (
                <div key={index} className="border rounded p-4 bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-3 rounded border border-gray-200">
                      <p className="text-xs font-semibold uppercase text-gray-600 mb-1">Action</p>
                      <p className="text-sm text-gray-800">{entry.action || '-'}</p>
                    </div>
                    <div className="bg-white p-3 rounded border border-gray-200">
                      <p className="text-xs font-semibold uppercase text-gray-600 mb-1">Timestamp</p>
                      <p className="text-sm text-gray-800">{entry.timestamp ? new Date(entry.timestamp).toLocaleString() : '-'}</p>
                    </div>
                    <div className="bg-white p-3 rounded border border-gray-200">
                      <p className="text-xs font-semibold uppercase text-gray-600 mb-1">User</p>
                      <p className="text-sm text-gray-800">{entry.user || '-'}</p>
                    </div>
                    <div className="bg-white p-3 rounded border border-gray-200">
                      <p className="text-xs font-semibold uppercase text-gray-600 mb-1">Details</p>
                      <p className="text-sm text-gray-800">{entry.details || '-'}</p>
                    </div>
                  </div>
                  {entry.notes && (
                    <div className="mt-4 bg-white p-3 rounded border border-gray-200">
                      <p className="text-xs font-semibold uppercase text-gray-600 mb-1">Notes</p>
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">{entry.notes}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        <div className="flex justify-end mt-6">
          <Button onClick={onClose} variant="secondary">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ActionLogModal;