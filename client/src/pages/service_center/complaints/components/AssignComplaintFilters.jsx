import React from 'react';

export default function AssignComplaintFilters({
  filters,
  onChange,
  resetFilters,
  fetchData,
  notAllocatedCount,
  technicians
}) {
  return (
    <div className="mb-4 bg-white p-4 rounded shadow">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">Call Id</label>
          <input
            name="callId"
            value={filters.callId}
            onChange={onChange}
            className="mt-1 block w-full border rounded p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Mobile No</label>
          <input
            name="mobile"
            value={filters.mobile}
            onChange={onChange}
            className="mt-1 block w-full border rounded p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Date From</label>
          <input
            name="dateFrom"
            type="date"
            value={filters.dateFrom}
            onChange={onChange}
            className="mt-1 block w-full border rounded p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Date To</label>
          <input
            name="dateTo"
            type="date"
            value={filters.dateTo}
            onChange={onChange}
            className="mt-1 block w-full border rounded p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Zone</label>
          <select
            name="zone"
            value={filters.zone}
            onChange={onChange}
            className="mt-1 block w-full border rounded p-2"
          >
            <option key="zone-all" value="">-- All --</option>
            <option key="zone-south" value="South">South</option>
            <option key="zone-north" value="North">North</option>
            <option key="zone-east" value="East">East</option>
            <option key="zone-west" value="West">West</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">Call Type</label>
          <select
            name="callType"
            value={filters.callType}
            onChange={onChange}
            className="mt-1 block w-full border rounded p-2"
          >
            <option key="calltype-any" value="">-- Any --</option>
            <option key="calltype-service" value="Service">Service</option>
            <option key="calltype-installation" value="Installation">Installation</option>
            <option key="calltype-repair" value="Repair">Repair</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">ASP/DSA</label>
          <input
            name="dealer"
            value={filters.dealer}
            onChange={onChange}
            className="mt-1 block w-full border rounded p-2"
            placeholder="ADINATH ENTERPRISES"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Technician</label>
          <select
            name="technician"
            value={filters.technician}
            onChange={onChange}
            className="mt-1 block w-full border rounded p-2"
          >
            <option value="all">- All -</option>
            {technicians && technicians.length > 0 ? technicians.map((t) => (
              <option key={t.technician_id || t.id} value={t.technician_id || t.id}>{t.name}</option>
            )) : null}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">Search</label>
          <input
            value={filters.query || ''}
            onChange={(e) => onChange({ target: { name: 'query', value: e.target.value } })}
            placeholder="Search by name/mobile/city/id"
            className="mt-1 block w-full border rounded p-2"
          />
        </div>

        <div className="flex items-end">
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              name="unAllocatedOnly"
              checked={filters.unAllocatedOnly}
              onChange={onChange}
              className="mr-2"
            />Un-Allocated only
          </label>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-blue-600 text-black rounded hover:bg-blue-700"
        >
          Refresh
        </button>
        <button
          onClick={resetFilters}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          Reset
        </button>
        <div className="ml-auto text-sm">
          Not Allocated to Technician: <strong>{notAllocatedCount}</strong>
        </div>
      </div>
    </div>
  );
}