import React, { useState } from "react";

export default function ConfirmRequest() {
  const [productGroups, setProductGroups] = useState([]);

  React.useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const res = await fetch(`http://localhost:5000/api/admin/master-data?type=productgroup`, { headers });
        const data = await res.json();
        const rows = Array.isArray(data) ? data : data.rows || data.data || [];
        setProductGroups(rows);
      } catch (e) {
        setProductGroups([]);
      }
    })();
  }, []);

  function getPgLabel(pg) {
    if (!pg) return "";
    const s = String(pg);
    const found = productGroups.find(p => String(p.Id ?? p.ID ?? p.id ?? p) === s);
    if (found) return found.DESCRIPTION ?? found.Description ?? found.NAME ?? found.Name ?? found.VALUE ?? found.Value ?? s;
    return pg;
  }

  // Approve request
  const approveRequest = (id) => {
    const updated = requests.map((req) =>
      req.id === id ? { ...req, status: "Approved" } : req
    );
    setRequests(updated);
  };

  // Reject request
  const rejectRequest = (id) => {
    const updated = requests.map((req) =>
      req.id === id ? { ...req, status: "Rejected" } : req
    );
    setRequests(updated);
  };

  return (
    <div>
      <h2 className="text-xl font-bold">Confirm Requests</h2>
      <h4 className="font-bold text-red-500 mt-2">Approve or Reject Order Requests</h4>

      <table className="w-full border border-gray-300 mt-6">
        <thead className="bg-gray-200">
          <tr>
            <th className="border p-2">Product Group</th>
            <th className="border p-2">Product Type</th>
            <th className="border p-2">Model</th>
            <th className="border p-2">Quantity</th>
            <th className="border p-2">Remarks</th>
            <th className="border p-2">Status</th>
            <th className="border p-2">Action</th>
          </tr>
        </thead>

        <tbody>
          {requests.length > 0 ? (
            requests.map((req) => (
              <tr key={req.id}>
                <td className="border p-2">{getPgLabel(req.productGroup)}</td>
                <td className="border p-2">{req.productType}</td>
                <td className="border p-2">{req.model}</td>
                <td className="border p-2">{req.quantity}</td>
                <td className="border p-2">{req.remarks || "-"}</td>

                <td className="border p-2 text-center">
                  {req.status === "Pending" && (
                    <span className="px-3 py-1 bg-yellow-300 rounded">
                      Pending
                    </span>
                  )}
                  {req.status === "Approved" && (
                    <span className="px-3 py-1 bg-green-500 text-black rounded">
                      Approved
                    </span>
                  )}
                  {req.status === "Rejected" && (
                    <span className="px-3 py-1 bg-red-500 text-black rounded">
                      Rejected
                    </span>
                  )}
                </td>
                <td className="border p-2 text-center">
                  {req.status === "Pending" ? (
                    <>
                      <button
                        onClick={() => approveRequest(req.id)}
                        className="bg-green-600 text-black px-3 py-1 rounded mr-2 hover:bg-green-700">Approve
                      </button>

                      <button
                        onClick={() => rejectRequest(req.id)}
                        className="bg-red-600 text-black px-3 py-1 rounded hover:bg-red-700">Reject
                      </button>
                    </>
                  ) : (
                    <span className="text-gray-500">No Action Required</span>
                  )}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="7" className="text-center p-4 text-gray-500">
                No requests found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
// i have my database on the localhost 