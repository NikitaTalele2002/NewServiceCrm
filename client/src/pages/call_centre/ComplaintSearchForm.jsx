import React from 'react';
import FormInput from '../../components/common/FormInput';
import Button from '../../components/common/Button';
import StatusFilterComponent from '../../components/StatusFilterComponent';

export default function ComplaintSearchForm({ formData, onFormChange, onSubmit, loading }) {
  const handleChange = (e) => {
    const { name, value } = e.target;
    onFormChange(name, value);
  };

  return (
    <form onSubmit={onSubmit} className="bg-white p-5 border rounded-lg shadow">
      <p className="text-red-500 text-sm mb-3">At least one search criteria is mandatory.</p>

      <table className="w-full">
        <tbody>
          <tr>
            <td className="p-2 font-semibold">Mobile No</td>
            <td className="p-2">
              <FormInput
                type="text"
                name="mobileNo"
                value={formData.mobileNo}
                onChange={handleChange}
                className="w-64"
              />
            </td>

            <td className="p-2 font-semibold">Complaint ID</td>
            <td className="p-2">
              <FormInput
                type="text"
                name="complaintId"
                value={formData.complaintId}
                onChange={handleChange}
                className="w-64"
              />
            </td>
          </tr>

          <tr>
            <td className="p-2 font-semibold">Customer ID</td>
            <td className="p-2">
              <FormInput
                type="text"
                name="customerId"
                value={formData.customerId}
                onChange={handleChange}
                className="w-64"
              />
            </td>

            <td className="p-2 font-semibold">Name</td>
            <td className="p-2">
              <FormInput
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-64"
              />
            </td>
          </tr>

          <tr>
            <td className="p-2 font-semibold">State</td>
            <td className="p-2">
              <FormInput
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
                className="w-64"
              />
            </td>

            <td className="p-2 font-semibold">City</td>
            <td className="p-2">
              <FormInput
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="w-64"
              />
            </td>
          </tr>

          <tr>
            <td className="p-2 font-semibold">Status</td>
            <td className="p-2">
              <StatusFilterComponent
                selectedStatus={formData.status}
                onStatusChange={(value) => onFormChange('status', value)}
              />
            </td>

            <td colSpan="2"></td>
          </tr>

          <tr>
            <td colSpan="4" className="p-2 text-center">
              <Button
                type="submit"
                variant="primary"
                disabled={loading}
              >
                {loading ? 'Searching...' : 'Search'}
              </Button>
            </td>
          </tr>
        </tbody>
      </table>
    </form>
  );
}