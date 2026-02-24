import React from "react";
import { useDCFGeneration } from '../../../hooks/useDCFGeneration';
import DCFForm from './components/DCFform';

export default function GenerateDCF() {
  const {
    formData,
    dcfList,
    technicians,
    productGroups,
    products,
    models,
    loading,
    error,
    handleFormChange,
    handleSubmit
  } = useDCFGeneration();

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Generate DCF</h1>
        <p className="text-gray-600">Create Delivery Challan Forms for technicians</p>
      </div>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DCFForm
          formData={formData}
          onChange={handleFormChange}
          onSubmit={handleSubmit}
          technicians={technicians}
          productGroups={productGroups}
          products={products}
          models={models}
          loading={loading}
        />

        {/* DCF List */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Generated DCFs</h2>
          {dcfList.length === 0 ? (
            <p className="text-gray-500">No DCFs generated yet.</p>
          ) : (
            <div className="space-y-4">
              {dcfList.map((dcf) => (
                <div key={dcf.id} className="border border-gray-200 rounded p-4">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><strong>Technician:</strong> {dcf.technicianName}</div>
                    <div><strong>Product Group:</strong> {dcf.productGroupName}</div>
                    <div><strong>Product:</strong> {dcf.productName}</div>
                    <div><strong>Model:</strong> {dcf.modelName}</div>
                    <div><strong>Quantity:</strong> {dcf.quantity}</div>
                    <div><strong>Created:</strong> {new Date(dcf.createdAt).toLocaleDateString()}</div>
                  </div>
                  {dcf.remarks && (
                    <div className="mt-2 text-sm">
                      <strong>Remarks:</strong> {dcf.remarks}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}