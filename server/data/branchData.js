// Simple in-memory store for branch inventories and spare requests
// This is a prototype. Replace with DB-backed models in production.

const branchInventories = {
  // branchId: [ { sku, name, goodQty, defectiveQty, minStock } ]
  1: [
    { sku: 'SP-1001', name: 'Compressor', goodQty: 10, defectiveQty: 1, minStock: 5 },
    { sku: 'SP-1002', name: 'Thermostat', goodQty: 3, defectiveQty: 0, minStock: 4 },
  ],
  2: [
    { sku: 'SP-1001', name: 'Compressor', goodQty: 2, defectiveQty: 0, minStock: 5 },
  ],
};

// spare requests raised by service centers to branches
// { id, branchId, scId, items: [{sku, qty}], status: 'pending'|'approved'|'forwarded', createdAt }
let spareRequests = [
  { id: 1, branchId: 1, scId: 101, items: [{ sku: 'SP-1001', qty: 2 }], status: 'pending', createdAt: new Date().toISOString() },
  { id: 2, branchId: 1, scId: 102, items: [{ sku: 'SP-1002', qty: 1 }], status: 'pending', createdAt: new Date().toISOString() },
];

let nextRequestId = 3;

function listRequestsForBranch(branchId) {
  return spareRequests.filter(r => Number(r.branchId) === Number(branchId));
}

function getRequestById(id) {
  return spareRequests.find(r => Number(r.id) === Number(id));
}

function addRequest(branchId, scId, items) {
  const r = { id: nextRequestId++, branchId: Number(branchId), scId, items, status: 'pending', createdAt: new Date().toISOString() };
  spareRequests.push(r);
  return r;
}

function approveRequest(id) {
  const r = getRequestById(id);
  if (!r) return null;
  r.status = 'approved';
  // reduce inventory if available
  const inv = branchInventories[r.branchId] || [];
  r.items.forEach(it => {
    const row = inv.find(x => x.sku === it.sku);
    if (row) {
      const taken = Math.min(row.goodQty, it.qty);
      row.goodQty -= taken;
    }
  });
  return r;
}

function forwardRequest(id) {
  const r = getRequestById(id);
  if (!r) return null;
  r.status = 'forwarded';
  return r;
}

function getInventoryForBranch(branchId) {
  return branchInventories[Number(branchId)] || [];
}

function adjustStock(branchId, sku, deltaGood = 0, deltaDefective = 0) {
  const inv = branchInventories[Number(branchId)];
  if (!inv) return null;
  const row = inv.find(r => r.sku === sku);
  if (!row) return null;
  row.goodQty = Math.max(0, (row.goodQty || 0) + Number(deltaGood));
  row.defectiveQty = Math.max(0, (row.defectiveQty || 0) + Number(deltaDefective));
  return row;
}

function lowStockAlerts(branchId) {
  const inv = getInventoryForBranch(branchId);
  return inv.filter(i => (i.goodQty || 0) <= (i.minStock || 0));
}

export { listRequestsForBranch, addRequest, approveRequest, forwardRequest, getInventoryForBranch, adjustStock, lowStockAlerts };
