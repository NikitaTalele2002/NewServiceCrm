import React from 'react';
import { useRentalReturn } from '../../../hooks/useRentalReturn';
import RentalReturnList from '../../../components/RentalReturnList';
import RentalReturnForm from '../../../components/RentalReturnForm';
import ReturnApprovalForm from '../../../components/ReturnApprovalForm';

export default function RentalReturn() {
  const {
    view,
    allocatedRequests,
    pendingReturns,
    selectedRequest,
    selectedReturn,
    rentalReturns,
    returns,
    loading,
    approvalLoading,
    error,
    debugInfo,
    approvalRemarks,
    setApprovalRemarks,
    handleSelectRequest,
    handleSelectReturn,
    handleReturnChange,
    handleReturn,
    handleApproveReturn,
    handleBack,
    handleBackToRequests
  } = useRentalReturn();

  return (
    <div className="p-6 bg-white min-h-screen">
      {view === 'list' ? (
        <RentalReturnList
          allocatedRequests={allocatedRequests}
          pendingReturns={pendingReturns}
          onSelectRequest={handleSelectRequest}
          onSelectReturn={handleSelectReturn}
          loading={loading}
          error={error}
          debugInfo={debugInfo}
        />
      ) : view === 'approve' && selectedReturn ? (
        <ReturnApprovalForm
          returnRequest={selectedReturn}
          approvalRemarks={approvalRemarks}
          onRemarksChange={setApprovalRemarks}
          onApprove={handleApproveReturn}
          onBack={handleBack}
          loading={approvalLoading}
          error={error}
        />
      ) : (
        <RentalReturnForm
          selectedRequest={selectedRequest}
          rentalReturns={rentalReturns}
          returns={returns}
          onReturnChange={handleReturnChange}
          onReturn={handleReturn}
          onBack={handleBack}
          loading={loading}
          error={error}
        />
      )}
    </div>
  );
}

