import React, { useState, useEffect } from 'react';
import Button from '../../components/common/Button';

const ApproveTechnicianRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/technician-status-requests', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch requests');
      const data = await response.json();
      setRequests(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/technician-status-requests/${id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ notes: 'Approved' })
      });
      if (!response.ok) throw new Error('Failed to approve');
      alert('Request approved');
      fetchRequests();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleReject = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/technician-status-requests/${id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ notes: 'Rejected' })
      });
      if (!response.ok) throw new Error('Failed to reject');
      alert('Request rejected');
      fetchRequests();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Approve Technician Status Requests</h1>
      {loading && <p>Loading...</p>}
      {error && <p className="text-red-500">{error}</p>}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border">
          <thead>
            <tr>
              <th className="border px-4 py-2">Technician Name</th>
              <th className="border px-4 py-2">Service Center</th>
              <th className="border px-4 py-2">Request Type</th>
              <th className="border px-4 py-2">Requested By</th>
              <th className="border px-4 py-2">Requested At</th>
              <th className="border px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map(req => (
              <tr key={req.Id}>
                <td className="border px-4 py-2">
                  {req.RequestType === 'add' ? req.TechnicianName : req.Technician?.Name}
                </td>
                <td className="border px-4 py-2">
                  {req.RequestType === 'add' ? req.Requester?.ServiceCentre?.CenterName : req.Technician?.ServiceCentre?.CenterName}
                </td>
                <td className="border px-4 py-2">{req.RequestType}</td>
                <td className="border px-4 py-2">{req.Requester?.Username}</td>
                <td className="border px-4 py-2">{new Date(req.RequestedAt).toLocaleDateString()}</td>
                <td className="border px-4 py-2">
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleApprove(req.Id)}
                      variant="success"
                      className="text-sm"
                    >
                      Approve
                    </Button>
                    <Button
                      onClick={() => handleReject(req.Id)}
                      variant="danger"
                      className="text-sm"
                    >
                      Reject
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ApproveTechnicianRequests;