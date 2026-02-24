import React, { useEffect, useState } from 'react';
import { useBranch } from '../../hooks/useBranch';

export default function BranchDashboard() {
  const { dashboard, loading, error, getDashboard } = useBranch();

  useEffect(() => {
    getDashboard();
  }, []);

  if (loading) return <div className="p-6">Loading dashboard...</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;

  const data = dashboard;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Branch Dashboard</h2>
      {!data && <div>No data</div>}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border rounded">
            <div className="text-sm text-gray-500">Pending Requests</div>
            <div className="text-3xl font-bold">{data.kpis?.pendingRequests ?? 0}</div>
          </div>
          <div className="p-4 border rounded">
            <div className="text-sm text-gray-500">Low Stock Items</div>
            <div className="text-3xl font-bold">{data.kpis?.lowStockItems ?? 0}</div>
          </div>
          <div className="p-4 border rounded">
            <div className="text-sm text-gray-500">Inventory Items</div>
            <div className="text-3xl font-bold">{data.kpis?.totalInventoryItems ?? 0}</div>
          </div>
        </div>
      )}

      <div className="mt-6">
        <h3 className="font-semibold">Recent Requests</h3>
        <div className="mt-2">
          {data?.pendingRequests?.length === 0 && <div>No recent requests</div>}
          {data?.pendingRequests?.map(r => (
            <div key={r.id} className="p-2 border-b">
              #{r.id} from SC {r.scId} — {r.items.map(i => `${i.sku} x${i.qty}`).join(', ')} — {r.status}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
