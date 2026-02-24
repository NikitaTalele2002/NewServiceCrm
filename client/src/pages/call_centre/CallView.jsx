import React from 'react';
import { useCallView } from '../../hooks/useCallView';
import { masterDataLookup } from '../../utils/masterDataLookup';
import CustomerInfoDisplay from '../../components/shared/CustomerInfoDisplay';
import ProductInfoDisplay from '../../components/shared/ProductInfoDisplay';
import CallInformation from '../../components/call_view/CallInformation';
import CallViewActions from '../../components/call_view/CallViewActions';
import ActionLogModal from '../../components/call_view/ActionLogModal';

export default function CallView({ call }) {
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
        <CallViewActions onActionLog={handleActionLog} />

        <ActionLogModal
          isOpen={showActionLogModal}
          onClose={() => setShowActionLogModal(false)}
          actionLogData={actionLogData}
          loading={loading}
        />
      </div>
    </div>
  );
}








