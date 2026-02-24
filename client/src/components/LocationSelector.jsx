import React, { useState, useEffect } from 'react';
import { getStates, getCities, getPincodes } from '../pages/api';

/**
 * Reusable Location Selector Component
 * Usage: <LocationSelector value={{ state, city, pincode }} onChange={handleLocationChange} />
 * handleLocationChange receives: { state, city, pincode }
 */


export default function LocationSelector({ value = {}, onChange = () => {}, disabled = false }) {
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [pincodes, setPincodes] = useState([]);
  const [loading, setLoading] = useState(false);

  const selectedState = value.state || '';
  const selectedCity = value.city || '';
  const selectedPincode = value.pincode || '';

  // Load states on mount
  useEffect(() => {
    loadStates();
  }, []);

  
  // Reload cities when state changes
  useEffect(() => {
    if (selectedState) {
      setCities([]); // Clear old cities before loading new ones
      loadCities();
      onChange({ ...value, state: selectedState, city: '', pincode: '' });
    } else {
      setCities([]);
      onChange({ ...value, state: '', city: '', pincode: '' });
    }
  }, [selectedState]);

  // Reload pincodes when city changes
  useEffect(() => {
    if (selectedCity) {
      setPincodes([]); // Clear old pincodes before loading new ones
      loadPincodes();
    } else {
      setPincodes([]);
    }
    // Reset pincode when city changes
    if (selectedCity !== value.city) {
      onChange({ ...value, city: selectedCity, pincode: '' });
    }
  }, [selectedCity]);

  async function loadStates() {
    setLoading(true);
    try {
      const data = await getStates();
      setStates(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load states', err);
      setStates([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadCities() {
    setLoading(true);
    try {
      const data = await getCities(selectedState);
      const filtered = selectedState ? data.filter(c => String(c.stateId) === String(selectedState)) : data;
      setCities(Array.isArray(filtered) ? filtered : []);
    } catch (err) {
      console.error('Failed to load cities', err);
      setCities([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadPincodes() {
    setLoading(true);
    try {
      const data = await getPincodes(selectedCity);
      // Backend now filters by city, just map the values
      setPincodes(Array.isArray(data) ? data.map(p => p.value) : []);
    } catch (err) {
      console.error('Failed to load pincodes', err);
      setPincodes([]);
    } finally {
      setLoading(false);
    }
  }

  const handleStateChange = (e) => {
    onChange({ ...value, state: e.target.value, city: '', pincode: '' });
  };

  const handleCityChange = (e) => {
    onChange({ ...value, city: e.target.value, pincode: '' });
  };

  const handlePincodeChange = (e) => {
    onChange({ ...value, pincode: e.target.value });
  };

  return (
    <div className="location-selector flex gap-2">
      <select
        value={selectedState}
        onChange={handleStateChange}
        disabled={disabled || loading}
        className="border rounded p-2 flex-1">
        <option value="">-- Select State --</option>
        {states.map((s, idx) => {
          const key = typeof s === 'string' ? s : (s.id || idx);
          const label = typeof s === 'string' ? s : (s.name || s);
          return (
            <option key={key} value={key}>
              {label}
            </option>
          );
        })}
      </select>

      <select
        value={selectedCity}
        onChange={handleCityChange}
        disabled={disabled || !selectedState || loading}
        className="border rounded p-2 flex-1">
        <option value="">-- Select City --</option>
        {cities.map((c, idx) => {
          const key = typeof c === 'string' ? c : (c.id || idx);
          const label = typeof c === 'string' ? c : (c.name || c);
          return (
            <option key={key} value={key}>
              {label}
            </option>
          );
        })}
      </select>

      <select
        value={selectedPincode}
        onChange={handlePincodeChange}
        disabled={disabled || !selectedCity || loading}
        className="border rounded p-2 flex-1">
        <option value="">-- Select Pincode --</option>
        {pincodes.map((p, idx) => (
          <option key={p || idx} value={p}>
            {p}
          </option>
        ))}
      </select>

      {loading && <span className="text-sm text-gray-600 self-center">Loading...</span>}
    </div>
  );
}
