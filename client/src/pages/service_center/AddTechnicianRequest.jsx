import React, { useState } from 'react';
import { getApiUrl } from '../../config/apiConfig';
import FormInput from '../../components/common/FormInput';
import Button from '../../components/common/Button';

const AddTechnicianRequest = () => {
  const [formData, setFormData] = useState({
    technicianName: '',
    technicianMobile: '',
    technicianEmail: '',
    notes: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl('/technician-status-requests'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          requestType: 'add',
          technicianName: formData.technicianName,
          technicianMobile: formData.technicianMobile,
          technicianEmail: formData.technicianEmail,
          notes: formData.notes
        })
      });
      if (!response.ok) throw new Error('Failed to submit request');
      alert('Request submitted successfully');
      setFormData({ technicianName: '', technicianMobile: '', technicianEmail: '', notes: '' });
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Request to Add New Technician</h1>
      <form onSubmit={handleSubmit} className="max-w-md">
        <FormInput
          label="Technician Name"
          name="technicianName"
          type="text"
          value={formData.technicianName}
          onChange={handleChange}
          required
        />
        <FormInput
          label="Mobile"
          name="technicianMobile"
          type="text"
          value={formData.technicianMobile}
          onChange={handleChange}
          required
        />
        <FormInput
          label="Email"
          name="technicianEmail"
          type="email"
          value={formData.technicianEmail}
          onChange={handleChange}
        />
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Notes</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded"
            rows="3"
          />
        </div>
        <Button type="submit" variant="primary">
          Submit Request
        </Button>
      </form>
    </div>
  );
};

export default AddTechnicianRequest;