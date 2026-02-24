import React from 'react';
import RentalAllocationFilters from './RentalAllocationFilters';
import RentalAllocationTable from './RentalAllocationTable';

const RentalAllocationList = ({ filters, loading, requests, onFilterChange, onViewDetail, onViewReturn }) => {
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Rental Allocation</h1>
        <button
          onClick={onViewReturn}
          className="bg-red-500 text-black px-4 py-2 rounded hover:bg-red-600">Rental Return
        </button>
      </div>

      <RentalAllocationFilters
        filters={filters}
        onFilterChange={onFilterChange}/>

      <RentalAllocationTable
        requests={requests}
        loading={loading}
        onViewDetail={onViewDetail}/>
    </div>
  );
};

export default RentalAllocationList;