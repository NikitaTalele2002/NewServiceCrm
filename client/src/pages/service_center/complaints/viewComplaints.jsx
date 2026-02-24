import React, { useState, useEffect } from "react";
import { useRole } from '../../../context/RoleContext';
import Loader from '../../../components/Loader';
import { useViewComplaints } from '../../../hooks/useViewComplaints';
import ViewComplaintsTable from './components/ViewComplaintsTable';

export default function ViewComplaints() {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(5);

  const serviceCenterId = localStorage.getItem("serviceCenterId");

  const { role, isLoading } = useRole();
  const { complaints, technicians, loading, error, refetchComplaints } = useViewComplaints(role, role === 'service_center' ? serviceCenterId : null);

  // Auto-refresh data every 15 seconds to always show latest assignments
  useEffect(() => {
    const interval = setInterval(() => {
      refetchComplaints();
    }, 15000); // Refresh every 15 seconds
    
    return () => clearInterval(interval);
  }, [refetchComplaints]);

  if (isLoading) return <Loader />;

  // For admin: show all complaints; for service center: use pre-filtered data from API
  const displayComplaints = role === 'admin'
    ? (complaints || [])
    : (complaints || []); // Service center complaints are already filtered by API

  // Pagination logic
  const totalPages = Math.ceil(displayComplaints.length / pageSize);
  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = startIdx + pageSize;
  const paginatedComplaints = displayComplaints.slice(startIdx, endIdx);

  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  const handlePageChange = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  // Function to get technician name - now includes TechnicianName from backend
  const getTechnicianName = (complaint) => {
    if (!complaint) return 'Unknown';

    // TechnicianName now comes directly from the backend API
    if (complaint.TechnicianName && complaint.TechnicianName.trim()) {
      return complaint.TechnicianName;
    }

    // Fallback for older data or alternative field names
    if (complaint.AssignedTechnicianName && complaint.AssignedTechnicianName.trim()) {
      return complaint.AssignedTechnicianName;
    }

    // If still no name, check if there's a technician ID but no name
    const techId = complaint.AssignedTechnicianId ?? complaint.assignedTechnicianId;
    if (!techId) return 'Unassigned';

    // Last resort: try to find in technicians array (shouldn't be needed now)
    const tech = technicians.find(t => String(t.Id) === String(techId));
    if (tech) return tech.TechnicianName;

    // If we have a techId but can't find the name anywhere
    return `Tech #${techId}`;
  };

  // Safely resolve product name from various possible fields returned by different APIs
  const getProductName = (row) => {
    if (!row) return '-';
    return (
      row._product || row.Product || row.ProductName || row.ProductTitle || row.ProductDesc || row.ModelDescription || row.Brand || "-"
    );
  };

  // Safely resolve model name from various possible fields
  const getModelName = (row) => {
    if (!row) return '-';
    return (row._model || row.Model || row.ModelName || row.MODEL || row.ModelDescription || "-");
  };

  return (
    <div className="w-full min-h-screen bg-gray-50 p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          {role === 'admin' ? 'All Complaints (Admin View)' : 'Service Center Complaints'}
        </h1>
        <p className="text-gray-600">
          {role === 'admin'
            ? `Viewing all complaints from all service centers`
            : `Viewing complaints assigned to your service center`}
        </p>
      </div>

      {loading && <div className="text-center py-8"><p className="text-lg text-blue-600">Loading complaints...</p></div>}
      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

      <ViewComplaintsTable
        role={role}
        displayComplaints={displayComplaints}
        paginatedComplaints={paginatedComplaints}
        startIdx={startIdx}
        endIdx={endIdx}
        currentPage={currentPage}
        totalPages={totalPages}
        handlePrevPage={handlePrevPage}
        handleNextPage={handleNextPage}
        handlePageChange={handlePageChange}
        getTechnicianName={getTechnicianName}
        getProductName={getProductName}
        getModelName={getModelName}
      />
    </div>
  );
}