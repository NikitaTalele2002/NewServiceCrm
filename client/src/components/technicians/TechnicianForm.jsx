import React, { useState } from 'react';

const TechnicianForm = ({ onSubmit, onCancel, isVisible }) => {
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const result = await onSubmit(formData);

    if (result.success) {
      setFormData({ name: '', mobile: '', email: '', notes: '' });
      onCancel();
    } else {
      alert('Error: ' + result.error);
    }

    setIsSubmitting(false);
  };

  const handleCancel = () => {
    setFormData({ name: '', mobile: '', email: '', notes: '' });
    onCancel();
  };

  if (!isVisible) return null;

  return (
    <div className="bg-gray-50 p-6 rounded-lg mb-6 border">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Add New Technician</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter technician name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mobile *
            </label>
            <input
              type="tel"
              name="mobile"
              value={formData.mobile}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter mobile number"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter email address"/>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Additional notes (optional)"/>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className={`px-6 py-2 rounded-md text-black font-medium ${
              isSubmitting
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-500 hover:bg-green-600 focus:ring-2 focus:ring-green-500'
            }`}>
            {isSubmitting ? 'Submitting...' : 'Submit Request'}
          </button>

          <button
            type="button"
            onClick={handleCancel}
            className="px-6 py-2 rounded-md text-gray-700 bg-gray-200 hover:bg-gray-300 focus:ring-2 focus:ring-gray-500"
          >Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default TechnicianForm;
