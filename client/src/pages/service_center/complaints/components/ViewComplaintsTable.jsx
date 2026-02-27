import React, { useState } from 'react';
import StatusBadge from '../../../../components/StatusBadge';
import StatusHistoryModal from '../../../../components/StatusHistoryModal';

const ViewComplaintsTable = ({
  role,
  displayComplaints,
  paginatedComplaints,
  startIdx,
  endIdx,
  currentPage,
  totalPages,
  handlePrevPage,
  handleNextPage,
  handlePageChange,
  getTechnicianName,
  getProductName,
  getModelName
}) => {
  const isAdmin = role === 'admin';
  const [selectedCallId, setSelectedCallId] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  return (
    <div className="w-full min-h-screen bg-gray-50 p-6">
      <div className={`text-black px-6 py-4 ${isAdmin ? 'bg-blue-600' : 'bg-green-600'}`}>
        <h2 className="text-xl font-semibold">
          {isAdmin ? 'All Complaints' : 'Your Service Center Complaints'}
        </h2>
        <p className={`text-sm ${isAdmin ? 'text-blue-100' : 'text-green-100'}`}>
          {displayComplaints.length} complaint(s) total
        </p>
      </div>

      {displayComplaints.length > 0 ? (
        <div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b-2 border-gray-300">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Customer Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Mobile</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">City</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Product</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Model</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Serial No</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Warranty</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                  {isAdmin && (
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Center</th>
                  )}
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    {isAdmin ? 'Technician' : 'Assigned Technician'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedComplaints.map((row, idx) => {
                  // Handle both old and new data formats
                  const rowKey = row.ComplaintId || row.call_id || `row-${startIdx + idx}`;
                  const customerName = row.CustomerName || row.customer_name || 'Unknown';
                  const mobileNo = row.MobileNo || row.customer_mobile || 'N/A';
                  const city = row.City || row.pincode || 'N/A';
                  const callStatus = row.CallStatus || row.status || 'unknown';
                  const warrantyStatus = row.WarrantyStatus || 'N/A';
                  
                  return (
                    <tr key={rowKey} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 text-sm text-gray-800 font-medium">{customerName}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{mobileNo}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{city}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{getProductName(row)}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{getModelName(row)}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{row.ProductSerialNo}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                          {warrantyStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <button
                          onClick={() => {
                            setSelectedCallId(row.ComplaintId || row.call_id);
                            setShowHistoryModal(true);
                          }}
                          className="hover:opacity-80 cursor-pointer"
                          title="Click to view status history"
                        >
                          <StatusBadge
                            callId={row.ComplaintId || row.call_id}
                            status={row.Status}
                            subStatus={row.SubStatus}
                            showSubStatus={true}
                          />
                        </button>
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-sm text-gray-700">{row.AssignedCenterId || row.assigned_asc_id || '-'}</td>
                      )}
                      <td className="px-4 py-3 text-sm">
                        {row.AssignedTechnicianId ? (
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 block`}>
                            {getTechnicianName(row)}
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 block">
                            Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t-2 border-gray-300">
            <div className="text-sm text-gray-600">
              Showing <strong>{startIdx + 1}</strong> to <strong>{Math.min(endIdx, displayComplaints.length)}</strong> of <strong>{displayComplaints.length}</strong> complaints
            </div>
            <div className="flex gap-2">
              <button
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                className={`px-3 py-1 text-black rounded disabled:bg-gray-400 text-sm font-medium hover:opacity-80 ${
                  isAdmin ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'
                }`}>
                ← Previous
              </button>
              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`px-2 py-1 rounded text-sm font-medium ${
                      currentPage === page
                        ? (isAdmin ? 'bg-blue-600 text-black' : 'bg-green-600 text-black')
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}>
                    {page}
                  </button>
                ))}
              </div>
              <button
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className={`px-3 py-1 text-black rounded disabled:bg-gray-400 text-sm font-medium hover:opacity-80 ${
                  isAdmin ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'
                }`}>
                Next →
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="px-6 py-8 text-center">
          <p className="text-gray-600">
            {isAdmin ? 'No complaints found.' : 'No complaints for your service center.'}
          </p>
        </div>
      )}

      {/* Status History Modal */}
      <StatusHistoryModal
        callId={selectedCallId}
        isOpen={showHistoryModal}
        onClose={() => {
          setShowHistoryModal(false);
          setSelectedCallId(null);
        }}
      />
    </div>
  );
};

export default ViewComplaintsTable;