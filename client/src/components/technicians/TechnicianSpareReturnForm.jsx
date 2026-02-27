/**
 * TechnicianSpareReturnForm.jsx
 * 
 * Component for technicians to submit spare return requests
 * Shows options to return:
 * - Defective spares collected from customers
 * - Unused spares from the inventory allocated for the call
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';

const TechnicianSpareReturnForm = ({ callId, technicianId, onSuccess }) => {
  const [formData, setFormData] = useState({
    callId: callId || '',
    items: [
      {
        spareId: '',
        itemType: 'defective', // or 'unused'
        requestedQty: 1,
        defectReason: ''
      }
    ],
    remarks: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [spares, setSpares] = useState([]);
  const [loadingSpares, setLoadingSpares] = useState(false);

  // Fetch available spares for the technician
  useEffect(() => {
    if (technicianId) {
      fetchTechnicianInventory();
    }
  }, [technicianId]);

  const fetchTechnicianInventory = async () => {
    try {
      setLoadingSpares(true);
      const response = await axios.get(
        `/api/technicians/${technicianId}/inventory`,
        {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }
      );

      if (response.data && response.data.length > 0) {
        setSpares(response.data);
      }
    } catch (err) {
      console.error('Error fetching technician inventory:', err);
      setError('Failed to load technician inventory');
    } finally {
      setLoadingSpares(false);
    }
  };

  const handleAddItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          spareId: '',
          itemType: 'defective',
          requestedQty: 1,
          defectReason: ''
        }
      ]
    }));
  };

  const handleRemoveItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleItemChange = (index, field, value) => {
    setFormData(prev => {
      const newItems = [...prev.items];
      newItems[index] = {
        ...newItems[index],
        [field]: value
      };
      return { ...prev, items: newItems };
    });
  };

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validation
    if (formData.items.length === 0) {
      setError('Please add at least one spare to return');
      return;
    }

    for (const item of formData.items) {
      if (!item.spareId) {
        setError('Please select a spare part for all items');
        return;
      }
      if (!item.requestedQty || item.requestedQty <= 0) {
        setError('Quantity must be greater than 0');
        return;
      }
      if (item.itemType === 'defective' && !item.defectReason) {
        setError('Please provide a defect reason for defective spares');
        return;
      }
    }

    try {
      setLoading(true);

      const response = await axios.post(
        '/api/technician-spare-returns/create',
        formData,
        {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }
      );

      if (response.data.success) {
        setSuccess(`Spare return request submitted successfully! Return #: ${response.data.returnNumber}`);
        
        // Reset form
        setFormData({
          callId: callId || '',
          items: [
            {
              spareId: '',
              itemType: 'defective',
              requestedQty: 1,
              defectReason: ''
            }
          ],
          remarks: ''
        });

        // Call success callback
        if (onSuccess) {
          onSuccess(response.data);
        }

        // Clear success message after 5 seconds
        setTimeout(() => setSuccess(null), 5000);
      }
    } catch (err) {
      console.error('Error submitting return request:', err);
      setError(err.response?.data?.error || 'Failed to submit return request');
    } finally {
      setLoading(false);
    }
  };

  const getSpareLabel = (spareId) => {
    const spare = spares.find(s => s.sku === spareId || s.id === parseInt(spareId));
    if (spare) {
      return `${spare.sku || spare.id} - ${spare.spareName || 'Unknown'}`;
    }
    return 'Select spare';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Submit Spare Return Request</h2>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          ❌ {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
          ✅ {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Call ID */}
        {!callId && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Call ID (Optional)
            </label>
            <input
              type="text"
              value={formData.callId}
              onChange={(e) => handleFieldChange('callId', e.target.value)}
              placeholder="Enter call ID if this return is for a specific call"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {/* Spare Items */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Spare Items to Return</h3>
            <button
              type="button"
              onClick={handleAddItem}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition"
              disabled={loadingSpares}
            >
              + Add Item
            </button>
          </div>

          {formData.items.map((item, index) => (
            <div
              key={index}
              className="mb-4 p-4 border border-gray-200 rounded-md bg-gray-50"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Spare Part Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Spare Part *
                  </label>
                  <select
                    value={item.spareId}
                    onChange={(e) => handleItemChange(index, 'spareId', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    disabled={loadingSpares}
                    required
                  >
                    <option value="">
                      {loadingSpares ? 'Loading spares...' : 'Select spare'}
                    </option>
                    {spares.map((spare) => (
                      <option key={spare.id} value={spare.id}>
                        {spare.sku || spare.id} - {spare.spareName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Item Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Return Type *
                  </label>
                  <select
                    value={item.itemType}
                    onChange={(e) => handleItemChange(index, 'itemType', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="defective">Defective (collected from customer)</option>
                    <option value="unused">Unused (not used in call)</option>
                  </select>
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    value={item.requestedQty}
                    onChange={(e) =>
                      handleItemChange(index, 'requestedQty', parseInt(e.target.value) || 0)
                    }
                    min="1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                {/* Defect Reason (only for defective items) */}
                {item.itemType === 'defective' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Defect Reason *
                    </label>
                    <input
                      type="text"
                      value={item.defectReason || ''}
                      onChange={(e) => handleItemChange(index, 'defectReason', e.target.value)}
                      placeholder="e.g., Not working, Damaged, Water damage"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                )}
              </div>

              {/* Remove Button */}
              {formData.items.length > 1 && (
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    className="text-red-500 hover:text-red-700 font-medium text-sm"
                  >
                    Remove Item
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Remarks */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Additional Remarks
          </label>
          <textarea
            value={formData.remarks}
            onChange={(e) => handleFieldChange('remarks', e.target.value)}
            placeholder="Any additional notes about the return..."
            rows="3"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Submit Button */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading || loadingSpares}
            className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-semibold py-3 rounded-md transition"
          >
            {loading ? 'Submitting...' : 'Submit Return Request'}
          </button>
          <button
            type="reset"
            className="flex-1 bg-gray-400 hover:bg-gray-500 text-white font-semibold py-3 rounded-md transition"
          >
            Clear Form
          </button>
        </div>
      </form>

      {/* Summary */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <h4 className="font-semibold text-gray-800 mb-2">📋 Return Summary</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>✓ Defective spares: {formData.items.filter(i => i.itemType === 'defective').length}</li>
          <li>✓ Unused spares: {formData.items.filter(i => i.itemType === 'unused').length}</li>
          <li>✓ Total items: {formData.items.length}</li>
            <li>✓ Total quantity: {formData.items.reduce((sum, i) => sum + (i.requestedQty || 0), 0)}</li>
        </ul>
      </div>
    </div>
  );
};

export default TechnicianSpareReturnForm;
