import { getApiUrl } from '../config/apiConfig';

export const getBranchDashboardApi = async () => {
  const token = localStorage.getItem('token');
  try {
    const response = await fetch(getApiUrl('/branch/dashboard'), {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      console.error('Branch dashboard API error:', response.status);
      throw new Error('Failed to fetch dashboard');
    }
    return await response.json();
  } catch (error) {
    console.error('Branch dashboard fetch error:', error);
    return {};
  }
};

export const getBranchesApi = async () => {
  const token = localStorage.getItem('token');
  try {
    const response = await fetch(getApiUrl('/branch/branches'), {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      console.error('Branches API error:', response.status);
      throw new Error(`Failed to fetch branches: ${response.status}`);
    }
    const data = await response.json();
    // Transform to match expected format (Id -> id, BranchName -> label)
    return Array.isArray(data) ? data.map(branch => ({
      id: branch.Id,
      label: branch.BranchName,
      ...branch
    })) : [];
  } catch (error) {
    console.error('Branches API fetch error:', error);
    return [];
  }
};

export const getRsmBranchesApi = async () => {
  const token = localStorage.getItem('token');
  try {
    const response = await fetch(getApiUrl('/branch/rsm-branches'), {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      console.error('RSM branches API error:', response.status);
      throw new Error(`Failed to fetch RSM branches: ${response.status}`);
    }
    const data = await response.json();
    // Transform to match expected format (Id -> id, BranchName -> label)
    return Array.isArray(data) ? data.map(branch => ({
      id: branch.Id,
      label: branch.BranchName,
      ...branch
    })) : [];
  } catch (error) {
    console.error('RSM branches API fetch error:', error);
    return [];
  }
};

export const getServiceCentersByBranchApi = async (branchId) => {
  const token = localStorage.getItem('token');
  try {
    const response = await fetch(getApiUrl(`/branch/service-centers?branchId=${branchId}`), {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      console.error('Service centers API error:', response.status);
      throw new Error(`Failed to fetch service centers: ${response.status}`);
    }
    const data = await response.json();
    // Transform to match expected format (Id -> id, CenterName -> label)
    return Array.isArray(data) ? data.map(sc => ({
      id: sc.Id,
      label: sc.CenterName,
      ...sc
    })) : [];
  } catch (error) {
    console.error('Service centers API fetch error:', error);
    return [];
  }
};

export const getBranchRequestsApi = async () => {
  const token = localStorage.getItem('token');
  const response = await fetch(getApiUrl('/branch/requests'), {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to fetch branch requests');
  return await response.json();
};

export const approveBranchRequestApi = async (requestId) => {
  const token = localStorage.getItem('token');
  const response = await fetch(getApiUrl(`/branch/requests/${requestId}/approve`), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to approve request');
  return await response.json();
};

export const getBranchInventoryApi = async () => {
  const token = localStorage.getItem('token');
  const response = await fetch(getApiUrl('/branch/inventory'), {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to fetch branch inventory');
  return await response.json();
};

export const adjustBranchInventoryApi = async (adjustData) => {
  const token = localStorage.getItem('token');
  const response = await fetch(getApiUrl('/branch/inventory/adjust'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(adjustData)
  });
  if (!response.ok) throw new Error('Failed to adjust inventory');
  return await response.json();
};

export const getBranchReturnRequestsApi = async () => {
  const token = localStorage.getItem('token');
  try {
    const response = await fetch(getApiUrl('/returns/branch-requests'), {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      console.error('Branch return requests API error:', response.status, response.statusText);
      throw new Error(`Failed to fetch return requests: ${response.status}`);
    }
    const data = await response.json();
    return data || [];
  } catch (error) {
    console.error('Branch return requests API fetch error:', error);
    return [];
  }
};

export const getBranchReturnRequestDetailsApi = async (requestId) => {
  const token = localStorage.getItem('token');
  const response = await fetch(getApiUrl(`/branch/branch-requests/${requestId}/details`), {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to fetch request details');
  return await response.json();
};

export const createSpareRequestApi = async (requestData) => {
  const token = localStorage.getItem('token');
  const response = await fetch(getApiUrl('/branch/spare-requests'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(requestData)
  });
  if (!response.ok) throw new Error('Failed to create spare request');
  return await response.json();
};