export const getProductGroupsApi = async () => {
  const token = localStorage.getItem('token');
  const response = await fetch('/api/products/groups', {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to fetch product groups');
  return await response.json();
};

export const getProductsByGroupApi = async (groupId) => {
  const token = localStorage.getItem('token');
  const response = await fetch(`/api/products/products/${groupId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to fetch products by group');
  return await response.json();
};

export const getModelsByProductApi = async (productId) => {
  const token = localStorage.getItem('token');
  const response = await fetch(`/api/products/models/${productId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to fetch models by product');
  return await response.json();
};

export const getServiceCentersApi = async () => {
  const token = localStorage.getItem('token');
  const response = await fetch('/api/servicecenter/all', {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to fetch service centers');
  return await response.json();
};

export const getUsersApi = async () => {
  const token = localStorage.getItem('token');
  const response = await fetch('/api/admin/users', {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to fetch users');
  return await response.json();
};

export const createReplacementRequestApi = async (replacementData) => {
  const token = localStorage.getItem('token');
  const response = await fetch('/api/spare-requests/replacement', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(replacementData)
  });
  if (!response.ok) throw new Error('Failed to create replacement request');
  return await response.json();
};

export const getReplacementHistoryApi = async (filters = {}) => {
  const token = localStorage.getItem('token');
  const params = new URLSearchParams(filters);
  const response = await fetch(`/api/spare-requests/replacement-history?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to fetch replacement history');
  return await response.json();
};