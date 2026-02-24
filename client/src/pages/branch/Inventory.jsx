
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button';
import { useBranch } from '../../hooks/useBranch';

export default function BranchInventory() {
  const { branchInventory, loading, error, getBranchInventory } = useBranch();
  const navigate = useNavigate();

  useEffect(() => {
    getBranchInventory();
  }, []);

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;

  const inv = branchInventory?.inventory || [];

  // Normalization helpers (match service center design)
  const getSku = (item) => item.sku || item.Sku || item.SKU || item.spare_id || '';
  const getSpareName = (item) => item.spareName || item.SpareName || item.name || item.SparePart || '';
  const getGoodQty = (item) => item.goodQty ?? item.GoodQty ?? item.qty_good ?? 0;
  const getDefectiveQty = (item) => item.defectiveQty ?? item.DefectiveQty ?? item.qty_defective ?? 0;
  const getMinStock = (item) => item.minStock ?? item.MinimumStockLevel ?? item.MinStock ?? '';
  const getId = (item, idx) => item.Id ?? item.id ?? getSku(item) ?? idx;

  // Totals
  const totalGood = inv.reduce((sum, i) => sum + getGoodQty(i), 0);
  const totalDefective = inv.reduce((sum, i) => sum + getDefectiveQty(i), 0);
  const totalItems = inv.length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Branch Inventory</h1>
          <Button 
            onClick={() => navigate('/branch/stock-adjust')}
            variant="primary"
          >
            Stock Adjust
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
          <div className="text-sm text-gray-500 font-medium">Total Items</div>
          <div className="text-3xl font-bold text-blue-600 mt-2">{totalItems}</div>
          <div className="text-xs text-gray-400 mt-2">SKU types</div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="max-w-7xl mx-auto px-6">
        {loading && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-gray-500">Loading inventory...</div>
          </div>
        )}
        {!loading && inv.length === 0 && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-gray-500 mb-2">No inventory items found</div>
            <p className="text-xs text-gray-400">No inventory has been received for this branch yet.</p>
          </div>
        )}
        {!loading && inv.length > 0 && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-100 border-b">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">SKU</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Spare Name</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Good Qty</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Defective Qty</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Min Stock</th>
                </tr>
              </thead>
              <tbody>
                {inv.map((item, idx) => {
                  const sku = getSku(item);
                  const spareName = getSpareName(item);
                  const goodQty = getGoodQty(item);
                  const defectiveQty = getDefectiveQty(item);
                  const minStock = getMinStock(item);
                  const key = getId(item, idx);
                  return (
                    <tr key={key} className="border-b hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-blue-600 underline cursor-pointer" onClick={() => navigate('/service-center/inventory/current-inventory', { state: { sku } })}>{sku}</td>
                      <td className="px-6 py-4 text-gray-900">{spareName}</td>
                      <td className="px-6 py-4 text-right">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">{goodQty}</span>
                      </td>
                      <td className="px-6 py-4 text-right">{defectiveQty > 0 ? (<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">{defectiveQty}</span>) : (<span className="text-gray-400">0</span>)}</td>
                      <td className="px-6 py-4 text-right font-semibold text-gray-900">{minStock}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="bg-gray-50 px-6 py-3 border-t">
              <div className="flex justify-between text-sm font-semibold text-gray-700">
                <span>Total in current view:</span>
                <span>Good: <span className="text-green-600">{totalGood}</span>{' | '}Defective: <span className="text-orange-600">{totalDefective}</span></span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

