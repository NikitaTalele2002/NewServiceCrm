import React, { useEffect, useState } from 'react';
import { useRole } from '../../context/RoleContext';
// import { sequelize } from '../../database';

export default function RsmCurrentInventory() {
  const [plants, setPlants] = useState([]);
  const [selectedPlant, setSelectedPlant] = useState('');
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user, role } = useRole();

  // Fetch assigned plants for RSM
  useEffect(() => {
    async function fetchPlants() {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('http://localhost:5000/api/branch/assigned-plants', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.ok && data.plants) {
          setPlants(data.plants);
          // Do NOT auto-select plant, require user selection
          setSelectedPlant('');
        } else {
          setError(data.error || 'Failed to fetch assigned plants');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    if (role === 'rsm') fetchPlants();
  }, [role, user]);

  // Fetch inventory for selected plant
  useEffect(() => {
    let abortController = new AbortController();
    async function fetchInventory() {
      if (!selectedPlant) {
        setInventory([]);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        // Use plant_id directly for RSM inventory fetch
        let url = `http://localhost:5000/api/branch/current-inventory?plant_id=${selectedPlant}`;
        // Timeout logic
        const timeout = setTimeout(() => {
          abortController.abort();
        }, 15000);
        let res;
        try {
          res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` },
            method: 'GET',
            signal: abortController.signal
          });
        } catch (fetchErr) {
          if (fetchErr.name === 'AbortError') {
            setError('Request timed out. Backend may be slow or unreachable.');
            setInventory([]);
            setLoading(false);
            clearTimeout(timeout);
            return;
          } else {
            throw fetchErr;
          }
        }
        clearTimeout(timeout);
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          setError('Server returned non-JSON response.');
          setInventory([]);
          setLoading(false);
          return;
        }
        const data = await res.json();
        if (res.status === 403) {
          setError(data.error || 'Not authorized for this branch');
          setInventory([]);
        } else if (data.ok) {
          setInventory(data.inventory);
          setError(null);
        } else {
          setError(data.error || 'Failed to fetch inventory');
          setInventory([]);
        }
      } catch (err) {
        setError(err.message);
        setInventory([]);
      } finally {
        setLoading(false);
      }
    }
    // Only fetch inventory after user selects plant
    if (role === 'rsm' && selectedPlant) fetchInventory();
    return () => abortController.abort();
  }, [role, user, selectedPlant]);

  return (
    <div className="min-h-screen bg-gray-50">
      <h2 className="text-xl font-bold mb-4">RSM Current Inventory</h2>
      {loading && <div className="p-6">Loading...</div>}
      {error && <div className="p-6 text-red-600">Error: {error}</div>}
      {plants.length > 0 && (
        <div className="mb-4">
          <label className="block mb-1 font-semibold text-gray-700">Select Plant/Branch:</label>
          <select
            className="p-2 border rounded w-full"
            value={selectedPlant}
            onChange={e => setSelectedPlant(e.target.value)}
            disabled={plants.length === 0}
          >
            <option value="">-- Select Plant --</option>
            {plants.map(p => (
              <option key={p.plant_id} value={p.plant_id}>{p.plant_name || `Plant ${p.plant_id}`}</option>
            ))}
          </select>
        </div>
      )}
      {!loading && !error && inventory.length === 0 && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="text-gray-500 mb-2">No inventory items found</div>
          <p className="text-xs text-gray-400">No inventory has been received for this branch yet.</p>
        </div>
      )}
      {!loading && !error && inventory.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-100 border-b">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">SKU</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">PART</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Good Qty</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Defective Qty</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((item, idx) => (
                <tr key={item.sku || idx} className="border-b hover:bg-gray-50 transition">
                  <td className="px-4 py-2 text-blue-600 underline cursor-pointer">{item.sku}</td>
                  <td className="px-4 py-2 text-gray-900">{item.PART}</td>
                  <td className="px-4 py-2 text-right">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">{item.goodQty}</span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    {item.defectiveQty > 0 ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">{item.defectiveQty}</span>
                    ) : (
                      <span className="text-gray-400">0</span>)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
