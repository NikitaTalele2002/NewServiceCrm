export const getServiceCenterInventoryApi = async () => {
  const token = localStorage.getItem('token');
  const response = await fetch('/api/branch/sc/inventory', {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to fetch service center inventory');
  return await response.json();
};

export const getServiceCenterRequestsApi = async () => {
  const token = localStorage.getItem('token');
  const response = await fetch('/api/branch/sc/requests', {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to fetch service center requests');
  const data = await response.json();
  return data.requests || data; // Handle both { requests: [...] } and direct array formats
};

export const createBranchRequestApi = async (requestData) => {
  const token = localStorage.getItem('token');
  const response = await fetch('/api/branch/requests/create', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestData)
  });
  if (!response.ok) throw new Error('Failed to create branch request');
  return await response.json();
};

export const getTechnicianInventoryApi = async (technicianId) => {
  const token = localStorage.getItem('token');
  const response = await fetch(`/api/technicians/${technicianId}/inventory`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to fetch technician inventory');
  return await response.json();
};

export const getTechniciansByCentreApi = async (centerId) => {
  const token = localStorage.getItem('token');
  const params = centerId ? `?centerId=${encodeURIComponent(centerId)}` : '';
  console.log('🔌 Calling technicians API (serviceCenterService):', `/api/technicians/by-centre${params}`);
  
  try {
    const response = await fetch(`/api/technicians/by-centre${params}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('📊 API Response status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error response:', errorText);
      throw new Error(`Failed to fetch technicians by centre - ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    console.log('✅ API Response data:', data);
    return data;
  } catch (err) {
    console.error('❌ Technicians API error:', err.message);
    throw err;
  }
};