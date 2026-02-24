import React from 'react';

const RentalAllocationTable = ({ requests, loading, onViewDetail }) => {
  React.useEffect(() => {
    console.log('🔍 RentalAllocationTable - Requests updated:', requests);
    console.log('📊 Request count:', requests.length);
  }, [requests]);

  if (loading) {
    return <div className="text-center py-4">⏳ Loading requests...</div>;
  }

  if (requests.length === 0) {
    return <div className="text-center py-4 text-gray-500">
      <p>📭 No technician spare requests found</p>
      <p className="text-xs text-gray-400 mt-2">Check filters or try refreshing</p>
    </div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse border border-gray-300">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 p-2">Request ID</th>
            <th className="border border-gray-300 p-2">Technician</th>
            <th className="border border-gray-300 p-2">Call ID</th>
            <th className="border border-gray-300 p-2">Status</th>
            <th className="border border-gray-300 p-2">Created At</th>
            <th className="border border-gray-300 p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((request) => (
            <tr key={request.id || request.requestId}>
              <td className="border border-gray-300 p-2">{request.requestId}</td>
              <td className="border border-gray-300 p-2">{request.technicianName || 'Unknown'}</td>
              <td className="border border-gray-300 p-2">{request.call_id || 'N/A'}</td>
              <td className="border border-gray-300 p-2">
                <span className={`px-2 py-1 rounded text-sm ${
                  request.status === 'Completed' ? 'bg-green-100 text-green-800' :
                  request.status === 'approved' ? 'bg-green-100 text-green-800' :
                  request.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                  request.status === 'Open' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {request.status || 'pending'}
                </span>
              </td>
              <td className="border border-gray-300 p-2">
                {request.createdAt ? new Date(request.createdAt).toLocaleDateString() : 'N/A'}
              </td>
              <td className="border border-gray-300 p-2">
                <button
                  onClick={() => onViewDetail(request)}
                  className="bg-blue-500 text-black px-3 py-1 rounded hover:bg-blue-600"
                >
                  View Details
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RentalAllocationTable;