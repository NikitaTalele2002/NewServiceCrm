import React, { useState } from 'react';
import FormInput from '../../components/common/FormInput';
import Button from '../../components/common/Button';
import LocationSelector from '../../components/LocationSelector';
import { getApiUrl } from '../../config/apiConfig';

export default function CustomerRegistrationForm({ onCustomerCreated, onCancel, loading }) {
  const [form, setForm] = useState({
    name: '',
    mobile_no: '',
    alt_mob_no: '',
    email: '',
    house_no: '',
    street_name: '',
    building_name: '',
    area: '',
    landmark: '',
    state: '',
    city: '',
    pincode: '',
  });

  const [error, setError] = useState('');
  const [registering, setRegistering] = useState(false);

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
    if (!form.mobile_no.trim()) {
      setError('Mobile number is required');
      return;
    }

    // Validate mobile format
    if (!/^\d{10,15}$/.test(form.mobile_no.replace(/[^\d]/g, ''))) {
      setError('Invalid mobile number format (10-15 digits)');
      return;
    }

    // Validate email if provided
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError('Invalid email format');
      return;
    }

    setRegistering(true);
    setError('');

    try {
      const payload = {
        name: form.name.trim(),
        mobile_no: form.mobile_no.trim(),
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

      console.log('Sending customer registration payload:', payload);

      const res = await fetch(getApiUrl('/call-center/customer'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      console.log('Registration response:', { status: res.status, data });

      if (res.ok && data.success) {
        alert('✓ Customer registered successfully!');
        onCustomerCreated(data.customer);
      } else {
        // Handle specific error cases
        let errorMsg = data.error || 'Failed to register customer';
        
        if (res.status === 409) {
          // Conflict - duplicate entry
          if (data.field === 'mobile_no') {
            errorMsg = 'A customer with this mobile number already exists';
          } else if (data.field === 'email') {
            errorMsg = 'A customer with this email already exists';
          }
        } else if (res.status === 400) {
          // Bad request
          if (data.field === 'mobile_no') {
            errorMsg = 'Invalid mobile number format (10-15 digits)';
          } else if (data.field === 'email') {
            errorMsg = 'Invalid email format';
          } else if (data.field && data.field.includes('id')) {
            errorMsg = 'Invalid location selected. Please select valid State/City/Pincode';
          }
        }
        
        setError(errorMsg);
        console.error('Registration error:', data);
      }
    } catch (err) {
      console.error('Network error:', err);
      setError(`Network Error: ${err.message}`);
    } finally {
      setRegistering(false);
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mb-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">👤 Register New Customer</h2>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded p-3">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Row 1: Name and Mobile */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput
            label="Customer Name"
            placeholder="Enter full name"
            value={form.name}
            onChange={(e) => updateField('name', e.target.value)}
            required
          />
          <FormInput
            label="Mobile Number"
            placeholder="10-15 digits"
            value={form.mobile_no}
            onChange={(e) => updateField('mobile_no', e.target.value)}
            required
          />
        </div>

        {/* Row 2: Alt Mobile and Email */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput
            label="Alternate Mobile (Optional)"
            placeholder="Alternate number"
            value={form.alt_mob_no}
            onChange={(e) => updateField('alt_mob_no', e.target.value)}
          />
          <FormInput
            label="Email (Optional)"
            type="email"
            placeholder="customer@example.com"
            value={form.email}
            onChange={(e) => updateField('email', e.target.value)}
          />
        </div>

        {/* Row 3: Address Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput
            label="House Number (Optional)"
            placeholder="e.g., 123"
            value={form.house_no}
            onChange={(e) => updateField('house_no', e.target.value)}
          />
          <FormInput
            label="Street Name (Optional)"
            placeholder="Street name"
            value={form.street_name}
            onChange={(e) => updateField('street_name', e.target.value)}
          />
        </div>

        {/* Row 4: Building and Area */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput
            label="Building Name (Optional)"
            placeholder="Building name"
            value={form.building_name}
            onChange={(e) => updateField('building_name', e.target.value)}
          />
          <FormInput
            label="Area (Optional)"
            placeholder="Area/Locality"
            value={form.area}
            onChange={(e) => updateField('area', e.target.value)}
          />
        </div>

        {/* Row 5: Landmark */}
        <FormInput
          label="Landmark (Optional)"
          placeholder="Nearby landmark"
          value={form.landmark}
          onChange={(e) => updateField('landmark', e.target.value)}
        />

        {/* Row 6: Location Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Location (Optional)</label>
          <LocationSelector
            value={{ state: form.state, city: form.city, pincode: form.pincode }}
            onChange={updateLocation}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-6">
          <Button 
            type="submit" 
            disabled={registering || loading}
            className="flex-1"
            variant="primary"
          >
            {registering ? 'Registering...' : 'Register Customer'}
          </Button>
          <Button 
            type="button"
            onClick={onCancel}
            variant="secondary"
            className="flex-1"
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
