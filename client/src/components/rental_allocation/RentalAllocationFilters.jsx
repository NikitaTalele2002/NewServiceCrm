import React from 'react';

const RentalAllocationFilters = ({ filters, onFilterChange }) => {
  return (
    <div className="mb-4 flex flex-wrap gap-4">
      <div>
        <label className="block text-sm font-medium">Request From Date:</label>
        <input
          type="date"
          name="fromDate"
          value={filters.fromDate}
          onChange={(e) => onFilterChange(e.target.name, e.target.value)}
          className="border p-2 rounded"/>
      </div>
      <div>
        <label className="block text-sm font-medium">To Date:</label>
        <input
          type="date"
          name="toDate"
          value={filters.toDate}
          onChange={(e) => onFilterChange(e.target.name, e.target.value)}
          className="border p-2 rounded"
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Call Id:</label>
        <input
          type="text"
          name="callId"
          value={filters.callId}
          onChange={(e) => onFilterChange(e.target.name, e.target.value)}
          className="border p-2 rounded"
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Technician:</label>
        <input
          type="text"
          name="technician"
          value={filters.technician}
          onChange={(e) => onFilterChange(e.target.name, e.target.value)}
          className="border p-2 rounded"
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Status:</label>
        <select
          name="status"
          value={filters.status}
          onChange={(e) => onFilterChange(e.target.name, e.target.value)}
          className="border p-2 rounded" >
          <option value="All">All</option>
          <option value="Pending">Pending</option>
          <option value="Completed">Completed</option>
          <option value="Allocated">Allocated</option>
        </select>
      </div>
    </div>
  );
};

export default RentalAllocationFilters;