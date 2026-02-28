import React, { useState, useEffect } from 'react';

const TechnicianInventoryView = () => {
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTech, setSelectedTech] = useState(null);
  const [expandedTechs, setExpandedTechs] = useState({});

  useEffect(() => {
    fetchTechnicianInventory();
  }, []);

  const fetchTechnicianInventory = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/technician-sc-spare-requests/service-center/inventory`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('📦 Technician inventory data:', data);
      console.log('📊 First technician:', data.technicians?.[0]);
      console.log('📋 First item:', data.technicians?.[0]?.inventory?.[0]);

      if (data.success) {
        setTechnicians(data.technicians);
      } else {
        setError('Failed to load technician inventory');
      }
    } catch (err) {
      console.error('❌ Error fetching technician inventory:', err);
      setError(err.message || 'Failed to fetch technician inventory');
    } finally {
      setLoading(false);
    }
  };

  const toggleTechnician = (techId) => {
    setExpandedTechs((prev) => ({
      ...prev,
      [techId]: !prev[techId]
    }));
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      // Check if date is valid
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleDateString('en-IN', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch (e) {
      console.error('Date formatting error:', e, dateString);
      return 'N/A';
    }
  };

  const getSafeValue = (value, fallback = '-') => {
    if (value === null || value === undefined || value === '') return fallback;
    return value;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="ml-4 text-gray-600">Loading technician inventory...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Technician Inventory</h1>
          <p className="text-gray-600 mt-2">View and manage spare parts allocated to technicians</p>
          <button
            onClick={fetchTechnicianInventory}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-black bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            🔄 Refresh
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">⚠️ {error}</p>
          </div>
        )}

        {/* Technician Cards */}
        {technicians.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500 text-lg">No technicians found or no inventory allocated</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {technicians.map((tech) => (
              <div key={tech.technician_id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
                {/* Technician Header */}
                <div
                  onClick={() => toggleTechnician(tech.technician_id)}
                  className="p-6 cursor-pointer border-b border-gray-200 hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900">{tech.technicianName}</h3>
                      <div className="mt-2 flex gap-4 text-sm text-gray-600">
                        <span>📧 {tech.technicianEmail}</span>
                        <span>📱 {tech.technicianPhone}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-3xl font-bold text-blue-600">{tech.inventory.length}</div>
                        <div className="text-sm text-gray-600">Items</div>
                      </div>
                      <div className={`transform transition-transform ${expandedTechs[tech.technician_id] ? 'rotate-180' : ''}`}>
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Inventory Items */}
                {expandedTechs[tech.technician_id] && (
                  <div className="overflow-x-auto">
                    {tech.inventory.length === 0 ? (
                      <div className="p-6 text-center text-gray-500">
                        No spare parts allocated to this technician yet
                      </div>
                    ) : (
                      <table className="w-full">
                        <thead className="bg-gray-50 border-t border-gray-200">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">SKU</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Part Name</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Good Qty</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Defective Qty</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Total</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Last Updated</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {tech.inventory.map((item, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="font-mono text-sm font-semibold text-gray-900">
                                  {getSafeValue(item.partCode)}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-sm text-gray-600">
                                  {getSafeValue(item.partDescription)}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                                  {getSafeValue(item.qtyGood, 0)}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                                  {getSafeValue(item.qtyDefective, 0)}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <span className="text-sm font-semibold text-gray-900">
                                  {getSafeValue(item.totalQty, 0)}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                {formatDate(item.updated_at || item.created_at)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TechnicianInventoryView;
