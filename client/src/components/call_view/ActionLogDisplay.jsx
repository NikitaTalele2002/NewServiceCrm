import React from 'react';

const formatDate = (dateString) => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleString('en-IN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch {
    return 'Invalid Date';
  }
};

export const ActionLogDisplay = ({ 
  isOpen, 
  onClose, 
  actionLogData, 
  loading 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded max-w-6xl max-h-screen overflow-auto w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Action Log</h2>
          <button 
            onClick={onClose} 
            className="text-red-500 text-xl hover:text-red-700 font-bold"
          >
            ×
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <p>Loading action log...</p>
          </div>
        ) : actionLogData.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No action log entries found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border border-gray-300 px-4 py-2 text-left">Call ID</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Action Date</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Company</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">User Name</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Status</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Stage / Remarks</th>
                </tr>
              </thead>
              <tbody>
                {actionLogData.map((item, index) => {
                  // Use LogID (unique database ID) as the key, or fallback to index
                  const itemKey = item.LogID ? `action-log-${item.LogID}` : index;
                  return (
                    <tr key={itemKey} className="border-b border-gray-300 hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-2">
                        {item.EntityID || item.CallID || item.entity_id || '-'}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {formatDate(item.ActionDate || item.action_at)}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {item.Company || (item.EntityType === 'Call' || item.entity_type === 'Call' ? 'Call Centre' : 'Service Centre')}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {item.UserName || `User ${item.UserId || item.user_id}` || 'System'}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {item.Status || `Status ${item.NewStatusId || item.new_status_id}` || 'N/A'}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {item.Remarks || item.remarks || item.Stage || 'Action Recorded'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActionLogDisplay;
