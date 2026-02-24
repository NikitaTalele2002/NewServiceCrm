import React from 'react';
import FormInput from '../common/FormInput';
import FilterSelect from '../common/FilterSelect';
import Button from '../common/Button';

export default function CallInfoSection({
  callInfo,
  onCallInfoChange,
  onAssignCenter,
  onSubmitComplaint,
  assigning,
  submitting
}) {
  const callTypeOptions = [
    { id: 'Installation', label: 'Installation' },
    { id: 'Service', label: 'Service' },
    { id: 'Demo', label: 'Demo' },
    { id: 'DCF', label: 'DCF' },
    { id: 'Replacement', label: 'Replacement' },
    { id: 'Distributor/Dealer stock check', label: 'Distributor/Dealer stock check' },
    { id: 'Other', label: 'Other' }
  ];

  const appointmentTimeOptions = [
    { id: '9-10 AM', label: '9-10 AM' },
    { id: '10-11 AM', label: '10-11 AM' },
    { id: '11-12 PM', label: '11-12 PM' },
    { id: '12-1 PM', label: '12-1 PM' },
    { id: '1-2 PM', label: '1-2 PM' },
    { id: '2-3 PM', label: '2-3 PM' },
    { id: '3-4 PM', label: '3-4 PM' },
    { id: '4-5 PM', label: '4-5 PM' },
    { id: '5-6 PM', label: '5-6 PM' },
    { id: '6-7 PM', label: '6-7 PM' }
  ];

  const callSourceOptions = [
    { id: 'Voice', label: 'Voice' },
    { id: 'WhatsApp', label: 'WhatsApp' }
  ];

  const handleCallTypeChange = (value) => {
    onCallInfoChange({ ...callInfo, CallType: value });
  };

  const handleAppointmentTimeChange = (value) => {
    onCallInfoChange({ ...callInfo, AppointmentTime: value });
  };

  const handleCallSourceChange = (value) => {
    onCallInfoChange({ ...callInfo, CallSource: value });
  };

  return (
    <div className="mb-6 p-6 bg-yellow-50 rounded-lg shadow">
      <h4 className="font-semibold text-lg mb-4 text-gray-800">Call Information</h4>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Call Type */}
        <FilterSelect
          label="Call Type"
          value={callInfo.CallType}
          onChange={handleCallTypeChange}
          options={callTypeOptions}
          optionValue="id"
          optionLabel="label"
        />

        {/* Quantity or Bulk */}
        <div>
          {callInfo.CallType === 'Distributor/Dealer stock check' ? (
            <FormInput
              label="Quantity"
              type="checkbox"
              name="Bulk"
              value={!!callInfo.Bulk}
              onChange={(e) => onCallInfoChange({ ...callInfo, Bulk: e.target.checked })}
            />
          ) : (
            <FormInput
              label="Quantity"
              type="number"
              min="1"
              value={callInfo.Qty}
              onChange={(e) => onCallInfoChange({ ...callInfo, Qty: Number(e.target.value) })}
            />
          )}
        </div>

        {/* Caller Mobile */}
        <FormInput
          label="Caller Mobile"
          type="tel"
          value={callInfo.CallerMobile}
          onChange={(e) => onCallInfoChange({ ...callInfo, CallerMobile: e.target.value })}
          placeholder="Enter mobile number"
          required
        />

        {/* Appointment Date */}
        <FormInput
          label="Appointment Date"
          type="date"
          value={callInfo.AppointmentDate}
          onChange={(e) => onCallInfoChange({ ...callInfo, AppointmentDate: e.target.value })}
        />

        {/* Appointment Time */}
        <FilterSelect
          label="Appointment Time"
          value={callInfo.AppointmentTime}
          onChange={handleAppointmentTimeChange}
          options={appointmentTimeOptions}
          optionValue="id"
          optionLabel="label"
        />

        {/* Dealer Name */}
        <FormInput
          label="Dealer Name"
          type="text"
          value={callInfo.DealerName}
          onChange={(e) => onCallInfoChange({ ...callInfo, DealerName: e.target.value })}
          placeholder="Enter dealer name"
        />

        {/* Call Source */}
        <FilterSelect
          label="Call Source"
          value={callInfo.CallSource}
          onChange={handleCallSourceChange}
          options={callSourceOptions}
          optionValue="id"
          optionLabel="label"
        />

        {/* Other Reason (if CallType === "Other") */}
        {callInfo.CallType === 'Other' && (
          <div className="md:col-span-2">
            <FormInput
              label="Other (please describe)"
              type="text"
              value={callInfo.OtherReason}
              onChange={(e) => onCallInfoChange({ ...callInfo, OtherReason: e.target.value })}
              placeholder="Describe the other call type"
            />
          </div>
        )}

        {/* Customer Remarks */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">Customer Remarks</label>
          <textarea
            value={callInfo.CustomerRemarks}
            onChange={(e) => onCallInfoChange({ ...callInfo, CustomerRemarks: e.target.value })}
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
            rows={3}
            placeholder="Enter customer remarks"
            required
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 mt-6">
        <Button
          onClick={onAssignCenter}
          loading={assigning}
          variant="primary"
        >
          Assign Center
        </Button>
        <Button
          onClick={onSubmitComplaint}
          loading={submitting}
          variant="success"
        >
          Submit Complaint
        </Button>
      </div>
    </div>
  );
}
