import { getApiUrl } from '../config/apiConfig';

export const searchProductsApi = async (searchParams) => {
  const token = localStorage.getItem('token');
  const params = new URLSearchParams(searchParams);
  const response = await fetch(getApiUrl(`/products/search?${params.toString()}`), {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to search products');
  return await response.json();
};

export const getProductsByPhoneApi = async (phone) => {
  const token = localStorage.getItem('token');
  const response = await fetch(getApiUrl(`/products/by-phone/${encodeURIComponent(phone)}`), {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to fetch products by phone');
  return await response.json();
};

export const getProductGroupsApi = async () => {
  const token = localStorage.getItem('token');
  const response = await fetch(getApiUrl('/admin/master-data?type=productgroup'), {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to fetch product groups');
  const data = await response.json();
  return data.rows || data || [];
};

export const getProductsApi = async () => {
  const token = localStorage.getItem('token');
  const response = await fetch(getApiUrl('/admin/master-data?type=product'), {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to fetch products');
  const data = await response.json();
  return data.rows || data || [];
};

export const getModelsApi = async () => {
  const token = localStorage.getItem('token');
  const response = await fetch(getApiUrl('/admin/master-data?type=model'), {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to fetch models');
  const data = await response.json();
  return data.rows || data || [];
};

export const searchCustomersApi = async (searchParams) => {
  const token = localStorage.getItem('token');
  const params = new URLSearchParams(searchParams);
  const response = await fetch(getApiUrl(`/customers/search?${params.toString()}`), {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to search customers');
  return await response.json();
};

export const assignServiceCentreApi = async (assignmentData) => {
  const token = localStorage.getItem('token');
  const response = await fetch(getApiUrl('/assign-service-centre'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(assignmentData)
  });
  if (!response.ok) throw new Error('Failed to assign service centre');
  return await response.json();
};

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

export const getInventoryApi = async (filters = {}) => {
  const token = localStorage.getItem('token');
  const params = new URLSearchParams();

  if (filters.productGroup) params.append('productGroup', filters.productGroup);
  if (filters.productType) params.append('productType', filters.productType);
  if (filters.model) params.append('model', filters.model);

  const response = await fetch(getApiUrl(`/inventory/current?${params.toString()}`), {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to fetch inventory');
  return await response.json();
};
