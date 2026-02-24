import React, { useEffect, useState } from 'react';
import { useRole } from '../../context/RoleContext';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button';

export default function CurrentInventory() {
  // All useState hooks must be at the top, before any useEffect or logic
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [plants, setPlants] = useState([]); // For RSM
  const [selectedPlant, setSelectedPlant] = useState("");
  const [debugInfo, setDebugInfo] = useState({});
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  // Use context for role and user
  const { user, role } = useRole();
  // Fetch assigned plants for RSM and auto-select if only one
  useEffect(() => {
    async function fetchPlants() {
      if (role === 'rsm') {
        setLoading(true);
        setError(null);
        setPlants([]);
        setSelectedPlant("");
        try {
          const token = localStorage.getItem('token');
          if (!token) {
            setError('No token found in localStorage. Please log in again.');
            setDebugInfo({ role, token: null, assignedPlantsResponse: null, user });
            setLoading(false);
            return;
          }
          const res = await fetch('/api/branch/assigned-plants', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          setDebugInfo({
            role,
            token: token ? token.substring(0, 20) + '...' : null,
            assignedPlantsResponse: data,
            user
          });
          if (data.ok) {
            setPlants(data.plants || []);
            if (data.plants && data.plants.length === 1) {
              setSelectedPlant(data.plants[0].plant_id);
            } else {
              setSelectedPlant("");
            }
          } else {
            setError(data.error || 'Failed to fetch assigned plants');
          }
        } catch (err) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      }
    }
    fetchPlants();
    // eslint-disable-next-line
  }, [role, user]);

  // Fetch inventory (for branch or RSM's selected plant)
  useEffect(() => {
    async function fetchInventory() {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        // Update the URL to match your backend route for branch/RSM inventory
        let url = 'http://localhost:5000/api/branch/current-inventory';
        let options = {
          headers: {
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          method: 'GET'
        };
        if (role === 'rsm' && selectedPlant) {
          url += `?branchId=${selectedPlant}`;
        }
        const res = await fetch(url, options);
        // If the response is not JSON, handle gracefully
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
      } finally {
        setLoading(false);
      }
    }
    if (role === 'rsm' ? !!selectedPlant : true) {
      fetchInventory();
    }
    // eslint-disable-next-line
  }, [role, user, selectedPlant]);

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;

  const totalGood = inventory.reduce((sum, i) => sum + (i.goodQty || 0), 0);
  const totalDefective = inventory.reduce((sum, i) => sum + (i.defectiveQty || 0), 0);
  const totalItems = inventory.length;

  // Search/filter state
  const filteredInventory = inventory.filter(item => {
    const searchLower = search.toLowerCase();
    return (
      item.sku?.toString().toLowerCase().includes(searchLower) ||
      item.spareName?.toLowerCase().includes(searchLower) ||
      item.productGroup?.toLowerCase().includes(searchLower) ||
      item.productName?.toLowerCase().includes(searchLower) ||
      item.modelName?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div style={{background: 'lime', color: 'black', padding: 32, fontWeight: 'bold', fontSize: 32, textAlign: 'center', border: '5px solid red', margin: 32}}>
        TEST COMPONENT: If you see this, your frontend is serving new code! {new Date().toLocaleString()}
      </div>
      {/* Always show debug info at the very top for all users */}
      <div className="mb-4 p-4 bg-yellow-100 border-2 border-yellow-400 text-base text-yellow-900 rounded">
        <div><b>Debug Info (always visible):</b></div>
        <div>role: {String(debugInfo.role)}</div>
        <div>token: {debugInfo.token}</div>
        <div>assignedPlantsResponse: <pre style={{whiteSpace:'pre-wrap'}}>{JSON.stringify(debugInfo.assignedPlantsResponse, null, 2)}</pre></div>
        <div>user: <pre style={{whiteSpace:'pre-wrap'}}>{JSON.stringify(debugInfo.user, null, 2)}</pre></div>
      </div>
      {role === 'rsm' && (
        <div className="mb-4">
          {plants.length === 0 && !loading && (
            <div className="text-red-500">No plants assigned to your RSM account.</div>
          )}
          {plants.length > 1 && (
            <>
              <label className="block mb-1 font-semibold text-gray-700">Select Plant/Branch:</label>
              <select
                className="p-2 border rounded w-full"
                value={selectedPlant}
                onChange={e => setSelectedPlant(e.target.value)}
                disabled={plants.length === 0}
              >
                {plants.map(p => (
                  <option key={p.plant_id} value={p.plant_id}>{p.plant_name || `Plant ${p.plant_id}`}</option>
                ))}
              </select>
            </>
          )}
          {plants.length === 1 && (
            <div className="text-green-700 font-semibold">Auto-selected plant: {plants[0].plant_name || plants[0].plant_id}</div>
          )}
        </div>
      )}
      <input
        type="text"
        placeholder="Search inventory by SKU, name, group, product, model..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="mb-4 w-full p-2 border rounded"
      />
      {filteredInventory.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="text-gray-500 mb-2">No inventory items found</div>
          <p className="text-xs text-gray-400">No inventory has been received for this branch yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-100 border-b">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">SKU</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Spare Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Product Group</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Product</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Model</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Good Qty</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Defective Qty</th>
              </tr>
            </thead>
            <tbody>
              {filteredInventory.map((item, idx) => (
                <tr key={item.sku || idx} className="border-b hover:bg-gray-50 transition">
                  <td className="px-4 py-2 text-blue-600 underline cursor-pointer">{item.sku}</td>
                  <td className="px-4 py-2 text-gray-900">{item.spareName}</td>
                  <td className="px-4 py-2 text-gray-700">{item.productGroup}</td>
                  <td className="px-4 py-2 text-gray-700">{item.productName}</td>
                  <td className="px-4 py-2 text-gray-700">{item.modelName}</td>
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
          <div className="bg-gray-50 px-6 py-3 border-t">
            <div className="flex justify-between text-sm font-semibold text-gray-700">
              <span>Total in current view:</span>
              <span>Good: <span className="text-green-600">{filteredInventory.reduce((sum, i) => sum + (i.goodQty || 0), 0)}</span>{' | '}Defective: <span className="text-orange-600">{filteredInventory.reduce((sum, i) => sum + (i.defectiveQty || 0), 0)}</span></span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
