import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../../../config/apiConfig';

/**
 * TechnicianInventory Page
 * Allows ASC to view current inventory levels of technicians
 * Shows good qty, defective qty, and last updated timestamp for each spare part
 */
const TechnicianInventory = () => {
  const [technicians, setTechnicians] = useState([]);
  const [selectedTechnician, setSelectedTechnician] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Get token from localStorage
  const getToken = () => {
    let token = localStorage.getItem('token');
    if (!token) {
      // Fallback test token for development
      token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJTQ1VzZXIiLCJjZW50ZXJJZCI6NCwicm9sZSI6InNlcnZpY2VfY2VudGVyIiwiaWF0IjoxNzcxMjM1NjU2fQ.oxbba2nqMYdAjWQmJK95SFbKzOf8a6l9AkEdFGFAx5s';
      console.warn('⚠️ Using test token for development');
    }
    return token;
  };

  // Fetch technicians for the service center
  useEffect(() => {
    const fetchTechnicians = async () => {
      setLoading(true);
      setError('');
      try {
        const token = getToken();
        const response = await fetch(getApiUrl(`/technicians/by-centre?centerId=${centerId}`), {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch technicians');
        }

        const data = await response.json();
        console.log('✅ Technicians fetched:', data.technicians);
        setTechnicians(data.technicians || []);
      } catch (err) {
        console.error('❌ Error fetching technicians:', err);
        setError(err.message || 'Failed to fetch technicians');
      } finally {
        setLoading(false);
      }
    };

    fetchTechnicians();
  }, []);

  // Fetch inventory for selected technician
  const handleSelectTechnician = async (technician) => {
    setSelectedTechnician(technician);
    setLoading(true);
    setError('');
    setInventory([]);

    try {
      const token = getToken();
      const response = await fetch(
        getApiUrl(`/spare-requests/technicians/${technician.technician_id}/inventory`),
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch inventory');
      }

      const data = await response.json();
      console.log('✅ Inventory fetched:', data.data);
      setInventory(data.data || []);

      if (!data.data || data.data.length === 0) {
        setError('No inventory items found for this technician');
      }
    } catch (err) {
      console.error('❌ Error fetching inventory:', err);
      setError(err.message || 'Failed to fetch inventory');
      setInventory([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter inventory based on search term
  const filteredInventory = inventory.filter(item =>
    item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.spareName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Technician Inventory Management</h1>
        <p className="text-gray-600">View current inventory levels of technicians in your service center</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Technician Selection Panel */}
        <div className="lg:col-span-1 bg-white shadow rounded-lg p-4">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Select Technician</h2>

          {loading && !selectedTechnician && (
            <div className="text-center py-8 text-blue-600">
              ⏳ Loading technicians...
            </div>
          )}

          {error && !selectedTechnician && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded mb-4 text-sm">
              {error}
            </div>
          )}

          {technicians.length === 0 && !loading && (
            <div className="text-center py-8 text-gray-500 text-sm">
              No technicians found
            </div>
          )}

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {technicians.map((tech) => (
              <button
                key={tech.technician_id}
                onClick={() => handleSelectTechnician(tech)}
                className={`w-full p-3 text-left rounded transition border-2 ${
                  selectedTechnician?.technician_id === tech.technician_id
                    ? 'border-blue-500 bg-blue-50 text-blue-900 font-semibold'
                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="font-medium">{tech.name}</div>
                <div className="text-xs text-gray-500 mt-1">{tech.phone_number || 'N/A'}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Inventory Display Panel */}
        <div className="lg:col-span-2">
          {!selectedTechnician ? (
            <div className="bg-white shadow rounded-lg p-8 text-center">
              <div className="text-gray-500 text-lg">
                <p>📋 Please select a technician to view their inventory</p>
              </div>
            </div>
          ) : (
            <>
              {/* Technician Header */}
              <div className="bg-white shadow rounded-lg p-4 mb-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">{selectedTechnician.name}</h2>
                    <div className="text-sm text-gray-600 mt-1">
                      <p>ID: {selectedTechnician.technician_id}</p>
                      {selectedTechnician.phone_number && <p>Phone: {selectedTechnician.phone_number}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-blue-600">{inventory.length}</p>
                    <p className="text-sm text-gray-600">Spare Parts</p>
                  </div>
                </div>
              </div>

              {/* Search and Filter */}
              {inventory.length > 0 && (
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="Search by SKU or part name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Loading State */}
              {loading && (
                <div className="bg-white shadow rounded-lg p-8 text-center">
                  <p className="text-blue-600">⏳ Loading inventory...</p>
                </div>
              )}

              {/* Error State */}
              {error && !loading && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  <strong>Error:</strong> {error}
                </div>
              )}

              {/* Inventory Table */}
              {!loading && inventory.length === 0 && !error && (
                <div className="bg-white shadow rounded-lg p-8 text-center">
                  <p className="text-gray-500">No inventory items found for this technician</p>
                </div>
              )}

              {!loading && filteredInventory.length > 0 && (
                <div className="bg-white shadow rounded-lg overflow-hidden">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100 border-b border-gray-300">
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">SKU / Part Code</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Part Description</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Good Qty</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Defective Qty</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Total Qty</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Last Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInventory.map((item, index) => (
                        <tr
                          key={`${item.id}-${index}`}
                          className="border-b border-gray-200 hover:bg-gray-50 transition"
                        >
                          <td className="px-4 py-3 text-sm font-mono text-gray-900">
                            {item.sku}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {item.spareName}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-block px-2 py-1 rounded bg-green-100 text-green-800 font-semibold text-sm">
                              {item.goodQty}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-block px-2 py-1 rounded bg-red-100 text-red-800 font-semibold text-sm">
                              {item.defectiveQty}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-block px-2 py-1 rounded bg-blue-100 text-blue-800 font-semibold text-sm">
                              {item.totalQty}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {new Date(item.lastUpdated).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Summary Footer */}
                  <div className="bg-gray-50 px-4 py-3 border-t border-gray-300 flex justify-between items-center">
                    <p className="text-sm text-gray-600">
                      Showing <strong>{filteredInventory.length}</strong> of <strong>{inventory.length}</strong> items
                    </p>
                    {searchTerm && filteredInventory.length !== inventory.length && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        Clear search
                      </button>
                    )}
                  </div>
                </div>
              )}

              {!loading && searchTerm && filteredInventory.length === 0 && inventory.length > 0 && (
                <div className="bg-white shadow rounded-lg p-8 text-center">
                  <p className="text-gray-500">No items match your search</p>
                  <button
                    onClick={() => setSearchTerm('')}
                    className="mt-2 text-blue-600 hover:underline text-sm"
                  >
                    Clear search
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TechnicianInventory;
