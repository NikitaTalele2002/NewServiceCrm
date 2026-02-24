const API_BASE = import.meta.env.VITE_API_BASE || '';

function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getProductGroupsApi() {
  try {
    const res = await fetch(`${API_BASE}/api/admin/master-data?type=productgroup`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to load product groups');
    const data = await res.json();
    const groups = data.rows || data.data || data;
    return Array.isArray(groups) ? groups : [];
  } catch (err) {
    console.error('Error fetching product groups:', err);
    return [];
  }
}

export async function getProductsByGroupApi(groupId) {
  if (!groupId) return [];
  try {
    const res = await fetch(`${API_BASE}/api/admin/master-data?type=product`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to load products');
    const data = await res.json();
    const products = data.rows || data.data || data;
    if (!Array.isArray(products)) return [];

    // Convert groupId to number to match ProductGroupID
    const groupIdNum = parseInt(groupId, 10);
    const groupIdStr = String(groupId).toLowerCase();
    
    return products.filter(p => {
      // Try numeric match on ProductGroupID first
      const pgid = p.ProductGroupID || p.ProductGroupId || p.GROUP_ID;
      if (pgid !== undefined && parseInt(pgid, 10) === groupIdNum) return true;
      
      // Fallback: try text matching on VALUE or other group fields
      const fields = [p.ProductGroup, p.GroupCode, p.VALUE, p.Value];
      return fields.some(f => f && String(f).toLowerCase() === groupIdStr);
    });
  } catch (err) {
    console.error('Error fetching products:', err);
    return [];
  }
}

export async function getSparesByGroupApi(groupId) {
  if (!groupId) return [];
  try {
    const res = await fetch(`${API_BASE}/api/products/spares/group/${groupId}`, { headers: authHeaders() });
    if (res.ok) {
      const data = await res.json();
      return Array.isArray(data) ? data : (data.data || data.rows || []);
    }
    return [];
  } catch (err) {
    console.warn('Error fetching spares by group:', err);
    return [];
  }
}

export async function getModelsByProductApi(productId) {
  if (!productId) return [];
  try {
    const res = await fetch(`${API_BASE}/api/admin/master-data?type=model`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to load models');
    const data = await res.json();
    const models = data.rows || data.data || data;
    if (!Array.isArray(models)) return [];
    
    // Convert productId to number to match ProductID or Product field
    const productIdNum = parseInt(productId, 10);
    const productIdStr = String(productId).toLowerCase();
    
    return models.filter(m => {
      // Try numeric match first
      const pid = m.ProductID || m.Product || m.PRODUCT;
      if (pid !== undefined && parseInt(pid, 10) === productIdNum) return true;
      
      // Fallback: try text matching
      const fields = [m.ProductCode, m.VALUE, m.Value];
      return fields.some(f => f && String(f).toLowerCase() === productIdStr);
    });
  } catch (err) {
    console.error('Error fetching models:', err);
    return [];
  }
}

export async function getSparesByProductApi(productId) {
  if (!productId) return [];
  try {
    const res = await fetch(`${API_BASE}/api/products/spares/product/${productId}`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to load spares for product');
    const data = await res.json();
    return Array.isArray(data) ? data : (data.data || data.rows || []);
  } catch (err) {
    console.error('Error fetching spares for product:', err);
    return [];
  }
}

export async function getSparesByModelApi(modelId) {
  if (!modelId) return [];
  try {
    const res = await fetch(`${API_BASE}/api/products/spares/model/${modelId}`, { headers: authHeaders() });
    if (res.ok) {
      const data = await res.json();
      return Array.isArray(data) ? data : (data.data || data.rows || []);
    }
    const fallback = await fetch(`${API_BASE}/api/admin/master-data?type=spare`, { headers: authHeaders() });
    if (!fallback.ok) return [];
    const fd = await fallback.json();
    const spares = fd.rows || fd.data || fd;
    if (!Array.isArray(spares)) return [];
    return spares.filter(s => String(s.ModelID || s.Model || '').toLowerCase() === String(modelId).toLowerCase());
  } catch (err) {
    console.warn('Error fetching spares by model:', err);
    return [];
  }
}

export async function getServiceCenterInventoryApi() {
  try {
    const res = await fetch(`${API_BASE}/api/service-center/current-inventory`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to load service center inventory');
    const data = await res.json();
    // The backend returns { ok: true, inventory: [...] }
    if (data && data.ok && Array.isArray(data.inventory)) return data.inventory;
    return [];
  } catch (err) {
    console.error('Error fetching service center inventory:', err);
    return [];
  }
}

export async function getServiceInventoryApi() {
  try {
    const res = await fetch(`${API_BASE}/api/service-center/current-inventory`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to load service center inventory');
    const data = await res.json();
    if (data && data.ok && Array.isArray(data.inventory)) return data.inventory;
    return [];
  } catch (err) {
    console.error('Error fetching service center inventory:', err);
    return [];
  }
}

export async function getInventoryBySkuApi(sku) {
  if (!sku) return null;
  try {
    const res = await fetch(`${API_BASE}/api/products/inventory?sku=${encodeURIComponent(sku)}`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to load inventory by sku');
    return res.json();
  } catch (err) {
    console.error('Error fetching inventory by sku:', err);
    return null;
  }
}

export async function getTechnicianInventoryApi(technicianId) {
  if (!technicianId) return [];
  try {
    const res = await fetch(`${API_BASE}/api/spare-requests/technicians/inventory?technician=${technicianId}`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to load technician inventory');
    return res.json();
  } catch (err) {
    console.error('Error fetching technician inventory:', err);
    return [];
  }
}

export default {
  getProductGroupsApi,
  getProductsByGroupApi,
  getSparesByGroupApi,
  getModelsByProductApi,
  getSparesByProductApi,
  getSparesByModelApi,
  getServiceCenterInventoryApi,
  getServiceInventoryApi,
  getInventoryBySkuApi,
  getTechnicianInventoryApi,
};
