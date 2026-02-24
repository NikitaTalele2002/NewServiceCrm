import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDCF } from '../../hooks/useDCF';
import DCFTable from '../../components/dcf/DCFTable';
import DCFFilter from '../../components/dcf/DCFFilter';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const DCFStatus = () => {
  const navigate = useNavigate();
  const { filteredDcfData, dcfNoFilter, setDcfNoFilter, loading, error } = useDCF();

  const handleDcfClick = (requestId) => {
    // Navigate to DCF details page for service center
    navigate(`/service-center/inventory/dcf-details/${requestId}`);
  };

  return (
    <div className="p-5">
      <DCFFilter value={dcfNoFilter} onChange={setDcfNoFilter} />
      <div className="mb-5">
        <h2 className="text-2xl font-bold">DCF Status Report:</h2>
      </div>

      {loading && <LoadingSpinner />}
      {error && <p className="text-red-600">{error}</p>}

      <DCFTable data={filteredDcfData} onDcfClick={handleDcfClick} />
    </div>
  );
};

export default DCFStatus;