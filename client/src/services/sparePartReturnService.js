const API_BASE = '/api/returns';

export const sparePartReturnService = {
  // Get distinct product groups in service center inventory
  getGroups: async (centerId, token) => {
    const response = await fetch(`${API_BASE}/service-centers/${centerId}/inventory/groups`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch groups');
    return response.json();
  },

  // Get distinct products in service center inventory for a group
  getProducts: async (centerId, group, token) => {
    const response = await fetch(`${API_BASE}/service-centers/${centerId}/inventory/products?group=${encodeURIComponent(group)}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch products');
    return response.json();
  },

  // Get distinct models in service center inventory for a product
  getModels: async (centerId, product, token) => {
    const response = await fetch(`${API_BASE}/service-centers/${centerId}/inventory/models?product=${encodeURIComponent(product)}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch models');
    return response.json();
  },

  // Get distinct spares in service center inventory for a model
  getSpares: async (centerId, model, token) => {
    const response = await fetch(`${API_BASE}/service-centers/${centerId}/inventory/spares?model=${encodeURIComponent(model)}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch spares');
    return response.json();
  },

  // Get service center inventory filtered
  getInventory: async (centerId, filters, token) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
    const response = await fetch(`${API_BASE}/service-centers/${centerId}/inventory?${params}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch inventory');
    return response.json();
  },

  // Get FIFO invoice information for spares in cart
  getFIFOInvoices: async (spareIds, token) => {
    const spareIdString = spareIds.join(',');
    const response = await fetch(`${API_BASE}/fifo-invoices?spareIds=${spareIdString}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch FIFO invoices');
    return response.json();
  },

  // Submit return request
  submitReturnRequest: async (returnType, items, token) => {
    const response = await fetch(`${API_BASE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ returnType, items })
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to submit request');
    }
    return response.json();
  }
};