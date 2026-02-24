import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useComplaintOperations } from '../../hooks/useComplaintOperations';
import CustomerInfoDisplay from '../../components/shared/CustomerInfoDisplay';
import ProductInfoDisplay from '../../components/shared/ProductInfoDisplay';
import CallInfoSection from '../../components/call_centre/CallInfoSection';
import Button from '../../components/common/Button';

export default function ProductDetailsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedProduct: product, customer } = location.state || {};

  const [callInfo, setCallInfo] = useState({
    CallType: '',
    AppointmentDate: '',
    AppointmentTime: '',
    CallerType: 'Customer',
    CallerMobile: customer?.MobileNo || '',
    CustomerRemarks: '',
    DealerName: '',
    Remarks: '',
    CallSource: 'Voice',
    ContactPerson: '',
    ContactPersonMobile: '',
    Qty: 1,
    AssignedCenter: '',
    Distance: '',
    OutCity: false,
    Bulk: false,
    OtherReason: '',
  });

  // Use shared complaint operations hook
  const {
    assigning,
    submitting,
    handleAssignNearestCenter,
    handleSubmitComplaint,
  } = useComplaintOperations(customer);

  // Redirect if no product data
  useEffect(() => {
    if (!product) {
      navigate(-1);
    }
  }, [product, navigate]);

  if (!product) {
    return <div className="p-6 text-center text-gray-500">Loading...</div>;
  }

  const handleCallInfoChange = (newCallInfo) => {
    setCallInfo(newCallInfo);
  };

  const handleAssignCenter = async () => {
    const success = await handleAssignNearestCenter(callInfo, (result) => {
      setCallInfo((prev) => ({
        ...prev,
        AssignedCenter: result.AssignedCenter,
        Distance: result.Distance,
        OutCity: result.OutCity,
      }));
    });
    return success;
  };

  const handleComplaintSubmit = async () => {
    const payload = {
      mobileNo: customer?.MobileNo || callInfo.CallerMobile || '',
      name: customer?.Name || '',
      state: customer?.State || '',
      city: customer?.City || '',
      complaintId: callInfo.ComplaintId || '',
      customerId: customer?.Id || null,
      product: product,
      callInfo,
    };

    const success = await handleSubmitComplaint(payload, () => {
      navigate(-1);
    });
    return success;
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {/* Header */}
      <div className="mb-6">
        <Button
          onClick={handleGoBack}
          variant="secondary"
          className="mb-4"
        >
          ← Back to Products
        </Button>
        <h1 className="text-3xl font-bold text-gray-800">Product Details</h1>
        <p className="text-gray-600">Register complaint for this product</p>
      </div>

      <div className="space-y-6">
        {/* Customer Info Section */}
        <div className="bg-white rounded-lg shadow">
          <CustomerInfoDisplay data={customer} bgColor="bg-blue-50" />
        </div>

        {/* Product Info Section */}
        <div className="bg-white rounded-lg shadow">
          <ProductInfoDisplay product={product} bgColor="bg-green-50" />
        </div>

        {/* Call Info Section */}
        <div className="bg-white rounded-lg shadow">
          <CallInfoSection
            callInfo={callInfo}
            onCallInfoChange={handleCallInfoChange}
            onAssignCenter={handleAssignCenter}
            onSubmitComplaint={handleComplaintSubmit}
            assigning={assigning}
            submitting={submitting}
          />
        </div>

        {/* Back Button at Bottom */}
        <div className="flex gap-2 justify-center pt-4">
          <Button
            onClick={handleGoBack}
            variant="secondary"
          >
            ← Back to Products
          </Button>
        </div>
      </div>
    </div>
  );
}
