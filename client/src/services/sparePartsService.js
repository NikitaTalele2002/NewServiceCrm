import { getApiUrl } from '../config/apiConfig';

// Use the products API for spares by product
// Accepts productId and optional modelId
export const getSparePartsByProductApi = async (productId, modelId) => {
  const token = localStorage.getItem('token');
  let url = getApiUrl(`/products/spares/product/${productId}`);
  if (modelId) {
    url += `?modelId=${modelId}`;
  }
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to fetch spare parts for product');
  return await response.json();
};


// Deprecated: getSparePartsByFiltersApi (not used)

export const createSpareReturnRequestApi = async (returnData) => {
  const token = localStorage.getItem('token');
  const response = await fetch(getApiUrl('/spare-parts/return-request'), {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(returnData)
  });
  if (!response.ok) throw new Error('Failed to create spare return request');
  return await response.json();
};

export const getSpareInventoryApi = async (centerId) => {
  const token = localStorage.getItem('token');
  const params = centerId ? `?centerId=${centerId}` : '';
  const response = await fetch(getApiUrl(`/spare-parts/inventory${params}`), {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to fetch spare inventory');
  return await response.json();
};