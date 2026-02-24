import React, { useState } from 'react';
import LocationSelector from '../../components/LocationSelector';

export default function CustomerEditForm({ customer, onSave, onCancel, loading }) {
  const [form, setForm] = useState({
    name: customer.name || '',
    alt_mob_no: customer.alt_mob_no || '',
    email: customer.email || '',
    house_no: customer.address?.house_no || customer.house_no || '',
    street_name: customer.address?.street_name || customer.street_name || '',
    building_name: customer.address?.building_name || customer.building_name || '',
    area: customer.address?.area || customer.area || '',
    landmark: customer.address?.landmark || customer.landmark || '',
    state: customer.address?.state_id || customer.state_id || '',
    city: customer.address?.city_id || customer.city_id || '',
    pincode: customer.address?.pincode || customer.pincode || '',
  });

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
  }

  function updateLocation(locationData) {
    setForm((prev) => ({
      ...prev,
      state: locationData.state || '',
      city: locationData.city || '',
      pincode: locationData.pincode || '',
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    
    // Validate required fields
    if (!form.name.trim()) {
      setError('Customer name is required');
      return;
    }

    // Validate email if provided
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError('Invalid email format');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const payload = {
        name: form.name.trim(),
        alt_mob_no: form.alt_mob_no?.trim() || null,
        email: form.email?.trim() || null,
        house_no: form.house_no?.trim() || null,
        street_name: form.street_name?.trim() || null,
        building_name: form.building_name?.trim() || null,
        area: form.area?.trim() || null,
        landmark: form.landmark?.trim() || null,
        state_id: form.state ? (isNaN(form.state) ? null : parseInt(form.state)) : null,
        city_id: form.city ? (isNaN(form.city) ? null : parseInt(form.city)) : null,
        pincode: form.pincode?.trim() || null,
      };

      console.log('Sending customer update payload:', payload);

      // Update API call - assuming PUT endpoint exists
      const res = await fetch(`http://localhost:5000/api/call-center/customer/${customer.customer_id || customer.Id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      console.log('Update response:', { status: res.status, data });

      if (res.ok) {
        alert('✓ Customer details updated successfully!');
        onSave({ ...customer, ...payload });
      } else {
        setError(data.error || 'Failed to update customer');
      }
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mb-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">✎ Edit Customer Details</h2>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded p-3">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Row 1: Name and Alt Mobile */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Customer Name *
            </label>
            <input
              type="text"
              placeholder="Enter full name"
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Alternate Mobile
            </label>
            <input
              type="tel"
              placeholder="Alternate number"
              value={form.alt_mob_no}
              onChange={(e) => updateField('alt_mob_no', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Row 2: Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email
          </label>
          <input
            type="email"
            placeholder="customer@example.com"
            value={form.email}
            onChange={(e) => updateField('email', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Row 3: Address Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              House Number
            </label>
            <input
              type="text"
              placeholder="e.g., 123"
              value={form.house_no}
              onChange={(e) => updateField('house_no', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Street Name
            </label>
            <input
              type="text"
              placeholder="Street name"
              value={form.street_name}
              onChange={(e) => updateField('street_name', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Row 4: Building and Area */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Building Name
            </label>
            <input
              type="text"
              placeholder="Building name"
              value={form.building_name}
              onChange={(e) => updateField('building_name', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Area
            </label>
            <input
              type="text"
              placeholder="Area/Locality"
              value={form.area}
              onChange={(e) => updateField('area', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Row 5: Landmark */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Landmark
          </label>
          <input
            type="text"
            placeholder="Nearby landmark"
            value={form.landmark}
            onChange={(e) => updateField('landmark', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Row 6: Location Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Location
          </label>
          <LocationSelector
            value={{ state: form.state, city: form.city, pincode: form.pincode }}
            onChange={updateLocation}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-6 border-t pt-4">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-black font-semibold py-3 px-4 rounded-lg transition"
          >
            {saving ? 'Saving...' : '✓ Save Changes'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 font-semibold py-3 px-4 rounded-lg transition"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
