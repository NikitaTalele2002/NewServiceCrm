import React from 'react';

export default function AssignComplaintTable({
  searched,
  technicians,
  selectedMap,
  setSelectedMap,
  handleAssignTechnician,
  formatAddress,
  reallocatedMap
}) {
  return (
    <div className="bg-white p-4 rounded shadow">
      <h2 className="font-semibold mb-2">
        Search Results
      </h2>

      <div className="overflow-x-auto">
        <table className="min-w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border text-left">Call Id</th>
              <th className="p-2 border text-left">Date</th>
              <th className="p-2 border text-left">Customer Name</th>
              <th className="p-2 border text-left">Mobile No</th>
              <th className="p-2 border text-left">City</th>
              <th className="p-2 border text-left">Call Type</th>
              <th className="p-2 border text-left">ASP/DSA</th>
              <th className="p-2 border text-left">Technician</th>
              <th className="p-2 border text-left">Status</th>
              <th className="p-2 border text-left">Select Technician</th>
              <th className="p-2 border text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {searched.map((row) => {
              const complaintKey = row.ComplaintId ?? row.ProductId ?? `${row.MobileNo}-${row.ProductSerialNo}`;
              const assignedTechId = row.AssignedTechnicianId || row.assignedTechnicianId;
              const assignedTech = assignedTechId
                ? technicians.find(t => String(t.technician_id || t.id) === String(assignedTechId))
                : null;

              return (
                <tr key={complaintKey} className="border-t hover:bg-gray-50">
                  <td className="p-2 border">{row.ComplaintId ?? '-'}</td>
                  <td className="p-2 border">
                    {row.CreatedAt ? new Date(row.CreatedAt).toLocaleString() : '-'}
                  </td>
                  <td className="p-2 border">{row.CustomerName || row.Customer?.Name || '-'}</td>
                  <td className="p-2 border">{row.MobileNo || row.Customer?.MobileNo || '-'}</td>
                  <td className="p-2 border">{formatAddress(row)}</td>
                  <td className="p-2 border">{row.CallStatus || '-'}</td>
                  <td className="p-2 border">{row.DealerName || '-'}</td>
                  <td className="p-2 border">
                    {row.TechnicianName || row.AssignedTechnicianName || assignedTech?.name || (assignedTechId ? `Tech #${assignedTechId}` : '-')}
                  </td>
                  <td className="p-2 border">
                    {reallocatedMap[row.ComplaintId]
                      ? <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium">Reallocated</span>
                      : (assignedTechId ? <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm font-medium">Allocated</span> : <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-sm font-medium">Unallocated</span>)
                    }
                  </td>
                  <td className="p-2 border">
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedMap[row.ComplaintId] || ''}
                        onChange={(e) => setSelectedMap(p => ({ ...p, [row.ComplaintId]: e.target.value }))}
                        className="border rounded p-1 text-sm"
                      >
                        <option value="">-- Select --</option>
                        {technicians && technicians.length > 0 ? technicians.map((t) => (
                          <option key={t.technician_id || t.id} value={t.technician_id || t.id}>{t.name}</option>
                        )) : null}
                      </select>
                    </div>
                  </td>
                  <td className="p-2 border">
                    <div>
                      <button
                        className="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm whitespace-nowrap"
                        onClick={async () => {
                          const techId = selectedMap[row.ComplaintId] || selectedMap[row.ProductId] || null;
                          if (!techId) return alert('Select a technician first');
                          try {
                            await handleAssignTechnician(row.ComplaintId ?? row.ProductId, techId, true);
                            setSelectedMap(p => ({ ...p, [row.ComplaintId]: '' }));
                          } catch (e) {
                            console.error('assign error', e);
                            alert('Assignment failed');
                          }
                        }}
                      >
                        Assign / Re-allocate
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {searched.length === 0 && (
              <tr>
                <td colSpan={11} className="p-4 text-center text-gray-600">
                  No records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}