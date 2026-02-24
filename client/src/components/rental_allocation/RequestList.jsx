import React from 'react';

const RequestList = ({ requests, filters, onFilterChange, onViewDetail, onReturnView }) => {
  const handleFilterChange = (e) => {
    onFilterChange(e.target.name, e.target.value);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Rental Allocation</h1>
      <div className="mb-4 flex flex-wrap gap-4">
        <div>
          <label className="block text-sm font-medium">Request From Date:</label>
          <input
            type="date"
            name="fromDate"
            value={filters.fromDate}
            onChange={handleFilterChange}
            className="border p-2 rounded"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">To Date:</label>
          <input
            type="date"
            name="toDate"
            value={filters.toDate}
            onChange={handleFilterChange}
            className="border p-2 rounded"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Call Id:</label>
          <input
            type="text"
            name="callId"
            value={filters.callId}
            onChange={handleFilterChange}
            className="border p-2 rounded"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Technician:</label>
          <input
            type="text"
            name="technician"
            value={filters.technician}
            onChange={handleFilterChange}
            className="border p-2 rounded"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Request Status:</label>
          <select
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
            className="border p-2 rounded">
            <option value="All">All</option>
            <option value="Pending">Pending</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
        <div className="flex gap-2 mt-6">
          <button
            onClick={() => onFilterChange('search', true)}
            className="bg-blue-500 text-black px-4 py-2 rounded hover:bg-blue-600">Search
          </button>
          <button
            onClick={onReturnView}
            className="bg-green-500 text-black px-4 py-2 rounded hover:bg-green-600">Rental Return
          </button>
        </div>
      </div>
      <div className="mb-4">
        <p className="text-lg font-medium">
          Total Pending Requests: {requests.filter(r => r.status === 'Pending').length}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 p-2">Request ID</th>
              <th className="border border-gray-300 p-2">Requested by Technician</th>
              <th className="border border-gray-300 p-2">Call ID</th>
              <th className="border border-gray-300 p-2">Request Status</th>
              <th className="border border-gray-300 p-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((req) => (
              <tr key={req.id} className="hover:bg-gray-50">
                <td className="border border-gray-300 p-2">{req.requestId}</td>
                <td className="border border-gray-300 p-2">{req.technicianName}</td>
                <td className="border border-gray-300 p-2">{req.callId}</td>
                <td className="border border-gray-300 p-2">
                  <span className={`px-2 py-1 rounded text-sm ${
                    req.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                    req.status === 'Completed' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {req.status}
                  </span>
                </td>
                <td className="border border-gray-300 p-2">
                  <button
                    onClick={() => onViewDetail(req)}
                    className="bg-blue-500 text-black px-3 py-1 rounded hover:bg-blue-600 text-sm">View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RequestList;