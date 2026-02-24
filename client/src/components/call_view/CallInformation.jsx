import React from 'react';

const CallInformation = ({ call, serviceCenterName, technicianName }) => {
  return (
    <div className="mb-8">
      <h2 className="text-2xl font-semibold mb-4">Call Information</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded border border-gray-300">
          <p className="text-xs text-gray-600 font-semibold uppercase mb-1">Call Status</p>
          <p className="text-gray-800 font-medium text-sm">{call.CallStatus || call.CallType || '-'}</p>
        </div>
        <div className="bg-white p-4 rounded border border-gray-300">
          <p className="text-xs text-gray-600 font-semibold uppercase mb-1">Quantity</p>
          <p className="text-gray-800 font-medium text-sm">{call.Qty || '-'}</p>
        </div>
        <div className="bg-white p-4 rounded border border-gray-300">
          <p className="text-xs text-gray-600 font-semibold uppercase mb-1">Caller Mobile</p>
          <p className="text-gray-800 font-medium text-sm">{call.CallerMobile || call.MobileNo || '-'}</p>
        </div>
        <div className="bg-white p-4 rounded border border-gray-300">
          <p className="text-xs text-gray-600 font-semibold uppercase mb-1">Appointment Date</p>
          <p className="text-gray-800 font-medium text-sm">{call.AppointmentDate || '-'}</p>
        </div>
        <div className="bg-white p-4 rounded border border-gray-300">
          <p className="text-xs text-gray-600 font-semibold uppercase mb-1">Appointment Time</p>
          <p className="text-gray-800 font-medium text-sm">{call.AppointmentTime || '-'}</p>
        </div>
        <div className="md:col-span-2 bg-white p-4 rounded border border-gray-300">
          <p className="text-xs text-gray-600 font-semibold uppercase mb-1">Customer Remarks</p>
          <p className="text-gray-800 font-medium text-sm whitespace-pre-wrap">{call.CustomerRemarks || '-'}</p>
        </div>
        <div className="bg-white p-4 rounded border border-gray-300">
          <p className="text-xs text-gray-600 font-semibold uppercase mb-1">Dealer Name</p>
          <p className="text-gray-800 font-medium text-sm">{call.DealerName || '-'}</p>
        </div>
        <div className="bg-white p-4 rounded border border-gray-300">
          <p className="text-xs text-gray-600 font-semibold uppercase mb-1">Call Source</p>
          <p className="text-gray-800 font-medium text-sm">{call.CallSource || '-'}</p>
        </div>

        {/* Assigned Service Center */}
        <div className="bg-blue-50 p-4 rounded border border-blue-300">
          <p className="text-xs text-blue-600 font-semibold uppercase mb-1">Assigned Service Center</p>
          {serviceCenterName ? (
            <>
              <p className="text-blue-900 font-semibold text-sm">{serviceCenterName}</p>
              <p className="text-xs text-gray-600">ID: {call.AssignedCenterId}</p>
            </>
          ) : call.AssignedCenterId ? (
            <p className="text-gray-400 text-sm">Loading...</p>
          ) : (
            <p className="text-gray-400 italic text-sm">Not assigned</p>
          )}
        </div>

        {/* Assigned Technician */}
        <div className="bg-green-50 p-4 rounded border border-green-300">
          <p className="text-xs text-green-600 font-semibold uppercase mb-1">Assigned Technician</p>
          {technicianName ? (
            <>
              <p className="text-green-900 font-semibold text-sm">{technicianName}</p>
              <p className="text-xs text-gray-600">ID: {call.AssignedTechnicianId}</p>
            </>
          ) : call.AssignedTechnicianId ? (
            <p className="text-gray-400 text-sm">Loading...</p>
          ) : (
            <p className="text-gray-400 italic text-sm">Not assigned</p>
          )}
        </div>

        {/* Distance */}
        {call.DistanceKm && (
          <div className="bg-white p-4 rounded border border-gray-300">
            <p className="text-xs text-gray-600 font-semibold uppercase mb-1">Distance (km)</p>
            <p className="text-gray-800 font-medium text-sm">{call.DistanceKm || '-'}</p>
          </div>
        )}

        {/* Assigned At */}
        {call.AssignedAt && (
          <div className="bg-white p-4 rounded border border-gray-300">
            <p className="text-xs text-gray-600 font-semibold uppercase mb-1">Assigned At</p>
            <p className="text-gray-800 font-medium text-sm">{call.AssignedAt || '-'}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CallInformation;