import React from 'react';
import FormInput from '../../components/common/FormInput';
import Button from '../../components/common/Button';

export default function ProductSelection({
  customerData,
  selectedProduct,
  onSelectProduct,
  onEditProduct,
  isEditingProduct,
  onGoToCallStatus,
  onBackToCustomer
}) {
  return (
    <div className="bg-white p-6 rounded shadow mt-6">
      <h2 className="text-xl font-bold mb-4">Product Selection</h2>

      {/* Customer Information */}
      <div className="mb-6">
        <h3 className="font-bold text-lg mb-2">Customer Information</h3>
        <table className="w-full border">
          <tbody>
            {Object.entries(customerData).map(([key, value], i) => {
              if (key === "products") return null;
              return (
                <tr key={i}>
                  <td className="p-2 font-semibold capitalize border">{key}</td>
                  <td className="p-2 border">
                    <FormInput
                      defaultValue={value}
                      readOnly
                      className="w-64"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Product Selection */}
      <div className="mb-6">
        <h3 className="font-bold text-lg mb-2">Select Product</h3>
        {customerData.products && customerData.products.length > 0 ? (
          <table className="w-full border">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-2 py-1">Product Name</th>
                <th className="border px-2 py-1">Model</th>
                <th className="border px-2 py-1">Serial No</th>
                <th className="border px-2 py-1">Warranty</th>
                <th className="border px-2 py-1">Actions</th>
              </tr>
            </thead>
            <tbody>
              {customerData.products.map((p, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="border px-2 py-1">{p.productName || p.ProductName}</td>
                  <td className="border px-2 py-1">{p.model || p.Model}</td>
                  <td className="border px-2 py-1">
                    <FormInput
                      defaultValue={p.serialNo || p.SerialNo}
                      disabled={!isEditingProduct}
                      className="w-32"
                    />
                  </td>
                  <td className="border px-2 py-1">
                    <FormInput
                      defaultValue={p.warranty || p.Warranty}
                      disabled={!isEditingProduct}
                      className="w-32"
                    />
                  </td>
                  <td className="border px-2 py-1 text-center">
                    <Button
                      onClick={() => onSelectProduct(p)}
                      variant="success"
                      className="mr-2"
                    >
                      Select
                    </Button>
                    <Button
                      onClick={onGoToCallStatus}
                      variant="primary"
                    >
                      Call Status
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-gray-500">No products found for this customer.</p>
        )}
      </div>

      <Button
        onClick={onBackToCustomer}
        variant="secondary"
      >
        Back to Customer Details
      </Button>
    </div>
  );
}