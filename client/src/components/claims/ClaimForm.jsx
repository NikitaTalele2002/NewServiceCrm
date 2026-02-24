import React from 'react';
import FormInput from '../common/FormInput';
import FilterSelect from '../common/FilterSelect';
import Button from '../common/Button';

export default function ClaimForm({
  formData,
  onChange,
  onSearch,
  onReset,
  onUpdate,
  onPreviewInvoice,
  loading
}) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i).map(year => ({
    id: year,
    label: year.toString()
  }));

  const months = [
    { id: '01', label: 'January' },
    { id: '02', label: 'February' },
    { id: '03', label: 'March' },
    { id: '04', label: 'April' },
    { id: '05', label: 'May' },
    { id: '06', label: 'June' },
    { id: '07', label: 'July' },
    { id: '08', label: 'August' },
    { id: '09', label: 'September' },
    { id: '10', label: 'October' },
    { id: '11', label: 'November' },
    { id: '12', label: 'December' }
  ];

  const handleYearChange = (value) => {
    onChange({ target: { name: 'year', value } });
  };

  const handleMonthChange = (value) => {
    onChange({ target: { name: 'month', value } });
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Title */}
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Submit Claim</h1>

      {/* Year and Month Selection */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-700">Select Period</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FilterSelect
            label="Year"
            value={formData.year}
            onChange={handleYearChange}
            options={years}
            optionValue="id"
            optionLabel="label"
          />

          <FilterSelect
            label="Month"
            value={formData.month}
            onChange={handleMonthChange}
            options={months}
            optionValue="id"
            optionLabel="label"
          />
        </div>
      </div>

      {/* Search and Reset Buttons */}
      <div className="flex gap-4 mb-6">
        <Button
          onClick={onSearch}
          loading={loading}
          variant="primary"
        >
          Search
        </Button>
        <Button
          onClick={onReset}
          variant="secondary"
        >
          Reset
        </Button>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-700">Claim Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <FormInput
            label="Invoice Number"
            type="text"
            name="invoiceNumber"
            value={formData.invoiceNumber}
            onChange={onChange}
            placeholder="Enter invoice number..."
          />

          <FormInput
            label="Number of Complaints (Manual)"
            type="number"
            name="complaints"
            value={formData.complaints}
            onChange={onChange}
            placeholder="Enter number of complaints..."
          />
        </div>

        {/* Update & Invoice Buttons */}
        <div className="flex justify-center gap-4 mt-8">
          <Button
            onClick={onUpdate}
            loading={loading}
            variant="primary"
          >
            Update
          </Button>
          <Button
            onClick={onPreviewInvoice}
            variant="success"
          >
            Preview Invoice
          </Button>
        </div>
      </div>
    </div>
  );
}
