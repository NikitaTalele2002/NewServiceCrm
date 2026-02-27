import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../../../config/apiConfig';

const CurrentInventory = () => {
  const [filters, setFilters] = useState({
    productGroup: '',
    productType: '',
    model: ''
  });

  const [productGroups, setProductGroups] = useState([]);
  const [products, setProducts] = useState([]);
  const [models, setModels] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getToken = () => localStorage.getItem('token');

  const getCenterId = () => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.centerId;
    } catch (e) {
      console.error('Error decoding token:', e);
      return null;
    }
  };

  const centerId = getCenterId();

  const fetchProductGroups = async () => {
    if (!centerId) return;
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      const response = await fetch(getApiUrl(`/returns/service-centers/${centerId}/inventory/groups`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch product groups');
      const data = await response.json();
      setProductGroups(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching product groups:', err);
      setError(`Failed to load product groups: ${err.message}`);
      setProductGroups([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async (groupId) => {
    if (!groupId || !centerId) {
      setProducts([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      const response = await fetch(getApiUrl(`/returns/service-centers/${centerId}/inventory/products?group=${encodeURIComponent(groupId)}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch products');
      const data = await response.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError(`Failed to load products: ${err.message}`);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchModels = async (productId) => {
    if (!productId || !centerId) {
      setModels([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      const response = await fetch(getApiUrl(`/returns/service-centers/${centerId}/inventory/models?product=${encodeURIComponent(productId)}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch models');
      const data = await response.json();
      setModels(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching models:', err);
      setError(`Failed to load models: ${err.message}`);
      setModels([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchInventory = async () => {
    if (!centerId) return;
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      const params = new URLSearchParams();
      if (filters.productGroup) params.append('group', filters.productGroup);
      if (filters.productType) params.append('product', filters.productType);
      if (filters.model) params.append('model', filters.model);

      const response = await fetch(getApiUrl(`/returns/service-centers/${centerId}/inventory?${params}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch inventory');
      const data = await response.json();
      setInventory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching inventory:', err);
      setError(`Failed to load inventory: ${err.message}`);
      setInventory([]);
    } finally {
      setLoading(false);
    }
  };

  // Load product groups on mount
  useEffect(() => {
    fetchProductGroups();
  }, []);

  // Fetch products when group is selected
  useEffect(() => {
    if (filters.productGroup) {
      fetchProducts(filters.productGroup);
    }
  }, [filters.productGroup]);

  // Fetch models when product is selected
  useEffect(() => {
    if (filters.productType) {
      fetchModels(filters.productType);
    }
  }, [filters.productType]);

  const handleFilterChange = (name, value) => {
    console.log(`Filter ${name} changed to:`, value);
    if (name === 'productGroup') {
      setFilters({
        productGroup: value,
        productType: '',
        model: ''
      });
    } else if (name === 'productType') {
      setFilters(prev => ({
        ...prev,
        productType: value,
        model: ''
      }));
    } else {
      setFilters(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSearch = () => {
    console.log('Search with filters:', filters);
    fetchInventory();
  };

  // Format options for dropdowns
  const formatOptions = (items) => {
    if (!Array.isArray(items) || items.length === 0) return [];

    return items
      .map(item => {
        // common shapes from returns endpoints
        if (item.groupCode || item.groupName) return { id: item.groupCode || item.groupName, label: item.groupName || item.groupCode };
        if (item.productName) return { id: item.productName, label: item.productName };
        if (item.modelName) return { id: item.modelName, label: item.modelName };

        // fallback formats
        const id = item.ID || item.Id || item.id || item.VALUE || item.Value || item.Sku || item.sku || item.SKU;
        const label = item.DESCRIPTION || item.Description || item.VALUE || item.Value || item.spareName || item.spareName || item.productName || String(item);
        return { id, label };
      })
      .filter(opt => opt.id !== undefined && opt.id !== null && String(opt.id) !== ''); // keep only valid ids
  };

  const options = {
    productGroups: formatOptions(productGroups),
    products: formatOptions(products),
    models: formatOptions(models)
  };

  console.log('Current options:', options);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Current Inventory</h1>
        <p className="text-gray-600">View current inventory levels by product filters</p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filter Inventory</h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          {/* Product Group Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product Group
            </label>
            <select
              value={filters.productGroup}
              onChange={(e) => handleFilterChange('productGroup', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="">Select product group</option>
              {options.productGroups.length > 0 ? (
                options.productGroups.map(opt => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))
              ) : (
                <option disabled>No groups available</option>
              )}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {options.productGroups.length} groups available
            </p>
          </div>

          {/* Product Type Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product Type
            </label>
            <select
              value={filters.productType}
              onChange={(e) => handleFilterChange('productType', e.target.value)}
              disabled={!filters.productGroup}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                !filters.productGroup ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}>
              <option value="">Select product</option>
              {options.products.length > 0 ? (
                options.products.map(opt => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))
              ) : (
                <option disabled>{filters.productGroup ? 'No products available' : 'Select a group first'}</option>
              )}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {options.products.length} products available
            </p>
          </div>

          {/* Model Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Model
            </label>
            <select
              value={filters.model}
              onChange={(e) => handleFilterChange('model', e.target.value)}
              disabled={!filters.productType}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                !filters.productType ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}>
              <option value="">Select model</option>
              {options.models.length > 0 ? (
                options.models.map(opt => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))
              ) : (
                <option disabled>{filters.productType ? 'No models available' : 'Select a product first'}</option>
              )}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {options.models.length} models available
            </p>
          </div>

          {/* Search Button */}
          <div className="flex items-end">
            <button
              onClick={handleSearch}
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors">
              {loading ? 'Loading...' : 'Search Inventory'}
            </button>
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      {inventory.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6 mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Inventory Results ({inventory.length} items)
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border border-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border border-gray-200 p-2 text-left">Part Code</th>
                  <th className="border border-gray-200 p-2 text-left">Description</th>
                  <th className="border border-gray-200 p-2 text-left">Quantity</th>
                  <th className="border border-gray-200 p-2 text-left">Location</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="border border-gray-200 p-2">
                      {item.sku || item.Sku || item.SKU || '-'}
                    </td>
                    <td className="border border-gray-200 p-2">
                      {item.spareName || item.spare_name || item.DESCRIPTION || item.name || '-'}
                    </td>
                    <td className="border border-gray-200 p-2">
                      {item.remainingQty || item.remaining_qty || item.quantity || item.QTY || item.Quantity || '-'}
                    </td>
                    <td className="border border-gray-200 p-2">
                      {item.location || item.Location || item.LOCATION || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {inventory.length === 0 && !loading && !error && (
        <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500 mt-6">
          <p>No inventory data loaded. Click "Search Inventory" to fetch results.</p>
        </div>
      )}

      {loading && (
        <div className="flex justify-center items-center mt-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-600">Loading...</span>
        </div>
      )}
    </div>
  );
};

export default CurrentInventory;


