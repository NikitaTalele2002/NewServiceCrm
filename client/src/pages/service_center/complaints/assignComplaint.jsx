import React, { useEffect, useState } from 'react';
import { useComplaints } from '../../../hooks/useComplaints';
import { useTechnicians } from '../../../hooks/useTechnicians';
import { useRole } from '../../../context/RoleContext';
import AssignComplaintFilters from './components/AssignComplaintFilters';
import AssignComplaintTable from './components/AssignComplaintTable';

export default function AssignComplaint() {
  const { complaints, loading: complaintsLoading, error: complaintsError, getComplaints, assignTechnician } = useComplaints();
  const { technicians, loading: techniciansLoading, error: techniciansError, getTechniciansByCentre } = useTechnicians();
  const { user } = useRole();

  const [filters, setFilters] = useState({
    callId: '',
    dateFrom: '',
    dateTo: '',
    zone: '',
    callType: '',
    mobile: '',
    dealer: '',
    technician: 'all',
    unAllocatedOnly: false,
    query: ''
  });

  const [query, setQuery] = useState('');
  const [reallocatedMap, setReallocatedMap] = useState({});
  const [selectedMap, setSelectedMap] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  // Auto-refresh data every 15 seconds to show latest technician assignments
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData();
    }, 15000); // Refresh every 15 seconds
    
    return () => clearInterval(interval);
  }, []);

  async function fetchData() {
    setError(null);

    const selectedCenter = user?.serviceCenterId || localStorage.getItem('serviceCenterId') || localStorage.getItem('selectedServiceCenterId');

    if (!selectedCenter || selectedCenter === 'null' || selectedCenter === 'undefined') {
      setError('No service center ID found. Please log in again.');
      return;
    }

    console.log('📍 Service Center ID:', selectedCenter);

    // Load complaints of this service center
    console.log('📋 Loading complaints...');
    const compResult = await getComplaints(selectedCenter);
    if (!compResult.success) {
      console.error('❌ Error loading complaints:', compResult.error);
      setError(compResult.error);
      return;
    }
    console.log('✅ Complaints loaded:', compResult.data?.length || 'unknown');

    // Load technicians for this service center
    console.log('👷 Loading technicians for centre:', selectedCenter);
    const techResult = await getTechniciansByCentre(selectedCenter);
    if (!techResult.success) {
      console.error('❌ Error loading technicians:', techResult.error);
      setError(`Technicians load failed: ${techResult.error}`);
      return;
    }
    console.log('✅ Technicians loaded:', techResult.data?.length || 'unknown');
    console.log('📋 Technicians data:', techResult.data);
  }

  function handleSearchChange(e) {
    setQuery(e.target.value || '');
  }

  function onChange(e) {
    const { name, value, type, checked } = e.target;
    setFilters((p) => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  }

  function formatAddress(obj) {
    if (!obj) return "N/A";
    
    // First, check if there's a Customer nested object (like in ShowProducts)
    const customerObj = obj.Customer || obj.customer;
    const addressSource = customerObj || obj;
    
    const parts = [];
    
    // Check multiple possible property names for each field
    const address = addressSource.Address || addressSource.address || addressSource.CustomerAddress || addressSource.customerAddress;
    const landmark = addressSource.Landmark || addressSource.landmark;
    const area = addressSource.Area || addressSource.area;
    const city = addressSource.City || addressSource.city;
    const state = addressSource.State || addressSource.state;
    const pincode = addressSource.PinCode || addressSource.Pincode || addressSource.pincode || addressSource.Pin || addressSource.pin || addressSource.PIN;
    
    // Add components in order (same as ShowProducts)
    // but not shown in the assignComplaint code Page it only shows city so we need to change that code 
    // the complete address is there in the ShowProduct page but not in the assignComplaint page 

    if (landmark) parts.push(landmark);
    if (area) parts.push(area);
    if (address) parts.push(address);
    if (pincode) parts.push(pincode);
    if (city) parts.push(city);
    if (state) parts.push(state);
    
    // If no address components found, return city or N/A
    if (parts.length === 0) {
      return city || "N/A";
    }
    
    return parts.join(", ");
  }

  function resetFilters() {
    setFilters({
      callId: '',
      dateFrom: '',
      dateTo: '',
      zone: '',
      callType: '',
      mobile: '',
      dealer: '',
      technician: 'all',
      unAllocatedOnly: false,
      query: ''
    });
    setQuery('');
  }

  function applyFilters(items) {
    return items.filter((it) => {
      // Call Id
      if (filters.callId) {
        const cid = String(it.ComplaintId ?? '').toLowerCase();
        if (!cid.includes(filters.callId.toLowerCase())) return false;
      }
      
      // Date range from date - to date
      if (filters.dateFrom) {
        const from = new Date(filters.dateFrom);
        const created = new Date(it.CreatedAt || it.createdAt || it.CreatedOn || null);
        if (isNaN(created.getTime()) || created < from) return false;
      }
      if (filters.dateTo) {
        const to = new Date(filters.dateTo);
        const created = new Date(it.CreatedAt || it.createdAt || it.CreatedOn || null);
        if (isNaN(created.getTime()) || created > to) return false;
      }
      
      // Zone (match City)
      if (filters.zone) {
        const city = it.City || it.Customer?.City || '';
        if (!String(city).toLowerCase().includes(filters.zone.toLowerCase())) return false;
      }
      
      // Call Type
      if (filters.callType) {
        if (!String(it.CallStatus || it.CallType || '').toLowerCase().includes(filters.callType.toLowerCase())) return false;
      }
      
      // Mobile
      if (filters.mobile) {
        const mobile = it.MobileNo || it.Customer?.MobileNo || '';
        if (!String(mobile).includes(filters.mobile)) return false;
      }
      
      // Dealer / ASP/DSA
      if (filters.dealer) {
        if (!String(it.DealerName || it.Dealer || '').toLowerCase().includes(filters.dealer.toLowerCase())) return false;
      }
      
      // Technician
      if (filters.technician && filters.technician !== 'all') {
        const assignedId = it.AssignedTechnicianId ?? it.assignedTechnicianId ?? null;
        if (String(assignedId) !== String(filters.technician)) return false;
      }
      
      // Un-allocated only
      if (filters.unAllocatedOnly) {
        const assignedId = it.AssignedTechnicianId ?? it.assignedTechnicianId ?? null;
        if (assignedId) return false;
      }

      return true;
    });
  }

  const filtered = applyFilters(complaints || []);
  const notAllocatedCount = (filtered || []).filter((c) => !(c.AssignedTechnicianId ?? c.assignedTechnicianId)).length;

  const searched = filtered.filter((it) => {
    if (!query) return true;
    const q = query.toLowerCase();
    const customerName = it.CustomerName || it.Customer?.Name || '';
    const mobile = it.MobileNo || it.Customer?.MobileNo || '';
    const city = it.City || it.Customer?.City || '';
    
    return String(customerName).toLowerCase().includes(q)
      || String(mobile).toLowerCase().includes(q)
      || String(city).toLowerCase().includes(q)
      || String(it.ComplaintId || '').toLowerCase().includes(q);
  });

  async function handleAssignTechnician(complaintId, techId, force = false) {
    try {
      const result = await assignTechnician(complaintId, techId, force);
      if (result.success) {
        alert(result.data.message || 'Assigned Successfully');
        // Clear selected map
        setSelectedMap(p => ({ ...p, [complaintId]: '' }));
        // Refresh data after a short delay to let backend persist the change
        // But don't block on it - let the immediate state update be visible first
        setTimeout(() => {
          fetchData();
        }, 2000); // Wait 2 seconds before refreshing
      } else {
        alert('Assignment failed: ' + result.error);
      }
    } catch (err) {
      console.error('Assignment error:', err);
      alert('Assignment failed: ' + err.message);
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Call Management - Call Update - Allocation To Technician</h1>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <p className="font-bold">Error:</p>
          <p>{error}</p>
        </div>
      )}

      {/* Loading State */}
      {(complaintsLoading || techniciansLoading) && (
        <div className="mb-4 p-4 bg-blue-100 border border-blue-400 text-blue-700 rounded">
          <p>Loading data... {complaintsLoading && 'Complaints'} {techniciansLoading && 'Technicians'}</p>
        </div>
      )}

      {/* Technicians Status */}
      <div className="mb-4 p-3 bg-gray-100 rounded text-sm">
        <p>Technicians loaded: <strong>{technicians && technicians.length > 0 ? `${technicians.length} technicians` : 'No technicians found'}</strong></p>
        {techniciansError && <p className="text-red-600">Technicians Error: {techniciansError}</p>}
      </div>

      {/* Filters Section */}
      <AssignComplaintFilters
        filters={filters}
        onChange={onChange}
        resetFilters={resetFilters}
        fetchData={fetchData}
        notAllocatedCount={notAllocatedCount}
        technicians={technicians}
      />

      {/* Results Table */}
      <AssignComplaintTable
        searched={searched}
        technicians={technicians}
        selectedMap={selectedMap}
        setSelectedMap={setSelectedMap}
        handleAssignTechnician={handleAssignTechnician}
        formatAddress={formatAddress}
        reallocatedMap={reallocatedMap}
      />
    </div>
  );
}
