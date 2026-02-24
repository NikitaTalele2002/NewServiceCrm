import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useRole } from '../../context/RoleContext';
import FormInput from '../../components/common/FormInput';
import FilterSelect from '../../components/common/FilterSelect';
import Button from '../../components/common/Button';
import CallView from './CallView';
import StatusBadge from '../../components/common/StatusBadge';
import StatusTimeline from '../../components/common/StatusTimeline';

// Safe date formatter utility
const formatDate = (dateString) => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleString('en-IN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch {
    return 'Invalid Date';
  }
};

export default function CallUpdate() {
  const { role } = useRole();
  const [filters, setFilters] = useState({
    name: '',
    mobileNo: '',
    callId: '',
    fromDate: '',
    toDate: '',
    pincode: '',
    technician: '',
    dateType: '',
    callType: ''
  });
  const [calls, setCalls] = useState([]);
  const [allCalls, setAllCalls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [selectedCallId, setSelectedCallId] = useState(null);
  const [selectedCall, setSelectedCall] = useState(null);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [inventoryData, setInventoryData] = useState([]);
  const [selectedSku, setSelectedSku] = useState('');
  const [showActionLogModal, setShowActionLogModal] = useState(false);
  const [actionLogData, setActionLogData] = useState([]);
  const [showStatusHistoryModal, setShowStatusHistoryModal] = useState(false);
  const [selectedStatusCallId, setSelectedStatusCallId] = useState(null);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    fetchAllCalls();
  }, [role]);

  useEffect(() => {
    const callId = searchParams.get('callId');
    if (callId && allCalls.length > 0) {
      const call = allCalls.find(c => c.CallId == callId);
      if (call) {
        setSelectedCall(call);
      }
    }
  }, [searchParams, allCalls]);

  // Derive unique pincodes from calls data
  const pincodeOptions = useMemo(() => {
    const uniquePincodes = new Set();
    allCalls.forEach(call => {
      const pincode = call.Pincode || call.PinCode;
      if (pincode) {
        uniquePincodes.add(pincode);
      }
    });
    return Array.from(uniquePincodes)
      .sort()
      .map(pincode => ({ id: pincode, label: pincode }));
  }, [allCalls]);

  // Derive unique technicians from calls data
  const technicianOptions = useMemo(() => {
    const uniqueTechs = new Map();
    allCalls.forEach(call => {
      if (call.TechnicianName && call.AssignedTechnicianId) {
        uniqueTechs.set(call.AssignedTechnicianId, call.TechnicianName);
      }
    });
    return Array.from(uniqueTechs.entries())
      .map(([id, name]) => ({ id, label: name }));
  }, [allCalls]);

  const fetchAllCalls = async () => {
    setLoading(true);
    try {
      let endpoint = '/api/complaints';
      
      // For service center users, use the service-center specific endpoint
      if (role === 'service_center') {
        // serviceCenterId is actually the asc_id from ServiceCenter table (NOT user_id)
        const serviceCenterId = localStorage.getItem('serviceCenterId');
        console.log('[CallUpdate] Retrieved asc_id from localStorage:', serviceCenterId);
        console.log('[CallUpdate] This comes from ServiceCenter.asc_id, not from Users.user_id');
        console.log('[CallUpdate] All localStorage keys:', Object.keys(localStorage));
        
        if (!serviceCenterId) {
          console.error('[CallUpdate] ERROR: Service Center asc_id not found in localStorage');
          console.log('[CallUpdate] Available localStorage:', {
            token: !!localStorage.getItem('token'),
            serviceCenterId: localStorage.getItem('serviceCenterId'),
            role: localStorage.getItem('role'),
            user: localStorage.getItem('user')
          });
          alert('Service Center ID not found. Please logout and login again.');
          setAllCalls([]);
          setCalls([]);
          setLoading(false);
          return;
        }
        console.log('[CallUpdate] ✓ Using endpoint for service center asc_id:', serviceCenterId);
        endpoint = `/api/call-center/complaints/by-service-center/${encodeURIComponent(serviceCenterId)}`;
      }
      
      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) {
        if (response.status === 401) {
          alert('Unauthorized. Please login again.');
          // Perhaps redirect to login
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        setAllCalls([]);
        setCalls([]);
        return;
      }
      const data = await response.json();
      setAllCalls(data.complaints || []);
      setCalls(data.complaints || []);
    } catch (error) {
      console.error('Error fetching calls:', error);
      alert('Failed to fetch calls. Please check your connection.');
      setAllCalls([]);
      setCalls([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleSearch = async (e) => {
    e.preventDefault();

    const isEmpty = Object.values(filters).every((val) => !val);
    if (isEmpty) {
      alert("Please enter at least one field before searching.");
      return;
    }

    setSearching(true);
    try {
      // For now, client-side filtering. To make server-side, modify backend to accept query params.
      let filtered = allCalls;
      if (filters.name) 
      {
        filtered = filtered.filter(call => call.CustomerName && call.CustomerName.toLowerCase().includes(filters.name.toLowerCase()));
      }
      if (filters.mobileNo) 
      {
        filtered = filtered.filter(call => call.MobileNo && call.MobileNo.includes(filters.mobileNo));
      }
      if (filters.callId) 
      {
        filtered = filtered.filter(call => call.ComplaintId && call.ComplaintId.toString().includes(filters.callId));
      }
      if (filters.fromDate) 
      {
        filtered = filtered.filter(call => new Date(call.CreatedAt) >= new Date(filters.fromDate));
      }
      if (filters.toDate) 
      {
        filtered = filtered.filter(call => new Date(call.CreatedAt) <= new Date(filters.toDate));
      }
      if (filters.technician) 
      {
        filtered = filtered.filter(call => call.TechnicianName && call.TechnicianName.toLowerCase().includes(filters.technician.toLowerCase()));
      }
      if (filters.callType)
      {
        filtered = filtered.filter(call => call.CallStatus && call.CallStatus.toLowerCase().includes(filters.callType.toLowerCase()));
      }
      if (filters.pincode)
      {
        filtered = filtered.filter(call => {
          const callPincode = call.Pincode || call.PinCode;
          return callPincode && callPincode.toString() === filters.pincode.toString();
        });
      }
      setCalls(filtered);
    } catch (error) {
      console.error('Search failed:', error);
      alert('Search failed. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleReset = () => {
    setFilters({
      name: '',
      mobileNo: '',
      callId: '',
      fromDate: '',
      toDate: '',
      pincode: '',
      technician: '',
      dateType: '',
      callType: ''
    });
    setCalls(allCalls);
  };

  const handleSelectCall = (callId) => {
    setSelectedCallId(selectedCallId === callId ? null : callId);
  };

  const handleCallView = () => {
    if (selectedCallId) {
      const call = calls.find(c => c.ComplaintId === selectedCallId);
      setSelectedCall(call);
    } else {
      alert('Please select exactly one call to view.');
    }
  };

  const handleActionLog = async () => {
    if (selectedCallId) {
      try {
        const response = await fetch(`/api/complaints/${selectedCallId}/action-log`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setActionLogData(data);
        setShowActionLogModal(true);
      } catch (error) {
        console.error('Error fetching action log:', error);
        alert('Failed to fetch action log data.');
      }
    } else {
      alert('Please select exactly one call.');
    }
  };

  const handleViewInventory = async (sku) => {
    setSelectedSku(sku);
    try {
      const response = await fetch(`/api/products/inventory?sku=${encodeURIComponent(sku)}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setInventoryData(data);
      setShowInventoryModal(true);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      alert('Failed to fetch inventory data.');
    }
  };

  const handleRequestCancel = async () => {
    if (!selectedCallId) {
      alert('Please select a call to cancel.');
      return;
    }
    try {
      await fetch(`/api/complaints/${selectedCallId}/cancel`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      alert('Cancellation request submitted.');
      fetchCalls(filters); // Refresh data
      setSelectedCallId(null);
    } catch (error) {
      console.error('Error cancelling call:', error);
      alert('Failed to cancel call.');
    }
  };

  const handleViewStatusHistory = () => {
    if (selectedCallId) {
      setSelectedStatusCallId(selectedCallId);
      setShowStatusHistoryModal(true);
    } else {
      alert('Please select a call to view status history.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <h1 className="text-2xl font-bold mb-6">Call Update</h1>

        <div className="flex-1 ml-6">
          {/* Filters */}
          <div className="bg-white p-6 shadow-md mb-6">
            <form onSubmit={handleSearch}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <FormInput
                  label="Name:"
                  type="text"
                  value={filters.name}
                  onChange={(e) => handleFilterChange('name', e.target.value)}
                />
              </div>
              <div>
                <FormInput
                  label="Mobile No:"
                  type="text"
                  value={filters.mobileNo}
                  onChange={(e) => handleFilterChange('mobileNo', e.target.value)}
                />
              </div>
              <div>
                <FormInput
                  label="Call ID:"
                  type="text"
                  value={filters.callId}
                  onChange={(e) => handleFilterChange('callId', e.target.value)}
                />
              </div>
              <div>
                <FormInput
                  label="Registration From Date:"
                  type="date"
                  value={filters.fromDate}
                  onChange={(e) => handleFilterChange('fromDate', e.target.value)}
                />
              </div>
              <div>
                <FormInput
                  label="To Date:"
                  type="date"
                  value={filters.toDate}
                  onChange={(e) => handleFilterChange('toDate', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Pincode:</label>
                <FilterSelect
                  value={filters.pincode}
                  onChange={(e) => handleFilterChange('pincode', e.target.value)}
                  options={pincodeOptions}
                /> 
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Technician:</label>
                <FilterSelect
                  value={filters.technician}
                  onChange={(e) => handleFilterChange('technician', e.target.value)}
                  options={technicianOptions}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date type:</label>
                <FilterSelect
                  value={filters.dateType}
                  onChange={(e) => handleFilterChange('dateType', e.target.value)}
                  options={[
                    { value: '', label: 'Select' },
                    { value: 'Registration Date', label: 'Registration Date' },
                    { value: 'Call Closed Date', label: 'Call Closed Date' }
                  ]}
                />
              </div>
              <div> 
                <label className="block text-sm font-medium mb-1">Call type:</label>
                <FilterSelect
                  value={filters.callType}
                  onChange={(e) => handleFilterChange('callType', e.target.value)}
                  options={[
                    { value: ' ', label: 'Select' },
                    { value: 'Installation', label: 'Installation' },
                    { value: 'Service', label: 'Service' },
                    { value: 'Replacement', label: 'Replacement' },
                    { value: 'Dealer/Distributor stock check', label: 'Dealer/Distributor stock check' },
                    { value: 'DCF', label: 'DCF' },
                    { value: 'Demo', label: 'Demo' },
                    { value: 'Other', label: 'Others' }
                  ]}
                />
              </div>
            </div>
            <div className="flex space-x-4">
              <Button
                type="submit"
                variant="primary"
                disabled={searching}
              >
                {searching ? 'Searching...' : 'Search'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handleReset}
              >
                Reset
              </Button>
            </div>
            </form>
          </div>

          {/* Table */}
          <div className="bg-white shadow-md">
            <div className="p-4 border-b">
              <p className="text-sm">Total Records: {calls.length}</p>
            </div>
            
            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-4 text-center">Loading...</div>
              ) : (
                <table className="w-full text-sm border-collapse border">
                  <thead className="bg-gray-100 border">
                    <tr>
                      <th className="px-2 py-2 text-left border">Select</th>
                      <th className="px-2 py-2 text-left border">Call Id</th>
                      <th className="px-2 py-2 text-left border">Registration Date</th>
                      <th className="px-2 py-2 text-left border">Customer Name</th>
                      <th className="px-2 py-2 text-left border">Mobile No</th>
                      <th className="px-2 py-2 text-left border">City</th>
                      <th className="px-2 py-2 text-left border">Product</th>
                      <th className="px-2 py-2 text-left border">Model</th>
                      <th className="px-2 py-2 text-left border">Serial No</th>
                      <th className="px-2 py-2 text-left border">Status</th>
                      <th className="px-2 py-2 text-left border">Call Status</th>
                      <th className="px-2 py-2 text-left border">Stage</th>
                      <th className="px-2 py-2 text-left border">Technician</th>
                      <th className="px-2 py-2 text-left border">Remarks</th>
                      <th className="px-2 py-2 text-left border">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calls.map((call, index) => (
                      <tr key={`call-${call.ComplaintId || index}`} className="border-b border">
                        <td className="px-2 py-2 border">
                          <input
                            type="radio"
                            checked={selectedCallId === call.ComplaintId}
                            onChange={() => handleSelectCall(call.ComplaintId)}
                          />
                        </td>
                        
                        <td className="px-2 py-2 border font-semibold">{call.ComplaintId}</td>
                        <td className="px-2 py-2 border">{formatDate(call.CreatedAt)}</td>
                        <td className="px-2 py-2 border">{call.CustomerName || '-'}</td>
                        <td className="px-2 py-2 border">{call.MobileNo || call.CallerMobile || '-'}</td>
                        <td className="px-2 py-2 border">{call.City || '-'}</td>
                        <td className="px-2 py-2 border">{call.Product || call.ProductGroup || '-'}</td>
                        <td className="px-2 py-2 border">
                          <button
                            onClick={() => handleViewInventory(call.Model || call.ModelDescription)}
                            className="text-blue-600 underline hover:text-blue-800">
                            {call.Model || call.ModelDescription || '-'}
                          </button>
                        </td>
                        <td className="px-2 py-2 border text-xs">{call.ProductSerialNo || '-'}</td>
                        <td className="px-2 py-2 border">
                          <StatusBadge callId={call.ComplaintId} size="small" showIcon={true} />
                        </td>
                        <td className="px-2 py-2 border">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                            {call.CallStatus || '-'}
                          </span>
                        </td>
                        <td className="px-2 py-2 border">{call.AssignedTechnicianId ? 'Assigned' : 'Open'}</td>
                        <td className="px-2 py-2 border">{call.TechnicianName || '-'}</td>
                        <td className="px-2 py-2 border text-xs max-w-xs truncate" title={call.CustomerRemarks || ''}>
                          {call.CustomerRemarks ? call.CustomerRemarks.substring(0, 30) + (call.CustomerRemarks.length > 30 ? '...' : '') : '-'}
                        </td>
                        <td className="px-2 py-2 border">
                          <button
                            onClick={() => handleSelectCall(call.ComplaintId)}
                            className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs">View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-4 mt-6">
            <button
              onClick={handleCallView}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Call View
            </button>
            <button
              onClick={handleActionLog}
              className="px-4 py-2 bg-green-600 text-black rounded hover:bg-green-700">Action Log
            </button>
            <button
              onClick={handleViewStatusHistory}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">View Status History
            </button>
            <button
              onClick={handleRequestCancel}
              className="px-4 py-2 bg-red-600 text-black rounded hover:bg-red-700">Request to Cancel
            </button>
          </div>
        </div>

        {selectedCall && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-4 rounded max-w-5xl max-h-screen overflow-auto">
              <button onClick={() => setSelectedCall(null)} className="float-right text-red-500 text-xl">×</button>
              <CallView call={selectedCall} />
            </div>
          </div>
        )}

        {showInventoryModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded max-w-6xl max-h-screen overflow-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Current Inventory{selectedSku ? ` for SKU: ${selectedSku}` : ''}</h2>
                <button onClick={() => setShowInventoryModal(false)} className="text-red-500 text-xl">×</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead className="bg-gray-100">
                    <tr>
                      {selectedSku ? (
                        <>
                          <th className="border border-gray-300 px-4 py-2 text-left">Invoice Number</th>
                          <th className="border border-gray-300 px-4 py-2 text-left">Invoice Date</th>
                          <th className="border border-gray-300 px-4 py-2 text-left">SKU/Part Code</th>
                          <th className="border border-gray-300 px-4 py-2 text-left">Part Name</th>
                          <th className="border border-gray-300 px-4 py-2 text-left">Invoice Quantity</th>
                        </>
                      ) : (
                        <>
                          <th className="border border-gray-300 px-4 py-2 text-left">SKU</th>
                          <th className="border border-gray-300 px-4 py-2 text-left">Spare Name</th>
                          <th className="border border-gray-300 px-4 py-2 text-left">Good Qty</th>
                          <th className="border border-gray-300 px-4 py-2 text-left">Defective Qty</th>
                          <th className="border border-gray-300 px-4 py-2 text-left">Total</th>
                          <th className="border border-gray-300 px-4 py-2 text-left">Approved By</th>
                          <th className="border border-gray-300 px-4 py-2 text-left">Approved At</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {inventoryData.map((item, index) => {
                      // Use a composite key from the item data
                      const itemKey = item['SKU/Part Code'] && item['Invoice Number'] 
                        ? `${item['Invoice Number']}-${item['SKU/Part Code']}`
                        : item.SKU || index;
                      return (
                      <tr key={itemKey} className="border-b border-gray-300">
                        {selectedSku ? (
                          <>
                            <td className="border border-gray-300 px-4 py-2">{item['Invoice Number']}</td>
                            <td className="border border-gray-300 px-4 py-2">{formatDate(item['Invoice Date'])}</td>
                            <td className="border border-gray-300 px-4 py-2">{item['SKU/Part Code']}</td>
                            <td className="border border-gray-300 px-4 py-2">{item['Part Name']}</td>
                            <td className="border border-gray-300 px-4 py-2">{item['Invoice Quantity']}</td>
                          </>
                        ) : (
                          <>
                            <td className="border border-gray-300 px-4 py-2">
                              <button onClick={() => handleViewInventory(item.SKU)} className="text-blue-600 underline">
                                {item.SKU}
                              </button>
                            </td>
                            <td className="border border-gray-300 px-4 py-2">{item['Spare Name']}</td>
                            <td className="border border-gray-300 px-4 py-2">{item['Good Qty']}</td>
                            <td className="border border-gray-300 px-4 py-2">{item['Defective Qty']}</td>
                            <td className="border border-gray-300 px-4 py-2">{item.Total}</td>
                            <td className="border border-gray-300 px-4 py-2">{item['Approved By']}</td>
                            <td className="border border-gray-300 px-4 py-2">{item['Approved At'] ? formatDate(item['Approved At']) : '-'}</td>
                          </>
                        )}
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {showActionLogModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded max-w-6xl max-h-screen overflow-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Action Log</h2>
                <button onClick={() => setShowActionLogModal(false)} className="text-red-500 text-xl">×</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border border-gray-300 px-4 py-2 text-left">Call ID</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Action Date</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Company</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">UserName</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Status</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Stage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {actionLogData.map((item, index) => {
                      // Use CallID and ActionDate to create unique key
                      const itemKey = item.CallID && item.ActionDate 
                        ? `${item.CallID}-${item.ActionDate}`
                        : index;
                      return (
                      <tr key={itemKey} className="border-b border-gray-300">
                        <td className="border border-gray-300 px-4 py-2">{item.CallID}</td>
                        <td className="border border-gray-300 px-4 py-2">{formatDate(item.ActionDate)}</td>
                        <td className="border border-gray-300 px-4 py-2">{item.Company}</td>
                        <td className="border border-gray-300 px-4 py-2">{item.UserName}</td>
                        <td className="border border-gray-300 px-4 py-2">{item.Status}</td>
                        <td className="border border-gray-300 px-4 py-2">{item.Stage}</td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {showStatusHistoryModal && selectedStatusCallId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded max-w-2xl max-h-screen overflow-auto w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Status History - Call ID: {selectedStatusCallId}</h2>
                <button onClick={() => setShowStatusHistoryModal(false)} className="text-red-500 text-xl">×</button>
              </div>
              <StatusTimeline callId={selectedStatusCallId} />
            </div>
          </div>
        )}
      </div>
  );
}
