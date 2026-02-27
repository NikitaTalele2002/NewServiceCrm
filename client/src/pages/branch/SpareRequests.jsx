import React, { useEffect, useState } from 'react';
import { getApiUrl } from '../../config/apiConfig';
import Button from '../../components/common/Button';
import { useBranch } from '../../hooks/useBranch';

export default function SpareRequests() {
  const {
    branchRequests,
    loading,
    error,
    getBranchRequests,
    approveBranchRequest
  } = useBranch();
  
  const [selectedId, setSelectedId] = useState(null);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    getBranchRequests();
  }, []);

  async function approve(id) {
    setApproving(true);
    try {
      const result = await approveBranchRequest(id, {});
      if (result.success) {
        alert(result.data?.message || 'Request approved');
        setSelectedId(null);
        await getBranchRequests();
      } else {
        alert('Error: ' + (result.error || 'Approve failed'));
      }
    } catch (err) {
      alert('Error: ' + (err.message || err));
    } finally {
      setApproving(false);
    }
  }

  const selected = branchRequests?.find(r => r.Id === selectedId);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Spare Request Management</h2>
      {loading && <div>Loading requests...</div>}
      {!loading && (!branchRequests || branchRequests.length === 0) && <div>No requests</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {branchRequests?.map(r => (
          <div
            key={r.Id}
            onClick={() => setSelectedId(r.Id)}
            className={`p-3 border rounded cursor-pointer ${selectedId === r.Id ? 'bg-blue-50 border-blue-500' : 'hover:bg-gray-50'}`}>
            <div className="font-semibold">{r.RequestNumber}</div>
            <div className="text-sm text-gray-600">SC {r.ServiceCenterId}</div>
            <div className="text-sm mt-1">Items: {r.Items ? r.Items.length : 0}</div>
            <div className={`text-xs mt-2 px-2 py-1 rounded inline-block ${r.Status === 'pending' ? 'bg-yellow-100' : r.Status === 'approved' ? 'bg-green-100' : r.Status === 'forwarded' ? 'bg-blue-100' : 'bg-gray-100'}`}>
              {r.Status}
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div className="p-4 border rounded bg-white">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">{selected.RequestNumber}</h3>
            <Button
              onClick={() => setSelectedId(null)}
              variant="secondary"
              className="text-lg"
            >
              ✕
            </Button>
          </div>

          <div className="mb-4">
            <p><strong>Service Center ID:</strong> {selected.ServiceCenterId}</p>
            <p><strong>Status:</strong> {selected.Status}</p>
            <p><strong>Created:</strong> {new Date(selected.CreatedAt).toLocaleString()}</p>
            {selected.ApprovedAt && <p><strong>Approved:</strong> {new Date(selected.ApprovedAt).toLocaleString()} by {selected.ApprovedBy}</p>}
            {selected.ForwardedAt && <p><strong>Forwarded:</strong> {new Date(selected.ForwardedAt).toLocaleString()} to {selected.ForwardedTo}</p>}
          </div>

          <div className="mb-4">
            <h4 className="font-semibold mb-2">Items Requested:</h4>
            <table className="w-full border">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 border">SKU</th>
                  <th className="p-2 border">Name</th>
                  <th className="p-2 border">Requested</th>
                  <th className="p-2 border">Available</th>
                  <th className="p-2 border">Approved</th>
                </tr>
              </thead>
              <tbody>
                {selected.Items && selected.Items.map((item, idx) => (
                  <tr key={item.Id}>
                    <td className="p-2 border">{item.Sku}</td>
                    <td className="p-2 border">{item.SpareName}</td>
                    <td className="p-2 border">{item.RequestedQty}</td>
                    <td className="p-2 border">{item.availableQty ?? 0}</td>
                    <td className="p-2 border">
                      {selected.Status === 'pending' ? (
                        <input
                          type="number"
                          min="0"
                          max={item.availableQty ?? 0}
                          value={item.ApprovedQty ?? item.RequestedQty}
                          onChange={e => {
                            const val = Math.max(0, Math.min(Number(e.target.value), item.availableQty ?? 0));
                            item.ApprovedQty = val;
                            selected.Items[idx].ApprovedQty = val;
                            // force update
                            setSelectedId(selected.Id);
                          }}
                          className="w-16 border rounded p-1 text-right"
                        />
                      ) : (item.ApprovedQty || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selected.Status === 'pending' && (
            <div className="flex gap-2 mt-4">
              <Button
                onClick={() => approve(selected.Id)}
                disabled={approving}
                variant="success"
              >
                {approving ? 'Processing...' : 'Approve'}
              </Button>
              <Button
                onClick={async () => {
                  const reason = prompt('Enter rejection reason:');
                  if (!reason) return;
                  setApproving(true);
                  try {
                    const token = localStorage.getItem('token');
                    const res = await fetch(getApiUrl(`/spare-requests/${selected.Id}/reject`), {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                      },
                      body: JSON.stringify({ reason })
                    });
                    const data = await res.json();
                    if (data.ok) {
                      alert('Request rejected');
                      setSelectedId(null);
                      await getBranchRequests();
                    } else {
                      alert('Error: ' + (data.error || 'Reject failed'));
                    }
                  } catch (err) {
                    alert('Error: ' + (err.message || err));
                  } finally {
                    setApproving(false);
                  }
                }}
                disabled={approving}
                variant="danger"
              >
                Reject
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


