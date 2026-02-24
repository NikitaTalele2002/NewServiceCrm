export const fetchTechniciansApi = async () => {
  const token = localStorage.getItem('token');

  const response = await fetch('/api/technician-status-requests/technicians', {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok) throw new Error('Failed to fetch technicians');
  return await response.json();
};

export const addTechnicianRequestApi = async (technicianData) => {
  const token = localStorage.getItem('token');

  const response = await fetch('/api/technician-status-requests', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      requestType: 'add',
      technicianName: technicianData.name,
      technicianMobile: technicianData.mobile,
      technicianEmail: technicianData.email,
      notes: technicianData.notes
    })
  });

  if (!response.ok) throw new Error('Failed to submit request');
  return await response.json();
};

export const getTechniciansByCentreApi = async (centerId) => {
  const token = localStorage.getItem('token');
  const params = centerId ? `?centerId=${encodeURIComponent(centerId)}` : '';
  console.log('🔌 Calling technicians API:', `/api/technicians/by-centre${params}`);
  
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
    console.log('✅ API Raw Response:', data);
    console.log('   → Response type:', typeof data);
    console.log('   → Response keys:', Object.keys(data));
    console.log('   → data.technicians type:', Array.isArray(data.technicians) ? 'Array' : typeof data.technicians);
    console.log('   → data.technicians length:', Array.isArray(data.technicians) ? data.technicians.length : 'N/A');
    console.log('   → Full data object:', JSON.stringify(data, null, 2));
    
    return data;
  } catch (err) {
    console.error('❌ Technicians API error:', err.message);
    throw err;
  }
};