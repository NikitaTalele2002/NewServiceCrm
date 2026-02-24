import React from 'react';
import FormInput from '../../components/common/FormInput';
import FilterSelect from '../../components/common/FilterSelect';
import Button from '../../components/common/Button';

export default function CallStatusForm({
  customerData,
  selectedProduct,
  callData,
  onCallDataChange,
  onSaveCall,
  onBackToCustomer,
  onBackToProducts,
  onPreviousCall,
  onViewAndUpload,
  onRegisterCallDirect
}) {
  const handleCallDataChange = (field, value) => {
    onCallDataChange({ ...callData, [field]: value });
  };

  const callTypeOptions = [
    { value: '', label: '-Select-' },
    { value: 'Complaint', label: 'Complaint' },
    { value: 'Installation', label: 'Installation' }
  ];

  return (
    <div className="bg-white p-6 rounded shadow mt-6 space-y-6">
      <h2 className="text-xl font-bold">Call Management - Registration</h2>

      {/* Customer Information */}
      <div>
        <h3 className="font-bold text-lg">Customer Information</h3>
        <table className="border w-full">
          <tbody>
            {Object.entries(customerData).map(([key, value], i) => {
              if (key === "products") return null;
              return (
                <tr key={i}>
                  <td className="p-2 font-semibold capitalize">{key}</td>
                  <td className="p-2">
                    <FormInput
                      defaultValue={value}
                      readOnly
                      className="w-64"
                    />
                  </td>
                </tr>
              );
            })}

            <tr>
              <td colSpan="2" className="p-3">
                <div className="w-full flex justify-end space-x-3">
                  <Button
                    onClick={onBackToCustomer}
                    variant="secondary"
                  >
                    Back to customer Details
                  </Button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Product Information */}
      <div>
        <h3 className="font-bold text-lg">Product Information</h3>
        <table className="w-full border">
          <tbody>
            {Object.entries(selectedProduct).map(([key, value], i) => (
              <tr key={i}>
                <td className="p-2 font-semibold capitalize">{key}</td>
                <td className="p-2">
                  <FormInput
                    defaultValue={value}
                    readOnly
                    className="w-64"
                  />
                </td>
              </tr>
            ))}

            <tr>
              <td colSpan="2" className="p-3">
                <div className="w-full flex justify-end space-x-3">
                  <Button
                    onClick={onBackToProducts}
                    variant="secondary"
                  >
                    Back to Product Details
                  </Button>
                  <Button
                    onClick={onPreviousCall}
                    variant="secondary"
                  >
                    Previous Call
                  </Button>
                  <Button
                    onClick={onViewAndUpload}
                    variant="primary"
                  >
                    View & Upload
                  </Button>
                  <Button
                    onClick={onRegisterCallDirect}
                    variant="success"
                  >
                    Register Call
                  </Button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Call Information */}
      <div>
        <h3 className="font-bold text-lg">Call Information</h3>
        <table className="min-w-full border">
          <tbody>
            <tr>
              <td className="p-2 font-semibold">Call Type</td>
              <td className="p-2">
                <FilterSelect
                  value={callData.callType || ''}
                  onChange={(e) => handleCallDataChange('callType', e.target.value)}
                  options={callTypeOptions}
                  className="w-64"
                />
              </td>

              <td className="p-2 font-semibold">Call Date</td>
              <td className="p-2">
                <FormInput
                  type="date"
                  value={callData.callDate || ''}
                  onChange={(e) => handleCallDataChange('callDate', e.target.value)}
                  className="w-64"
                />
              </td>

              <td className="p-2 font-semibold">Complaint</td>
              <td className="p-2">
                <textarea
                  value={callData.complaint || ''}
                  onChange={(e) => handleCallDataChange('complaint', e.target.value)}
                  className="border p-2 w-64 rounded h-20"
                />
              </td>
            </tr>

            <tr>
              <td className="p-2 font-semibold">Estimated Time</td>
              <td className="p-2">
                <FormInput
                  type="number"
                  value={callData.estimatedTime || ''}
                  onChange={(e) => handleCallDataChange('estimatedTime', e.target.value)}
                  className="w-64"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Save & Back Buttons */}
      <div className="flex gap-3">
        <Button
          onClick={onSaveCall}
          variant="success"
        >
          Save
        </Button>

        <Button
          onClick={onBackToCustomer}
          variant="secondary"
        >
          Back to Customer Details
        </Button>
      </div>
    </div>
  );
}
