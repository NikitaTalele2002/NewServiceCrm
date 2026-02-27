import { getApiUrl } from '../config/apiConfig';

export const createComplaintApi = async (complaintData) => {
  const token = localStorage.getItem('token');
  const response = await fetch(getApiUrl('/complaints'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(complaintData)
  });
  if (!response.ok) throw new Error('Failed to create complaint');
  return await response.json();
};

export const searchComplaintsApi = async (searchParams) => {
  const token = localStorage.getItem('token');
  const params = new URLSearchParams(searchParams);
  const response = await fetch(getApiUrl(`/complaints/search?${params.toString()}`), {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to search complaints');
  return await response.json();
};

export const getComplaintByIdApi = async (complaintId) => {
  const token = localStorage.getItem('token');
  const response = await fetch(getApiUrl(`/complaints/${complaintId}`), {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to fetch complaint');
  return await response.json();
};

export const updateComplaintApi = async (complaintId, updateData) => {
  const token = localStorage.getItem('token');
  const response = await fetch(getApiUrl(`/complaints/${complaintId}`), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(updateData)
  });
  if (!response.ok) throw new Error('Failed to update complaint');
  return await response.json();
};

export const getComplaintsApi = async (centerId) => {
  const token = localStorage.getItem('token');
  
  // If centerId is provided, use the service center specific endpoint
  if (centerId) {
    const response = await fetch(getApiUrl(`/call-center/complaints/by-service-center/${encodeURIComponent(centerId)}`), {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch complaints for service center');
    const data = await response.json();
    // Return complaints in a format compatible with existing code
    return {
      complaints: data.complaints || [],
      rows: data.complaints || []
    };
  }
  
  // For admin, fetch all complaints from the general endpoint (now with Sequelize)
  const response = await fetch(getApiUrl('/complaints'), {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to fetch complaints');
  const data = await response.json();
  
  // Handle both old raw SQL format and new Sequelize format
  return {
    complaints: data.complaints || data.rows || data.data || [],
    rows: data.complaints || data.rows || data.data || [],
    success: data.success || true
  };
};

export const assignTechnicianApi = async (complaintId, technicianId, assignmentReason = null) => {
  const token = localStorage.getItem('token');
  const response = await fetch(getApiUrl('/complaints/assign-technician'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ 
      complaintId, 
      technicianId: Number(technicianId), 
      assignmentReason: assignmentReason || null 
    })
  });
  if (!response.ok) throw new Error('Failed to assign technician');
  return await response.json();
};

export const getAllocationHistoryApi = async (complaintId) => {
  const token = localStorage.getItem('token');
  const response = await fetch(getApiUrl(`/complaints/${complaintId}/allocation-history`), {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to fetch allocation history');
  return await response.json();
};