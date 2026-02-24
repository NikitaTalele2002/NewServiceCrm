import React from 'react';

const ReplacementHistoryTable = ({ data, loading, onViewDetails, onPrint }) => {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Call ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Request Number</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Spare Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Replacement Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Old Serial No</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requested By</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan="9" className="px-6 py-4 text-center text-gray-500">Loading...</td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan="9" className="px-6 py-4 text-center text-gray-500">No replacement history found</td>
              </tr>
            ) : (
              data.map((item) => (
                <tr key={item?.id || Math.random()} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 cursor-pointer hover:text-blue-800"
                    onClick={() => onViewDetails(item)}>
                    {item?.callId || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item?.requestNumber || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item?.orderType || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      item?.spareStatus === 'completed' ? 'bg-green-100 text-green-800' :
                      item?.spareStatus === 'approved' ? 'bg-blue-100 text-blue-800' :
                      item?.spareStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {item?.spareStatus || '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      item?.replacementStatus === 'completed' ? 'bg-green-100 text-green-800' :
                      item?.replacementStatus === 'approved' ? 'bg-blue-100 text-blue-800' :
                      item?.replacementStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {item?.replacementStatus || '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item?.oldSerialNo || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item?.requestedBy || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item?.createdAt ? new Date(item.createdAt).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {item?.status === 'Service Tag Generated' && (
                      <button
                        onClick={() => onPrint(item)}
                        className="text-blue-600 hover:text-blue-900 mr-4">Print
                      </button>
                    )}
                    <button
                      onClick={() => onViewDetails(item)}
                      className="text-gray-600 hover:text-gray-900">View Details
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ReplacementHistoryTable;