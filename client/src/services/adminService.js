import { getApiUrl } from '../config/apiConfig';

export const adminLoginApi = async (loginData) => {
  const response = await fetch(getApiUrl('/admin/login'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(loginData)
  });
  if (!response.ok) throw new Error('Login failed');
  return await response.json();
};

export const adminRegisterApi = async (registerData) => {
  const response = await fetch(getApiUrl('/admin/register'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(registerData)
  });
  if (!response.ok) throw new Error('Registration failed');
  return await response.json();
};

export const getAdminProfileApi = async () => {
  const token = localStorage.getItem('token');
  const response = await fetch(getApiUrl('/admin/profile'), {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to fetch profile');
  return await response.json();
};

export const getAllAdminsApi = async () => {
  const token = localStorage.getItem('token');
  const response = await fetch(getApiUrl('/admin/all'), {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to fetch admins');
  return await response.json();
};

export const getServiceCentersApi = async () => {
  const token = localStorage.getItem('token');
  const response = await fetch(getApiUrl('/admin/service-centres'), {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to fetch service centers');
  return await response.json();
};

export const createServiceCenterApi = async (serviceCenterData) => {
  const token = localStorage.getItem('token');
  const response = await fetch(getApiUrl('/admin/service-centres'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(serviceCenterData)
  });
  if (!response.ok) throw new Error('Failed to create service center');
  return await response.json();
};

export const searchMasterDataApi = async (type, query) => {
  const token = localStorage.getItem('token');
  const params = new URLSearchParams({ type, q: query });
  const response = await fetch(getApiUrl(`/admin/search-master?${params.toString()}`), {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Search failed');
  return await response.json();
};