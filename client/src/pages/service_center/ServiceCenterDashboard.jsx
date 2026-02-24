import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useServiceCenter } from '../../hooks/useServiceCenter';

export default function ServiceCenterDashboard() {
  const navigate = useNavigate();
  const {
    inventory,
    requests,
    loading,
    error,
    fetchServiceCenterInventory,
    fetchServiceCenterRequests,
    createBranchRequest
  } = useServiceCenter();

  const [tab, setTab] = useState('inventory');
  const [branchId, setBranchId] = useState(null);
  const [items, setItems] = useState([{ sku: '', spareName: '', qty: 1 }]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    // Get SC ID and Branch ID from token payload
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.branchId) {
          setBranchId(payload.branchId);
        }
      } catch (e) {
        console.error('Token parse error:', e);
      }
    }
    fetchServiceCenterInventory();
    fetchServiceCenterRequests();
  }, []);

  function updateItem(idx, field, val) {
    const updated = [...items];
    updated[idx][field] = val;
    setItems(updated);
  }

  function addItem() {
    setItems([...items, { sku: '', spareName: '', qty: 1 }]);
  }

  function removeItem(idx) {
    setItems(items.filter((_, i) => i !== idx));
  }

  async function submitRequest() {
    if (!branchId) {
      alert('Branch ID not found in your token. Contact admin.');
      return;
    }

    const validItems = items.filter(i => i.sku && i.spareName && i.qty > 0);
    if (validItems.length === 0) {
      alert('Add at least one item with SKU, name, and quantity.');
      return;
    }

    setCreating(true);
    try {
      const result = await createBranchRequest({
        branchId,
        items: validItems.map(i => ({
          sku: i.sku,
          spareName: i.spareName,
          qty: i.qty,
        })),
      });

      if (result.success) {
        alert('Request created successfully. Request #' + result.data.request.RequestNumber);
        setItems([{ sku: '', spareName: '', qty: 1 }]);
        await fetchServiceCenterRequests();
      } else {
        alert('Error: ' + (result.error || 'Failed to create request'));
      }
    } catch (err) {
      alert('Error: ' + (err.message || err));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Service Center Dashboard</h2>
        <button
          onClick={() => navigate('/service-center/inventory/current-inventory')}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-semibold"
        >View Full Inventory
        </button>
      </div>

      <div className="flex gap-4 mb-6 border-b">
        <button
          onClick={() => { setTab('inventory'); fetchServiceCenterInventory(); }}
          className={`px-4 py-2 font-semibold ${tab === 'inventory' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}>My Inventory
        </button>
        <button 
          onClick={() => { setTab('requests'); fetchServiceCenterRequests(); }}
          className={`px-4 py-2 font-semibold ${tab === 'requests' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}>My Requests
        </button>
        <button
          onClick={() => setTab('create')}
          className={`px-4 py-2 font-semibold ${tab === 'create' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}        >  Create Request
        </button>
      </div>

      {/* INVENTORY TAB */}
      {tab === 'inventory' && (
        <div>
          <h3 className="text-xl font-semibold mb-4">Inventory Received from Branch</h3>
          {loading && <div>Loading inventory...</div>}
          {!loading && inventory.length === 0 && <div className="text-gray-500">No inventory received yet.</div>}
          {!loading && inventory.length > 0 && (
            <table className="w-full border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 border text-left">SKU</th>
                  <th className="p-2 border text-left">Name</th>
                  <th className="p-2 border text-right">Good Qty</th>
                  <th className="p-2 border text-right">Defective Qty</th>
                  <th className="p-2 border text-left">Approved By</th>
                  <th className="p-2 border text-left">Approved At</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map(inv => (
                  <tr key={inv.Id}>
                    <td className="p-2 border">{inv.Sku}</td>
                    <td className="p-2 border">{inv.SpareName}</td>
                    <td className="p-2 border text-right font-semibold">{inv.GoodQty}</td>
                    <td className="p-2 border text-right">{inv.DefectiveQty}</td>
                    <td className="p-2 border">{inv.ReceivedFrom ? inv.ReceivedFrom.replace(/^Branch\s+/, '') : 'N/A'}</td>
                    <td className="p-2 border">{inv.ReceivedAt ? new Date(inv.ReceivedAt).toLocaleString() : 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* REQUESTS TAB */}
      {tab === 'requests' && (
        <div>
          <h3 className="text-xl font-semibold mb-4">My Spare Requests</h3>
          {loading && <div>Loading requests...</div>}
          {!loading && requests.length === 0 && <div className="text-gray-500">No requests yet.</div>}
          {!loading && requests.length > 0 && (
            <div className="space-y-4">
              {requests.map(req => (
                <div key={req.Id} className="border rounded p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-semibold text-lg">{req.RequestNumber}</div>
                      <div className="text-sm text-gray-500">Request ID: {req.Id}</div>
                    </div>
                    <div className={`px-3 py-1 rounded text-sm font-semibold ${
                      req.Status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      req.Status === 'approved' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {req.Status}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    Created: {new Date(req.CreatedAt).toLocaleString()}
                    {req.ApprovedAt && ` | Approved: ${new Date(req.ApprovedAt).toLocaleString()}`}
                  </div>
                  {req.ApprovedBy && <div className="text-sm text-gray-600">Approved by: {req.ApprovedBy}</div>}
                  <div className="mt-3">
                    <div className="font-semibold mb-2">Items:</div>
                    <table className="w-full border text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="p-2 border text-left">SKU</th>
                          <th className="p-2 border text-left">Name</th>
                          <th className="p-2 border text-right">Requested</th>
                          <th className="p-2 border text-right">Approved</th>
                        </tr>
                      </thead>
                      <tbody>
                        {req.Items && req.Items.map(item => (
                          <tr key={item.Id}>
                            <td className="p-2 border">{item.Sku}</td>
                            <td className="p-2 border">{item.SpareName}</td>
                            <td className="p-2 border text-right">{item.RequestedQty}</td>
                            <td className="p-2 border text-right font-semibold">{item.ApprovedQty || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CREATE REQUEST TAB */}
      {tab === 'create' && (
        <div>
          <h3 className="text-xl font-semibold mb-4">Create New Spare Request</h3>
          <div className="bg-blue-50 border border-blue-200 p-3 rounded mb-4 text-sm">
            <strong>Note:</strong> Your request will be sent to your assigned branch. Once approved by the branch, items will appear in your inventory.
          </div>

          <div className="space-y-3 mb-6">
            {items.map((item, idx) => (
              <div key={idx} className="flex gap-2 items-end border rounded p-3 bg-gray-50">
                <div className="flex-1">
                  <label className="block text-sm font-semibold mb-1">Spare Name</label>
                  <input
                    type="text"
                    value={item.spareName}
                    onChange={e => updateItem(idx, 'spareName', e.target.value)}
                    placeholder="e.g., AC Motor"
                    className="w-full border rounded p-2"/>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-semibold mb-1">Part Code</label>
                  <input
                    type="text"
                    value={item.sku}
                    onChange={e => updateItem(idx, 'sku', e.target.value)}
                    placeholder="e.g., MOTOR-001"
                    className="w-full border rounded p-2"/>
                </div>
                <div className="w-20">
                  <label className="block text-sm font-semibold mb-1">Qty</label>
                  <input
                    type="number"
                    value={item.qty}
                    onChange={e => updateItem(idx, 'qty', Number(e.target.value))}
                    min="1"
                    className="w-full border rounded p-2"/>
                </div>
                <button
                  onClick={() => removeItem(idx)}
                  className="px-2 py-2 bg-red-500 text-black rounded hover:bg-red-600">
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2 mb-6">
            <button
              onClick={addItem}
              className="px-4 py-2 bg-gray-500 text-black rounded hover:bg-gray-600">+ Add Item
            </button>
          </div>

          <button
            onClick={submitRequest}
            disabled={creating}
            className="px-6 py-2 bg-blue-600 text-black rounded hover:bg-blue-700 disabled:bg-gray-400">
            {creating ? 'Creating...' : 'Create Request'}
          </button>
        </div>
      )}
    </div>
  );
}
