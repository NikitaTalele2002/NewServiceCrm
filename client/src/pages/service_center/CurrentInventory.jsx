import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useInventory } from '../../hooks/useInventory';
import InventoryFilters from './components/InventoryFilters';
import InventoryTable from './components/InventoryTable';
import InvoiceModal from './components/InvoiceModal';

export default function CurrentInventory() {
  const {
    productGroups,
    products,
    models,
    spares,
    inventory: hookInventory,
    loading: hookLoading,
    error,
    getProductGroups,
    getProductsByGroup,
    getSparesByGroup,
    getModelsByProduct,
    getSparesByProduct,
    getSparesByModel,
    getServiceInventory,
    getInventoryBySku
  } = useInventory();
  const navigate = useNavigate();
  const inventory = hookInventory;
  const loading = hookLoading;
  const [filter, setFilter] = useState('all'); // all, good, defective
  const [sortBy, setSortBy] = useState('sku'); // sku, name, qty
  const location = useLocation();
  const [selectedSku, setSelectedSku] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceData, setInvoiceData] = useState([]);
  

  // New states for cascading search
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedSpare, setSelectedSpare] = useState('');
  const [hasNoSpares, setHasNoSpares] = useState(false);
  const [filteredInventoryBySelection, setFilteredInventoryBySelection] = useState([]);

  useEffect(() => {
    getServiceInventory();
    getProductGroups();
  }, []);

  // When product groups are loaded, update the groups state
  useEffect(() => {
    console.log('Product groups from hook:', productGroups);
    if (Array.isArray(productGroups)) {
      setGroups(productGroups);
    }
  }, [productGroups]);

  // When products are updated from hook, log them
  useEffect(() => {
    console.log('Products from hook after group selection:', products);
  }, [products]);

  // When models are updated from hook, log them
  useEffect(() => {
    console.log('Models from hook after product selection:', models);
  }, [models]);

  useEffect(() => {
    if (!selectedGroup) {
      setHasNoSpares(false);
      getProductsByGroup(null);
      setSelectedProduct('');
      setSelectedModel('');
      setFilteredInventoryBySelection([]);
      return;
    }

    (async () => {
      try {
        setHasNoSpares(false);
        await getProductsByGroup(selectedGroup);
        // When group is selected, filter inventory client-side or via dedicated endpoint
        // For now, just clear model/product selections and show all inventory
        setSelectedProduct('');
        setSelectedModel('');
        setFilteredInventoryBySelection([]);
      } catch (err) {
        console.error('Error loading group products:', err);
        setHasNoSpares(true);
        setFilteredInventoryBySelection([]);
      }
    })();
  }, [selectedGroup]);

  useEffect(() => {
    if (!selectedProduct) {
      getModelsByProduct(null);
      setSelectedModel('');
      setFilteredInventoryBySelection([]);
      return;
    }

    (async () => {
      try {
        setHasNoSpares(false);
        await getModelsByProduct(selectedProduct);
        setSelectedModel('');
        setFilteredInventoryBySelection([]);
      } catch (err) {
        console.error('Error loading product models:', err);
        setHasNoSpares(true);
        setFilteredInventoryBySelection([]);
      }
    })();
  }, [selectedProduct]);

  useEffect(() => {
    if (!selectedModel) return;
    (async () => {
      try {
        setHasNoSpares(false);
        
        // Fetch inventory filtered by model ID
        const token = localStorage.getItem('token');
        if (!token) {
          setHasNoSpares(true);
          setFilteredInventoryBySelection([]);
          return;
        }

        const res = await fetch(
          `/api/inventory/current?modelId=${encodeURIComponent(selectedModel)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) {
          const data = await res.json();
          const inv = Array.isArray(data) ? data : [];
          setFilteredInventoryBySelection(inv);
          setHasNoSpares(inv.length === 0);
        }
      } catch (err) {
        console.error('Error loading model inventory:', err);
        setHasNoSpares(true);
        setFilteredInventoryBySelection([]);
      }
    })();
  }, [selectedModel]);

  // inventory and product groups are provided by the hook (getServiceCenterInventory / getProductGroups)

  const handleViewInvoices = async (sku) => {
    try {
      const res = await getInventoryBySku(sku);
      if (res && res.success === false) {
        throw new Error(res.error || 'Failed to load invoices');
      }
      // some APIs return the data directly
      const data = res && res.data ? res.data : res;
      setInvoiceData(data);
      setShowInvoiceModal(true);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      alert('Failed to fetch invoice data.');
    }
  };

  // Filter logic - First remove items with zero quantities
  let filtered = inventory.filter(i => i.GoodQty > 0 || i.DefectiveQty > 0);
  if (filter === 'good') {
    filtered = filtered.filter(i => i.GoodQty > 0);
  } else if (filter === 'defective') {
    filtered = filtered.filter(i => i.DefectiveQty > 0);
  }

  // If group/product/model selected, use filtered inventory from API, otherwise use all inventory
  if (selectedGroup || selectedProduct || selectedModel) {
    // Prefer server-filtered results, but fall back to client inventory if server returns empty
    if (Array.isArray(filteredInventoryBySelection) && filteredInventoryBySelection.length > 0) {
      filtered = filteredInventoryBySelection;
    } else {
      // Fallback: use client-side inventory when server filtered data isn't available
      filtered = inventory;
    }

    if (filter === 'good') {
      filtered = filtered.filter(i => (i.remainingQty || i.GoodQty || 0) > 0);
    } else if (filter === 'defective') {
      filtered = filtered.filter(i => (i.DefectiveQty || 0) > 0);
    }
  }

  // If a specific SKU was requested, further filter to that SKU
  if (selectedSku) {
    filtered = filtered.filter(i => String(i.sku || i.Sku).toLowerCase() === String(selectedSku).toLowerCase());
  }

  // Sort logic
  if (sortBy === 'sku') {
    filtered = [...filtered].sort((a, b) => (a.sku || a.Sku || '').localeCompare(b.sku || b.Sku || ''));
  } else if (sortBy === 'name') {
    filtered = [...filtered].sort((a, b) => (a.spareName || a.SpareName || '').localeCompare(b.spareName || b.SpareName || ''));
  } else if (sortBy === 'qty') {
    filtered = [...filtered].sort((a, b) => (b.remainingQty || b.GoodQty || 0) - (a.remainingQty || a.GoodQty || 0));
  }

  // Calculate totals
  const totalGood = inventory.reduce((sum, i) => sum + i.GoodQty, 0);
  const totalDefective = inventory.reduce((sum, i) => sum + i.DefectiveQty, 0);
  const totalItems = inventory.length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <button
            onClick={() => navigate('/service-center')}
            className="text-blue-600 hover:text-blue-800 mb-3 text-sm font-semibold">
            ← Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Current Inventory</h1>
          <p className="text-gray-600 mt-1">View all spare parts assigned to this service center</p>
        </div>
      </div>

      {/* Loading / Error banner */}
      {loading && (
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 text-sm text-blue-800">Loading inventory...</div>
        </div>
      )}
      {error && (
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="bg-red-50 border-l-4 border-red-400 p-4 text-sm text-red-800">Error loading inventory: {error}</div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {/* <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500 font-medium">Total Items</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">{totalItems}</div>
            <div className="text-xs text-gray-400 mt-2">SKU types</div>
          </div> */}
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
            <div className="text-sm text-gray-500 font-medium">Good Quantity</div>
            <div className="text-3xl font-bold text-green-600 mt-2">{totalGood}</div>
            <div className="text-xs text-gray-400 mt-2">Ready to use</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
            <div className="text-sm text-gray-500 font-medium">Defective Qty</div>
            <div className="text-3xl font-bold text-orange-600 mt-2">{totalDefective}</div>
            <div className="text-xs text-gray-400 mt-2">Needs return</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500 font-medium">Total Qty</div>
            <div className="text-3xl font-bold text-blue-600 mt-2">{totalGood + totalDefective}</div>
            <div className="text-xs text-gray-400 mt-2">All inventory</div>
          </div>
        </div>

        {/* Controls */}
        <InventoryFilters
          groups={groups}
          selectedGroup={selectedGroup}
          setSelectedGroup={setSelectedGroup}
          products={products}
          selectedProduct={selectedProduct}
          setSelectedProduct={setSelectedProduct}
          models={models}
          selectedModel={selectedModel}
          setSelectedModel={setSelectedModel}
          filter={filter}
          setFilter={setFilter}
          sortBy={sortBy}
          setSortBy={setSortBy}
          resultsCount={filtered.length}
          totalCount={inventory.length}/>

        {/* Inventory Table */}
        {loading && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-gray-500">Loading inventory...</div>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          {inventory.length > 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <div className="text-gray-500 mb-2">No items match your filter.</div>
              <button
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                onClick={() => {
                  setFilter('all');
                  setSelectedGroup('');
                  setSelectedProduct('');
                  setSelectedModel('');
                  setSelectedSku(null);
                }}>
                Show All Assigned Spare Parts
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <div className="text-gray-500 mb-2">No inventory items found</div>
              <p className="text-xs text-gray-400">No spare parts have been assigned to this service center yet.</p>
            </div>
          )}
        )}

        {!loading && filtered.length > 0 && (
          <InventoryTable filtered={filtered} selectedSku={selectedSku} onViewInvoices={handleViewInvoices} />
        )}
      </div>

      <InvoiceModal open={showInvoiceModal} data={invoiceData} onClose={() => setShowInvoiceModal(false)} />
    </div>
  );
}
