import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button';
import { useDCFDetails } from '../../hooks/useDCF';
import DCFDetailsTable from '../../components/dcf/DCFDetailsTable';
import LoadingSpinner from '../../components/common/LoadingSpinner';
const DCFDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { request, items, cnDate, cnValue, cnCount, loading, error } = useDCFDetails(id);

  return (
    <div className="p-5">
      <Button
        onClick={() => navigate('/service-center/inventory/dcf-status')}
        variant="primary"
        className="mb-4"
      >
        ← Back to DCF Status
      </Button>
      <h2 className="text-2xl font-bold mb-4">DCF Items Details</h2>
      {request && <h3>DCF No. : {request.requestNumber}</h3>}
      {loading && <LoadingSpinner />}
      {error && <p className="text-red-600">{error}</p>}

      <DCFDetailsTable items={items} cnDate={cnDate} cnValue={cnValue} cnCount={cnCount} />
    </div>
  );
};

export default DCFDetails; 