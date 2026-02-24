import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

const BranchDCFDetails = () => {
  const { id } = useParams();
  const [request, setRequest] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (id) fetchDetails(id);
  }, [id]);

  const fetchDetails = async (requestId) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/returns/branch-requests/${requestId}/details`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!res.ok) throw new Error('Failed to fetch request details');
      const data = await res.json();
      setRequest({ id: requestId, requestNumber: data.requestNumber || data.requestId });
      const mapped = (data.items || []).map(it => ({
        sku: it.partCode || it.Sku || it.sku,
        description: it.partDescription || it.SpareName || it.spareName,
        requestedQty: Number(it.qtyDcf || it.requestedQty || it.RequestedQty || 0),
        approvedQty: Number(it.cfApprovedQty || it.cfApprovedQty || it.ApprovedQty || 0),
        rejectedQty: Number(it.cfRejectedQty || it.RejectedQty || 0)
      }));
      setItems(mapped);
      setError(null);
    } catch (err) {
      console.error('Error fetching request details:', err);
      setError('Failed to load request details');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-5">
      <h2>DCF Items Details</h2>
      {request && <h3>DCF No. : {request.requestNumber}</h3>}
      {loading && <p>Loading...</p>}
      {error && <p className="text-red-600">{error}</p>}

      <div className="border border-gray-300 p-2.5 mt-2.5">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border border-gray-300 p-2">Part Code</th>
              <th className="border border-gray-300 p-2">Part Description</th>
              <th className="border border-gray-300 p-2">QTY DCF</th>
              <th className="border border-gray-300 p-2">C&F Approved QTY</th>
              <th className="border border-gray-300 p-2">C&F Rejected QTY</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => (
              <tr key={idx}>
                <td className="border border-gray-300 p-2">{it.sku}</td>
                <td className="border border-gray-300 p-2">{it.description}</td>
                <td className="border border-gray-300 p-2">{it.requestedQty}</td>
                <td className="border border-gray-300 p-2">{it.approvedQty}</td>
                <td className="border border-gray-300 p-2">{it.rejectedQty}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BranchDCFDetails;