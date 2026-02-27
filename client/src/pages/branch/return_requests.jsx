import React, { useEffect, useState } from "react";
import { useBranch } from "../../hooks/useBranch";
import { getApiUrl } from "../../config/apiConfig";
import FormInput from "../../components/common/FormInput";
import FilterSelect from "../../components/common/FilterSelect";
import Button from "../../components/common/Button";
import ErrorMessage from "../../components/common/ErrorMessage";
import SuccessMessage from "../../components/common/SuccessMessage";

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

const getUserRole = () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.role;
  } catch {
    return null;
  }
};

export default function BranchReturnRequests() {
  const {
    loading,
    error,
    getBranches,
    getRsmBranches,
    getServiceCentersByBranch,
    getBranchReturnRequests,
    getBranchReturnRequestDetails
  } = useBranch();

  const userRole = getUserRole();
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [serviceCenters, setServiceCenters] = useState([]);
  const [branches, setBranches] = useState([]);
  const [filters, setFilters] = useState({
    branch: '',
    asc: '',
    status: '',
    challanNo: '',
    dcfNo: ''
  });

  // Load branches based on user role
  useEffect(() => {
    const loadBranches = async () => {
      let result;
      if (userRole === 'rsm') {
        // For RSMs, get only their assigned branches
        result = await getRsmBranches();
      } else {
        // For branch users, get all branches
        result = await getBranches();
      }
      if (result.success) {
        setBranches(result.data);
      }
    };
    loadBranches();
  }, [userRole]);

  // Load service centers when branch is selected
  useEffect(() => {
    const selectedBranch = branches.find(b => b.id === filters.branch);
    if (selectedBranch) {
      const loadServiceCenters = async () => {
        const result = await getServiceCentersByBranch(selectedBranch.Id);
        if (result.success) {
          setServiceCenters(result.data);
        }
      };
      loadServiceCenters();
    } else {
      setServiceCenters([]);
    }
  }, [filters.branch, branches]);

  // Load return requests
  useEffect(() => {
    const loadRequests = async () => {
      const result = await getBranchReturnRequests();
      if (result.success) {
        setRequests(result.data);
      }
    };
    loadRequests();
  }, []);

  const handleRequestClick = async (requestId) => {
    setDetailsLoading(true);
    try {
      const result = await getBranchReturnRequestDetails(requestId);
      if (result.success) {
        setSelectedRequest({ id: requestId, ...result.data });
      } else {
        alert("Error fetching request details");
      }
    } catch (err) {
      console.error(err);
      alert("Error fetching request details");
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedRequest) return;
    const items = (selectedRequest.items || []).map(item => ({
      partCode: item.partCode,
      receivedQty: parseInt(item.cfReceivedQty ?? 0),
      approvedQty: parseInt(item.cfApprovedQty ?? 0),
      rejectedQty: parseInt(item.cfRejectedQty ?? 0),
    }));
    try {
      const res = await fetch(getApiUrl(`/branch/branch-requests/${selectedRequest.id}/items`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({ items }),
      });
      if (res.ok) {
        alert('Updated successfully');
        // Refresh details
        handleRequestClick(selectedRequest.id);
      } else {
        alert('Error updating');
      }
    } catch (error) {
      console.error('Error updating:', error);
      alert('Error updating');
    }
  };

  const handleApprove = async (requestId) => {
    try {
      const res = await fetch(getApiUrl(`/branch/branch-requests/${requestId}/status`), {
        method: 'PUT',
        headers: {
          ...getAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'Approved' }),
      });
      if (res.ok) {
        alert('Request approved');
        window.location.reload();
      } else {
        alert('Error approving request');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error approving request');
    }
  };

  const handleReject = async (requestId) => {
    try {
      const res = await fetch(getApiUrl(`/branch/branch-requests/${requestId}/status`), {
        method: 'PUT',
        headers: {
          ...getAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'Rejected' }),
      });
      if (res.ok) {
        alert('Request rejected');
        window.location.reload();
      } else {
        alert('Error rejecting request');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error rejecting request');
    }
  };

  // Filter requests safely
  const filteredRequests = requests.filter(req => {
    // Get the branch object from the branches array if we need to match by ID
    if (filters.branch) {
      const selectedBranch = branches.find(b => b.id === filters.branch);
      if (selectedBranch && req.branchName !== selectedBranch.label) return false;
    }
    if (filters.asc) {
      const selectedSC = serviceCenters.find(s => s.id === filters.asc);
      if (selectedSC && req.serviceCenterName !== selectedSC.label) return false;
    }
    if (filters.status && req.Status !== filters.status) return false;
    if (filters.challanNo && !req.Id?.toString()?.includes(filters.challanNo)) return false;
    if (filters.dcfNo && !req.Items?.some(item => item.sku?.includes(filters.dcfNo))) return false;
    return true;
  });

  if (loading) return <div>Loading...</div>;

 

  return (
    <div className="p-5 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Spare Part Return Request</h1>
      
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
          <FilterSelect
            label="Branch"
            value={filters.branch}
            onChange={(val) => setFilters({ ...filters, branch: val, asc: '' })}
            options={branches}
            optionValue="id"
            optionLabel="label"
            placeholder="Select Branch"
          />
          
          <FilterSelect
            label="ASC"
            value={filters.asc}
            onChange={(val) => setFilters({ ...filters, asc: val })}
            options={serviceCenters}
            optionValue="id"
            optionLabel="label"
            placeholder="Select ASC"
            disabled={!filters.branch}
          />
          
          <FilterSelect
            label="Request Status"
            value={filters.status}
            onChange={(val) => setFilters({ ...filters, status: val })}
            options={[
              { id: 'Return Requested', label: 'Return Requested' },
              { id: 'Approved', label: 'Approved' },
              { id: 'Rejected', label: 'Rejected' }
            ]}
            optionValue="id"
            optionLabel="label"
            placeholder="Select Status"
          />
          
          <FormInput
            label="Challan No"
            name="challanNo"
            type="text"
            value={filters.challanNo}
            onChange={(e) => setFilters({ ...filters, challanNo: e.target.value })}
          />
          
          <FormInput
            label="DCF No"
            name="dcfNo"
            type="text"
            value={filters.dcfNo}
            onChange={(e) => setFilters({ ...filters, dcfNo: e.target.value })}
          />
        </div>
      </div>
      <table className="w-full border-collapse border border-gray-300">
        <thead>
          <tr className="border-b-2 border-black bg-gray-200">
            <th className="p-2.5 text-left">Branch</th>
            <th className="p-2.5 text-left">ASC</th>
            <th className="p-2.5 text-left">Request No.</th>
            <th className="p-2.5 text-left">Challan No.</th>
            <th className="p-2.5 text-left">DCF No.</th>
            <th className="p-2.5 text-left">Action</th>
          </tr>
        </thead>
        <tbody>
          {filteredRequests.map((req) => (
            <tr key={req.Id} className="border-b border-gray-300">
              <td className="p-2.5">{req.branchName || 'N/A'}</td>
              <td className="p-2.5">{req.serviceCenterName || 'N/A'}</td>
              <td className="p-2.5 cursor-pointer text-blue-600 underline" onClick={() => handleRequestClick(req.Id)}>{req.Id}</td>
              <td className="p-2.5">{req.Id}</td>
              <td className="p-2.5">{req.Items?.[0]?.sku || 'N/A'}</td>
              <td className="p-2.5">
                {req.Status === 'Approved' || req.Status === 'Rejected' ? (
                  <span className="px-3 py-1 bg-gray-200 rounded text-sm">{req.Status}</span>
                ) : (
                  <div className="flex gap-2">
                    <Button onClick={() => handleApprove(req.Id)} variant="success" size="sm">Approve</Button>
                    <Button onClick={() => handleReject(req.Id)} variant="danger" size="sm">Reject</Button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {detailsLoading && <div>Loading details...</div>}

      {selectedRequest && !detailsLoading && (
        <div className="mt-10">
          <h2>DCF Items Details :</h2>
          <p>DCF No. : {selectedRequest.requestNumber}</p>
          <p>Service Center: {selectedRequest.serviceCenterName }</p>
          <table className="w-full border-collapse mt-5">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="p-2 text-left">Part Code</th>
                <th className="p-2 text-left">Part Description</th>
                <th className="p-2 text-left">QTY DCF</th>
                <th className="p-2 text-left">C&F Received QTY</th>
                <th className="p-2 text-left">C&F Approved QTY</th>
                <th className="p-2 text-left">C&F Rejected QTY</th>
              </tr>
            </thead>
            <tbody>
              {selectedRequest.items.map((item, index) => (
                <tr key={index} className="border-b border-gray-200">
                  <td className="p-2">{item.partCode}</td>
                  <td className="p-2">{item.partDescription}</td>
                  <td className="p-2">{item.qtyDcf}</td>
                  <td className="p-2">
                    <input
                      type="number"
                      value={item.cfReceivedQty || ''}
                      onChange={(e) => {
                        const receivedVal = parseInt(e.target.value) || 0;
                        const maxAllowed = parseInt(item.qtyDcf) || 0;
                        if (receivedVal > maxAllowed) {
                          alert(`C&F Received QTY cannot exceed QTY DCF (${maxAllowed})`);
                          return;
                        }
                        const newItems = [...selectedRequest.items];
                        newItems[index].cfReceivedQty = e.target.value;
                        const approvedVal = parseInt(newItems[index].cfApprovedQty) || 0;
                        if (approvedVal > receivedVal) {
                          newItems[index].cfApprovedQty = e.target.value;
                        }
                        setSelectedRequest({ ...selectedRequest, items: newItems });
                      }}
                      max={item.qtyDcf}
                      min="0"
                      className="w-16 p-1 border border-gray-300 rounded"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      value={item.cfApprovedQty || ''}
                      onChange={(e) => {
                        const approvedVal = parseInt(e.target.value) || 0;
                        const maxAllowed = parseInt(item.cfReceivedQty) || 0;
                        if (approvedVal > maxAllowed) {
                          alert(`C&F Approved QTY cannot exceed C&F Received QTY (${maxAllowed})`);
                          return;
                        }
                        const newItems = [...selectedRequest.items];
                        newItems[index].cfApprovedQty = e.target.value;
                        setSelectedRequest({ ...selectedRequest, items: newItems });
                      }}
                      max={item.cfReceivedQty}
                      min="0"
                      className="w-16 p-1 border border-gray-300 rounded"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      value={item.cfRejectedQty || ''}
                      onChange={(e) => {
                        const newItems = [...selectedRequest.items];
                        newItems[index].cfRejectedQty = e.target.value;
                        setSelectedRequest({ ...selectedRequest, items: newItems });
                      }}
                      className="w-16 p-1 border border-gray-300 rounded"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-5">Total QTY: {selectedRequest.totalQty}</p>
          <Button onClick={handleUpdate} variant="primary">Update</Button>
        </div>
      )}
    </div>
  );
}
