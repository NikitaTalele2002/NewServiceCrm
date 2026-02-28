import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../../config/apiConfig';

/**
 * TechnicianSpareRequest Component
 * Allows technicians to submit spare part requests to their service center
 */
const TechnicianSpareRequest = () => {
  const [step, setStep] = useState('technician'); // technicianor done
  const [formData, setFormData] = useState({
    technicianId: '',
    callId: '',
    requestType: 'spare_request',
    requestReason: '',
    items: [{ spare_id: '', quantity: 1 }]
  });
  const [technicians, setTechnicians] = useState([]);
  const [spareParts, setSpareParts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const getToken = () => {
    let token = localStorage.getItem('token');
    if (!token) {
      token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJTQ1VzZXIiLCJjZW50ZXJJZCI6NCwicm9sZSI6InNlcnZpY2VfY2VudGVyIiwiaWF0IjoxNzcxMjM1NjU2fQ.oxbba2nqMYdAjWQmJK95SFbKzOf8a6l9AkEdFGFAx5s';
    }
    return token;
  };

  // Fetch technicians and spare parts on mount
  useEffect(() => {
    fetchTechnicians();
    fetchSpareParts();
  }, []);

  const fetchTechnicians = async () => {
    try {
      const token = getToken();
      const response = await fetch(getApiUrl('/technician-sc-spare-requests/technicians'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch technicians');
      const data = await response.json();
      setTechnicians(data.data || data.technicians || []);
      console.log('✅ Technicians loaded:', data.data?.length || 0);
    } catch (err) {
      console.error('Error fetching technicians:', err);
      setError('Failed to load technicians');
    }
  };

  const fetchSpareParts = async () => {
    try {
      const token = getToken();
      const response = await fetch(getApiUrl('/technician-sc-spare-requests/spares'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch spare parts');
      const data = await response.json();
      setSpareParts(data.data || data || []);
      console.log('✅ Spare parts loaded:', data.data?.length || 0);
    } catch (err) {
      console.error('Error fetching spare parts:', err);
    }
  };

  const handleFormChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index] = {
      ...newItems[index],
      [field]: field === 'quantity' ? parseInt(value) || 1 : value
    };
    setFormData(prev => ({
      ...prev,
      items: newItems
    }));
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { spare_id: '', quantity: 1 }]
    }));
  };

  const removeItem = (index) => {
    if (formData.items.length > 1) {
      setFormData(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Validate form
      if (!formData.technicianId) {
        throw new Error('Please select a technician');
      }
      if (!formData.callId) {
        throw new Error('Please enter a call ID');
      }
      if (formData.items.some(item => !item.spare_id || item.quantity < 1)) {
        throw new Error('Please fill all spare part details');
      }

      const token = getToken();
      const response = await fetch(getApiUrl('/technician-sc-spare-requests/create'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          technician_id: formData.technicianId,
          call_id: formData.callId,
          request_type: formData.requestType,
          request_reason: formData.requestReason,
          items: formData.items.map(item => ({
            spare_id: item.spare_id,
            quantity: item.quantity
          }))
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create request');
      }

      setSuccess(`✅ Spare request created successfully! Request ID: ${data.data?.requestId}`);
      setStep('done');
      
      // Reset form
      setTimeout(() => {
        setFormData({
          technicianId: '',
          callId: '',
          requestType: 'spare_request',
          requestReason: '',
          items: [{ spare_id: '', quantity: 1 }]
        });
        setStep('technician');
      }, 2000);

    } catch (err) {
      console.error('Error creating request:', err);
      setError(err.message || 'Failed to create spare request');
    } finally {
      setLoading(false);
    }
  };

  const getSparePartName = (spareId) => {
    const part = spareParts.find(p => String(p.Id || p.id) === String(spareId));
    return part ? `${part.PART} - ${part.DESCRIPTION}` : 'Select spare part';
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Create Spare Request</h1>
        <p className="text-gray-600 mb-6">Submit spare parts request from technician to service center ASC</p>

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 text-green-700 rounded">
            {success}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded">
            ❌ {error}
          </div>
        )}

        {step === 'done' ? (
          <div className="bg-white shadow rounded-lg p-8 text-center">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-green-600 mb-2">Request Submitted Successfully!</h2>
            <p className="text-gray-600 mb-6">The spare request has been created and is now awaiting ASC approval.</p>
            <button
              onClick={() => {
                setStep('technician');
                setSuccess('');
              }}
              className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
            >
              Create Another Request
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-6">
            {/* Technician Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Technician *</label>
              <select
                value={formData.technicianId}
                onChange={(e) => handleFormChange('technicianId', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Choose a technician --</option>
                {technicians.map(tech => (
                  <option key={tech.technician_id} value={tech.technician_id}>
                    {tech.name} (ID: {tech.technician_id})
                  </option>
                ))}
              </select>
            </div>

            {/* Call ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Call ID *</label>
              <input
                type="text"
                value={formData.callId}
                onChange={(e) => handleFormChange('callId', e.target.value)}
                placeholder="Enter call ID"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Request Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Request Reason</label>
              <textarea
                value={formData.requestReason}
                onChange={(e) => handleFormChange('requestReason', e.target.value)}
                placeholder="Enter reason for spare parts request"
                rows="3"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Spare Parts Items */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <label className="block text-sm font-medium text-gray-700">Spare Parts Required *</label>
                <button
                  type="button"
                  onClick={addItem}
                  className="text-sm bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                >
                  + Add More
                </button>
              </div>

              <div className="space-y-4">
                {formData.items.map((item, index) => (
                  <div key={index} className="flex gap-4 items-end p-4 bg-gray-50 rounded border border-gray-200">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Spare Part</label>
                      <select
                        value={item.spare_id}
                        onChange={(e) => handleItemChange(index, 'spare_id', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">-- Select spare part --</option>
                        {spareParts.map(part => (
                          <option key={part.Id || part.id} value={part.Id || part.id}>
                            {part.PART} - {part.DESCRIPTION}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="w-24">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {formData.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-green-500 text-white py-3 rounded-lg font-semibold hover:bg-green-600 disabled:bg-gray-400"
              >
                {loading ? '⏳ Submitting...' : '✅ Submit Spare Request'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormData({
                    technicianId: '',
                    callId: '',
                    requestType: 'spare_request',
                    requestReason: '',
                    items: [{ spare_id: '', quantity: 1 }]
                  });
                  setError('');
                }}
                className="px-6 py-3 bg-gray-400 text-white rounded-lg font-semibold hover:bg-gray-500"
              >
                Reset
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default TechnicianSpareRequest;
