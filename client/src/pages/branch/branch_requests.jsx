import React, { useEffect, useState } from "react";

export default function BranchRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const authHeader = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const res = await fetch(getApiUrl('/branch/branch-requests'), {
          headers: authHeader(),
        });
        const data = await res.json();
        setRequests(data);
      } catch (error) {
        console.error("Error fetching requests:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2>Branch Spare Requests</h2>
      <table>
        <thead>
          <tr>
            <th>Request Number</th>
            <th>Status</th>
            <th>Created At</th>
            <th>Items</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((req) => (
            <tr key={req.Id}>
              <td>{req.RequestNumber}</td>
              <td>{req.Status}</td>
              <td>{new Date(req.CreatedAt).toLocaleDateString()}</td>
              <td>
                <ul>
                  {req.Items?.map((item) => (
                    <li key={item.Id}>
                      {item.SpareName} - Qty: {item.RequestedQty}
                    </li>
                  ))}
                </ul>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}