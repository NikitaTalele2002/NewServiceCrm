import React from 'react';

export default function InventoryTable({ filtered, selectedSku, onViewInvoices }) {
  // Helper functions to handle both old and new field names
  const getSku = (inv) => inv.sku || inv.Sku || '';
  const getSpareName = (inv) => inv.spareName || inv.SpareName || '';
  const getGoodQty = (inv) => inv.remainingQty || inv.GoodQty || 0;
  const getDefectiveQty = (inv) => inv.DefectiveQty || 0;
  const getId = (inv) => inv.Id || inv.id || inv.sku || inv.Sku || '';

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-100 border-b">
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">SKU</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Spare Name</th>
            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Good Qty</th>
            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Defective Qty</th>
            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Total</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(inv => {
            const sku = getSku(inv);
            const spareName = getSpareName(inv);
            const goodQty = getGoodQty(inv);
            const defectiveQty = getDefectiveQty(inv);
            const total = goodQty + defectiveQty;

            return (
              <tr key={getId(inv)} className={`border-b hover:bg-gray-50 transition ${selectedSku && String(sku).toLowerCase() === String(selectedSku).toLowerCase() ? 'bg-yellow-50' : ''}`}>
                <td className="px-6 py-4">
                  <button onClick={() => onViewInvoices(sku)} className="bg-gray-100 px-2 py-1 rounded text-sm font-mono text-blue-600 underline hover:text-blue-800">{sku}</button>
                </td>
                <td className="px-6 py-4 text-gray-900">{spareName}</td>
                <td className="px-6 py-4 text-right">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">{goodQty}</span>
                </td>
                <td className="px-6 py-4 text-right">{defectiveQty > 0 ? (<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">{defectiveQty}</span>) : (<span className="text-gray-400">0</span>)}</td>
                <td className="px-6 py-4 text-right font-semibold text-gray-900">{total}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="bg-gray-50 px-6 py-3 border-t">
        <div className="flex justify-between text-sm font-semibold text-gray-700">
          <span>Total in current view:</span>
          <span>Good: <span className="text-green-600">{filtered.reduce((s, i) => s + getGoodQty(i), 0)}</span>{' | '}Defective: <span className="text-orange-600">{filtered.reduce((s, i) => s + getDefectiveQty(i), 0)}</span></span>
        </div>
      </div>
    </div>
  );
}
