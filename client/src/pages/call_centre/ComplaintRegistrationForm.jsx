import React, { useState, useEffect } from 'react';
import FormInput from '../../components/common/FormInput';
import Button from '../../components/common/Button';
import FilterSelect from '../../components/common/FilterSelect';
import { registerComplaint, getServiceCentersByPincode } from '../../services/callCenterService_updated';

export default function ComplaintRegistrationForm({
  customer,
  product,
  onComplaintRegistered,
  onAddAnotherProduct,
  onBackToSearch
}) {
  const [callData, setCallData] = useState({
    CallType: '',
    AppointmentDate: '',
    AppointmentTime: '',
    CallerMobile: customer?.mobile_no || '',
    CustomerRemarks: '',
    DealerName: '',
    CallSource: 'Voice',
    Qty: 1,
    LocationType: '',
    ASC: '',
  });

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [serviceCenters, setServiceCenters] = useState([]);
  const [locationTypeInfo, setLocationTypeInfo] = useState(null);
  const [registeredCallId, setRegisteredCallId] = useState(null);
  const [assigning, setAssigning] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);

  const callTypeOptions = [
    { value: '', label: '-- Select Call Type --' },
    { value: 'Complaint', label: 'Complaint' },
    { value: 'Installation', label: 'Installation' },
    { value: 'Service Request', label: 'Service Request' },
    { value: 'Warranty Check', label: 'Warranty Check' }
  ];

  const callSourceOptions = [
    { value: 'Voice', label: 'Voice Call' },
    { value: 'SMS', label: 'SMS' },
    { value: 'Email', label: 'Email' },
    { value: 'Web', label: 'Web Portal' },
    { value: 'Mobile App', label: 'Mobile App' }
  ];

  // Manually fetch service centers when user clicks "Find" button
  const handleFindServiceCenters = async () => {
    // Get pincode from either top level or nested address
    // Prioritize customer.address.pincode as that's what the API returns
    const rawPincode = customer?.address?.pincode || customer?.pincode;
    
    // Trim whitespace and validate
    const pincode = rawPincode ? String(rawPincode).trim() : '';
    
    if (!pincode) {
      setError('Pincode not available for this customer. Please ensure the customer address includes a valid pincode.');
      return;
    }

    setSearching(true);
    setError('');
    setServiceCenters([]);
    setCallData(prev => ({ ...prev, ASC: '' }));
    setLocationTypeInfo(null);

    try {
      const centers = await getServiceCentersByPincode(pincode);
      if (centers && centers.length > 0) {
        setServiceCenters(centers);
        setSearchPerformed(true);
      } else {
        setError(`⚠️ No service centers found for pincode: ${pincode}. This pincode may not be in our serviceable area. Please verify the customer's pincode.`);
        setSearchPerformed(true);
      }
    } catch (err) {
      setError(`Error finding service centers: ${err.message}`);
      setSearchPerformed(true);
    } finally {
      setSearching(false);
    }
  };

  function updateCallData(field, value) {
    setCallData((prev) => ({ ...prev, [field]: value }));
    setError('');
    
    // Update location type info when ASC is selected
    if (field === 'ASC' && value) {
      const selected = serviceCenters.find(sc => sc.asc_id === parseInt(value));
      if (selected) {
        setLocationTypeInfo({
          name: selected.asc_name,
          locationType: selected.location_type,
          distance: selected.two_way_distance,
        });
        setCallData(prev => ({ ...prev, LocationType: selected.location_type }));
      }
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    // Validate required fields
    if (!callData.CallType) {
      setError('Call Type is required');
      return;
    }
    if (!callData.AppointmentDate) {
      setError('Appointment Date is required');
      return;
    }
    if (!callData.AppointmentTime) {
      setError('Appointment Time is required');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const payload = {
        customer_id: customer.customer_id,
        customer_product_id: product.customers_products_id,
        remark: callData.CustomerRemarks || `${callData.CallType} - ${callData.CallSource}`,
        visit_date: callData.AppointmentDate,
        visit_time: callData.AppointmentTime,
        // Include the selected service center ID if available
        assigned_asc_id: callData.ASC ? parseInt(callData.ASC) : null,
        created_by: null
      };

      console.log('📋 Submitting complaint payload:', payload);
      console.log('📋 Selected ASC ID:', callData.ASC);
      console.log('📋 Location Info:', locationTypeInfo);

      const result = await registerComplaint(payload);

      console.log('📥 Complaint registration response:', result);
      console.log('📥 Response type:', typeof result);
      console.log('📥 Response keys:', result ? Object.keys(result) : 'null');

      // Validate the response structure
      if (!result) {
        setError('No response from server. Please try again.');
        setSubmitting(false);
        return;
      }

      // Check various possible response structures
      let callId = null;
      
      if (result?.call?.call_id) {
        callId = result.call.call_id;
      } else if (result?.call_id) {
        callId = result.call_id;
      } else if (result?.id) {
        callId = result.id;
      }

      console.log('📥 Extracted call ID:', callId);

      if (callId) {
        setRegisteredCallId(callId);
        
        const successMsg = `✓ Complaint registered successfully!\nCall ID: ${callId}`;
        console.log('✓ ' + successMsg);
        alert(successMsg);
        
        // Show success and clear form after 2 seconds
        setTimeout(() => {
          onComplaintRegistered && onComplaintRegistered({ ...result, call_id: callId });
        }, 2000);
      } else {
        const errorMsg = `Failed to register complaint - Invalid response structure received`;
        console.error('❌ ' + errorMsg);
        console.error('📋 Full response:', JSON.stringify(result, null, 2));
        setError('Failed to register complaint. The server response was invalid. Please try again.');
      }
    } catch (err) {
      const errorMsg = err.message || 'Unknown error occurred';
      console.error('❌ Error caught:', errorMsg, err);
      setError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">📞 Register Complaint</h2>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Customer Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-3">Customer & Product Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-blue-600 font-semibold">Customer Name</p>
            <p className="text-blue-900">{customer.name}</p>
          </div>
          <div>
            <p className="text-blue-600 font-semibold">Mobile Number</p>
            <p className="text-blue-900">{customer.mobile_no}</p>
          </div>
          <div>
            <p className="text-blue-600 font-semibold">Pincode</p>
            <p className="text-blue-900">{customer?.address?.pincode || customer?.pincode || 'N/A'}</p>
          </div>
          <div>
            <p className="text-blue-600 font-semibold">Serial Number</p>
            <p className="text-blue-900">{product.serial_no}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Row 1: Call Type and Source */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FilterSelect
            label="Call Type"
            options={callTypeOptions}
            value={callData.CallType}
            onChange={(value) => updateCallData('CallType', value)}
            optionValue="value"
            optionLabel="label"
            placeholder="-- Select Call Type --"
            required
          />
          <FilterSelect
            label="Call Source"
            options={callSourceOptions}
            value={callData.CallSource}
            onChange={(value) => updateCallData('CallSource', value)}
            optionValue="value"
            optionLabel="label"
            placeholder="-- Select Call Source --"
          />
        </div>

        {/* Row 2: Appointment Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput
            label="Appointment Date"
            type="date"
            value={callData.AppointmentDate}
            onChange={(e) => updateCallData('AppointmentDate', e.target.value)}
            required
          />
          <FormInput
            label="Appointment Time"
            type="time"
            value={callData.AppointmentTime}
            onChange={(e) => updateCallData('AppointmentTime', e.target.value)}
            required
          />
        </div>

        {/* Row 3: Contact Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput
            label="Caller Mobile Number"
            placeholder="Contact number for the call"
            value={callData.CallerMobile}
            onChange={(e) => updateCallData('CallerMobile', e.target.value)}
          />
          <FormInput
            label="Dealer Name"
            placeholder="Optional: Dealer or channel name"
            value={callData.DealerName}
            onChange={(e) => updateCallData('DealerName', e.target.value)}
          />
        </div>

        {/* Row 4: Quantity */}
        <FormInput
          label="Quantity Affected"
          type="number"
          min="1"
          value={callData.Qty}
          onChange={(e) => updateCallData('Qty', e.target.value)}
        />

        {/* Row 5: Remarks */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Customer Remarks / Details
          </label>
          <textarea
            placeholder="Enter customer's complaint details or remarks"
            value={callData.CustomerRemarks}
            onChange={(e) => updateCallData('CustomerRemarks', e.target.value)}
            rows="4"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* ================= SERVICE CENTER ASSIGNMENT SECTION ================= */}
        <div className="border-t-2 pt-6 mt-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">📍 Step: Assign Service Center</h3>

          {/* Service Center Search Section */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <h4 className="text-sm font-bold text-yellow-900 mb-3">🔍 Find Service Centers</h4>
            <button
              type="button"
              onClick={handleFindServiceCenters}
              disabled={searching}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-semibold transition"
            >
              {searching ? '⏳ Searching...' : `🔎 Find Service Centers for Pincode: ${(customer?.address?.pincode || customer?.pincode || 'N/A')}`}
            </button>
            <p className="text-xs text-yellow-700 mt-2">Click to search for available service centers in your area</p>
          </div>

          {/* Search Results Display */}
          {searchPerformed && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h4 className="text-sm font-bold text-blue-900 mb-3">📍 Available Service Centers</h4>
              {serviceCenters && serviceCenters.length > 0 ? (
                <div className="space-y-3">
                  {serviceCenters.map((sc, idx) => (
                    <div key={idx} className="bg-white border border-blue-100 rounded p-3 hover:bg-blue-50 transition">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-semibold text-blue-900">{sc.asc_name} ({sc.asc_code})</p>
                          <div className="mt-2 text-sm space-y-1">
                            <p><span className="font-semibold">Location Type:</span> <span className="text-blue-700 bg-blue-100 px-2 py-1 rounded">{sc.location_type === 'out_city' ? '🚗 Out of City' : '🏢 Local'}</span></p>
                            <p><span className="font-semibold">Distance:</span> <span className="text-green-700 font-bold">{sc.two_way_distance} km</span></p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            updateCallData('ASC', sc.asc_id);
                            setLocationTypeInfo({
                              locationType: sc.location_type,
                              distance: sc.two_way_distance,
                              name: sc.asc_name
                            });
                          }}
                          className="ml-2 px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 whitespace-nowrap"
                        >
                          Select ✓
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-red-600 text-sm">❌ No service centers found for this pincode</p>
              )}
            </div>
          )}

          {/* Selected Service Center Info - Form Fields */}
          {locationTypeInfo && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <h4 className="text-sm font-bold text-green-900 mb-4">✅ Selected Service Center Details</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* ASC Name Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Service Center Name
                  </label>
                  <input
                    type="text"
                    disabled
                    value={locationTypeInfo.name}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 cursor-not-allowed font-semibold"
                  />
                </div>

                {/* Location Type Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location Type
                  </label>
                  <input
                    type="text"
                    disabled
                    value={locationTypeInfo.locationType === 'out_city' ? 'Out of City' : 'Local'}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 cursor-not-allowed font-semibold"
                  />
                </div>

                {/* Distance Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Distance (km)
                  </label>
                  <input
                    type="text"
                    disabled
                    value={locationTypeInfo.distance}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 cursor-not-allowed font-semibold"
                  />
                </div>
              </div>

              {/* Change Selection Button */}
              <button
                type="button"
                onClick={() => {
                  setLocationTypeInfo(null);
                  setCallData(prev => ({ ...prev, ASC: '' }));
                }}
                className="mt-4 w-full px-3 py-2 bg-yellow-400 text-gray-800 rounded-lg text-sm hover:bg-yellow-500 font-semibold transition"
              >
                🔄 Change Service Center Selection
              </button>
            </div>
          )}

          {/* Error if no service center selected */}
          {searchPerformed && !locationTypeInfo && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-700 text-sm font-semibold">⚠️ Please select a service center before submitting</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-6 pt-4 border-t">
          <Button 
            type="submit" 
            disabled={submitting || assigning || !locationTypeInfo}
            className="flex-1"
            variant="primary"
          >
            {submitting || assigning ? 'Processing...' : 'Register & Assign Complaint'}
          </Button>
          <Button 
            type="button"
            onClick={onAddAnotherProduct}
            variant="secondary"
            className="flex-1"
          >
            Add Another Product
          </Button>
          <Button 
            type="button"
            onClick={onBackToSearch}
            variant="ghost"
            className="flex-1"
          >
            Back to Search
          </Button>
        </div>
      </form>
    </div>
  );
}
