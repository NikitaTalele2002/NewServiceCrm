import React from 'react';
import Button from '../common/Button';
import CustomerInfoSection from './CustomerInfoSection';
import ProductInfoSection from './ProductInfoSection';
import CallInfoSection from './CallInfoSection';

export default function ProductDetailsModal({
  selectedProduct,
  customer,
  callInfo,
  onCallInfoChange,
  onClose,
  onAssignCenter,
  onSubmitComplaint,
  assigning,
  submitting
}) {
  if (!selectedProduct) return null;

  return (
    <div className="mt-6 p-4 border rounded bg-gray-50">
      {/* Modal Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold">Selected Product Details</h3>
        <Button onClick={onClose} variant="secondary">
          Close
        </Button>
      </div>

      {/* Customer Info Section */}
      <CustomerInfoSection customer={customer} selectedProduct={selectedProduct} />

      {/* Product Info Section */}
      <ProductInfoSection selectedProduct={selectedProduct} />

      {/* Call Info Section */}
      <CallInfoSection
        callInfo={callInfo}
        onCallInfoChange={onCallInfoChange}
        onAssignCenter={onAssignCenter}
        onSubmitComplaint={onSubmitComplaint}
        assigning={assigning}
        submitting={submitting}
      />
    </div>
  );
}
