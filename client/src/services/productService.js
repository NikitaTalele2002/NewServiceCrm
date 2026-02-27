import { getApiUrl } from '../config/apiConfig';

const API_BASE = getApiUrl('');

// Helper to safely parse various ID formats from API responses
const parseId = (v) => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') return String(Number.isInteger(v) ? v : Math.trunc(v));
  const s = String(v).trim();
  if (!s) return '';
  return s.replace(/\.0+$/, '');
};

// Helper to safely determine rows array from API response
const getRows = (data) => {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.rows)) return data.rows;
  return [];
};

// Get auth headers from localStorage token
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const productService = {
  // Fetch product groups
  async getProductGroups() {
    try {
      const res = await fetch(`${API_BASE}/admin/master-data?type=productgroup`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      return getRows(data);
    } catch (err) {
      console.error('Failed to load product groups', err);
      return [];
    }
  },

  // Fetch products and filter by group
  async getProductsByGroup(groupId) {
    if (!groupId) return [];
    try {
      const res = await fetch(`${API_BASE}/admin/master-data?type=product`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      const rows = getRows(data);

      const normalized = rows.map((r) => ({
        ...r,
        ID: r.ID ?? r.Id ?? r.id ?? null,
        id: r.ID ?? r.Id ?? r.id ?? null,
        ProductGroupID: parseId(
          r.ProductGroupID ?? r.Product_group_ID ?? r.PRODUCT_GROUP_ID ?? r.groupId ?? r.Parent_I ?? r.parent_id ?? r.PARENT_ID ?? r.ParentId ?? null
        ),
      }));

      return normalized.filter((r) => String(r.ProductGroupID) === String(groupId));
    } catch (err) {
      console.error('Failed to load products', err);
      return [];
    }
  },

  // Fetch models and filter by product
  async getModelsByProduct(productId) {
    if (!productId) return [];
    try {
      const res = await fetch(`${API_BASE}/admin/master-data?type=models`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      const rows = getRows(data);

      const normalized = rows.map((r) => ({
        ...r,
        Id: r.Id ?? r.ID ?? r.id ?? null,
        id: r.Id ?? r.ID ?? r.id ?? null,
        ProductID: parseId(r.ProductID ?? r.Product ?? r.PRODUCT ?? r.ProductID ?? null),
        MODEL_CODE: r.MODEL_CODE ?? r.ModelCode ?? r.Model_Code ?? r.model_code ?? r.MODEL ?? r.model ?? r.Value ?? null,
      }));

      return normalized.filter((m) => String(m.ProductID) === String(productId));
    } catch (err) {
      console.error('Failed to load models', err);
      return [];
    }
  },

  // Register/submit product
  async registerProduct(payload) {
    try {
      const res = await fetch(`${API_BASE}/products/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to register product');
      return { success: true, data: await res.json() };
    } catch (err) {
      console.error('Product registration error:', err);
      return { success: false, error: err.message };
    }
  },
};
