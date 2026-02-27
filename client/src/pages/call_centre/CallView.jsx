import React, { useState } from 'react';
import { useCallView } from '../../hooks/useCallView';
import { masterDataLookup } from '../../utils/masterDataLookup';
import CustomerInfoDisplay from '../../components/shared/CustomerInfoDisplay';
import ProductInfoDisplay from '../../components/shared/ProductInfoDisplay';
import CallInformation from '../../components/call_view/CallInformation';
import CallViewActions from '../../components/call_view/CallViewActions';
import ActionLogDisplay from '../../components/call_view/ActionLogDisplay';
import AttachmentsDisplay from '../../components/call_view/AttachmentsDisplay';
import SparePartsDisplay from '../../components/call_view/SparePartsDisplay';

export default function CallView({ call }) {
  const [showAttachmentsModal, setShowAttachmentsModal] = useState(false);
  const [showSparePartsModal, setShowSparePartsModal] = useState(false);
  
  const {
    serviceCenterName,
    technicianName,
    showActionLogModal,
    setShowActionLogModal,
    actionLogData,
    loading,
    findProductGroupName,
    states,
    cities,
    productGroups,
    handleActionLog
  } = useCallView(call);

  if (!call) return <div>No call data</div>;

  // Create lookup helper functions
  const getStateName = (stateId) => masterDataLookup.findStateName(stateId, states);
  const getCityName = (cityId) => masterDataLookup.findCityName(cityId, cities);
  const getProductGroupName = (groupId) => masterDataLookup.findProductGroupName(groupId, productGroups);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto bg-white shadow-md p-6">
        <h1 className="text-3xl font-bold mb-6">Call View</h1>

        <CustomerInfoDisplay data={call} bgColor="bg-blue-50" getStateName={getStateName} getCityName={getCityName} />
        <ProductInfoDisplay product={call} bgColor="bg-green-50" getProductGroupName={getProductGroupName} />
        <CallInformation 
          call={call} 
          serviceCenterName={serviceCenterName}
          technicianName={technicianName}
        />
        <CallViewActions 
          onActionLog={handleActionLog} 
          onViewDownload={() => setShowAttachmentsModal(true)}
          onFaultsAndParts={() => setShowSparePartsModal(true)}
        />

        <ActionLogDisplay
          isOpen={showActionLogModal}
          onClose={() => setShowActionLogModal(false)}
          actionLogData={actionLogData}
          loading={loading}
        />

        {/* Attachments Modal */}
        {showAttachmentsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-auto">
              <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
                <h3 className="text-lg font-semibold">View & Download Attachments</h3>
                <button
                  onClick={() => setShowAttachmentsModal(false)}
                  className="text-red-500 text-2xl hover:text-red-700"
                >
                  ×
                </button>
              </div>
              <div className="p-4">
                <AttachmentsDisplay callId={call.call_id || call.ComplaintId || call.CallId} />
              </div>
            </div>
          </div>
        )}

        {/* Spare Parts Modal */}
        {showSparePartsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-3xl w-full max-h-96 overflow-auto">
              <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
                <h3 className="text-lg font-semibold">Faults & Spare Parts</h3>
                <button
                  onClick={() => setShowSparePartsModal(false)}
                  className="text-red-500 text-2xl hover:text-red-700"
                >
                  ×
                </button>
              </div>
              <div className="p-4">
                <SparePartsDisplay callId={call.call_id || call.ComplaintId || call.CallId} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}








