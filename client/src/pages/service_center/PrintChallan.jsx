import React from 'react';
import { usePrintChallan } from '../../hooks/usePrintChallan';
import { PrintChallanForm, PrintChallanTable } from '../../components/print_challan';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import '../../components/print_challan/PrintChallan.css';

const PrintChallan = () => {
  const {
    returnRequests,
    selectedRequest,
    challanData,
    loading,
    error,
    totalAmount,
    selectRequest,
    handlePrint
  } = usePrintChallan();

  const handleRequestChange = async (requestId) => {
    await selectRequest(requestId);
  };

  return (
    <div className="print-challan-page">
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">Spare Part Return Challan</h1>
          <p className="page-subtitle">Generate and print return challans for spare part requests</p>
        </div>

        <div className="page-content">
          <PrintChallanForm
            returnRequests={returnRequests}
            selectedRequest={selectedRequest}
            onRequestChange={handleRequestChange}
            loading={loading}
            error={error}
          />

          {loading && <LoadingSpinner text="Loading request details..." />}

          {challanData && (
            <PrintChallanTable
              challanData={challanData}
              totalAmount={totalAmount}
              onPrint={handlePrint}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default PrintChallan;