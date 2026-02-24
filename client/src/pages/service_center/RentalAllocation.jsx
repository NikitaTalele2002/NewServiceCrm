import React from 'react';
import { useRentalAllocation } from '../../hooks/useRentalAllocation';
import RentalAllocationList from '../../components/rental_allocation/RentalAllocationList';
import RequestDetail from '../../components/rental_allocation/RequestDetail';
import RentalReturn from '../../components/rental_allocation/RentalReturn';

const RentalAllocation = () => {
  const {
    view,
    requests,
    selectedRequest,
    filters,
    loading,
    handleFilterChange,
    handleViewDetail,
    handleViewReturn,
    handleBack
  } = useRentalAllocation();


  if (view === 'detail' && selectedRequest) {
    return <RequestDetail request={selectedRequest} onBack={handleBack} />;
  }

  if (view === 'return') {
    return <RentalReturn onBack={handleBack} />;
  }

  return (
    <RentalAllocationList
      filters={filters}
      loading={loading}
      requests={requests}
      onFilterChange={handleFilterChange}
      onViewDetail={handleViewDetail}
      onViewReturn={handleViewReturn}
    />
  );
};

export default RentalAllocation;