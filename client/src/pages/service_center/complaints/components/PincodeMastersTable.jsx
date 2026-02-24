import React from 'react';

const PincodeMastersTable = ({
  states,
  cities,
  pincodes,
  selectedState,
  selectedCity,
  selectedPincode,
  onStateChange,
  onCityChange,
  onPincodeChange,
  onSubmit
}) => {
  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="space-y-4 bg-white p-4 rounded shadow">
        <div>
          <label className="block text-sm font-medium">State</label>
          <select
            value={selectedState}
            onChange={(e) => onStateChange(e.target.value)}
            className="mt-1 block w-full border rounded p-2">
            <option value="">-- Select State --</option>
            {states.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">City</label>
          <select
            value={selectedCity}
            onChange={(e) => onCityChange(e.target.value)}
            className="mt-1 block w-full border rounded p-2"
            disabled={!selectedState}>
            <option value="">-- Select City --</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">Pincode</label>
          <select
            value={selectedPincode}
            onChange={(e) => onPincodeChange(e.target.value)}
            className="mt-1 block w-full border rounded p-2"
            disabled={!selectedCity}>
            <option value="">-- Select Pincode --</option>
            {pincodes.map((p) => (
              <option key={p.id} value={p.id}>{p.code}</option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          disabled={!selectedState || !selectedCity || !selectedPincode}>
          Save Selection
        </button>
      </form>

      {/* Display selected values */}
      {(selectedState || selectedCity || selectedPincode) && (
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-lg font-semibold mb-2">Selected Location</h3>
          <p><strong>State:</strong> {states.find(s => s.id === selectedState)?.name || '-'}</p>
          <p><strong>City:</strong> {cities.find(c => c.id === selectedCity)?.name || '-'}</p>
          <p><strong>Pincode:</strong> {pincodes.find(p => p.id === selectedPincode)?.code || '-'}</p>
        </div>
      )}
    </div>
  );
};

export default PincodeMastersTable;