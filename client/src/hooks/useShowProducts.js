import { useState, useEffect, useCallback } from 'react';
import { useProducts } from './useProducts';

export const useShowProducts = (initialCustomer) => {
  // State management
  const [filters, setFilters] = useState({
    Brand: '',
    ProductGroup: '',
    ProductName: '',
    Model: '',
    ProductSerialNo: '',
  });

  const [rows, setRows] = useState([]);

  // API hooks
  const {
    productGroups,
    loading,
    error,
    searchProducts,
    getProductsByPhone,
    getProductGroups,
  } = useProducts();

  // Helper: Normalize product group names from master data
  const findProductGroupName = useCallback((pg) => {
    if (pg === null || pg === undefined) return '';

    let s = String(pg).trim();
    if (!s) return '';
    if (/^\d+\.0+$/.test(s)) {
      s = s.replace(/\.0+$/, '');
    }

    const norm = (v) => (v === null || v === undefined) ? '' : String(v).trim();

    // Try strict id/value matches first
    const byId = productGroups.find((g) => {
      const gIds = [
        g.Id,
        g.id,
        g.VALUE,
        g.Value,
        g.value,
        g.ProductGroupID,
        g.ProductGroupId,
        g.ProductGroup,
      ];
      return gIds.some((x) => {
        if (x === null || x === undefined) return false;
        const xs = norm(x);
        if (!xs) return false;
        if (xs === s) return true;
        if (!isNaN(Number(xs)) && !isNaN(Number(s)) && Number(xs) === Number(s)) return true;
        return false;
      });
    });
    if (byId)
      return (
        byId.DESCRIPTION ?? byId.Description ?? byId.Name ?? byId.ProductGroup ?? String(pg)
      );

    // Try matching by description/name (case-insensitive)
    const lower = s.toLowerCase();
    const byDesc = productGroups.find((g) => {
      const cand = (g.Name || g.ProductGroup || g.Description || g.DESCRIPTION || g.Value || g.VALUE || '') + '';
      return cand.toLowerCase().trim() === lower;
    });
    if (byDesc)
      return (
        byDesc.DESCRIPTION ?? byDesc.Description ?? byDesc.Name ?? byDesc.ProductGroup ?? String(pg)
      );

    return s;
  }, [productGroups]);

  // Helper: Normalize product row with group name and model name
  const normalizeRow = useCallback(
    (p) => {
      try {
        const copy = { ...p };
        const rawPg =
          copy.ProductGroup ??
          copy.ProductGroupID ??
          copy.ProductGroupId ??
          copy.ParentId ??
          copy.Parent_I ??
          copy.groupId ??
          copy.ProductGroupName;
        copy.ProductGroupName = findProductGroupName(rawPg) || String(rawPg || '');
        copy.ModelName = copy.Model || copy.ModelDescription || copy.MODEL || '';
        return copy;
      } catch (e) {
        return p;
      }
    },
    [findProductGroupName]
  );

  // Load product groups on mount
  useEffect(() => {
    let mounted = true;
    (async function loadGroups() {
      try {
        const result = await getProductGroups();
        if (!result.success && mounted) {
          console.warn('Failed to load product groups');
        }
      } catch (e) {
        console.warn('Failed to load product groups', e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [getProductGroups]);

  // Re-normalize rows when product groups load
  useEffect(() => {
    if (!productGroups || productGroups.length === 0) return;
    if (!rows || rows.length === 0) return;
    try {
      setRows((prev) => (Array.isArray(prev) ? prev.map(normalizeRow) : prev));
    } catch (e) {
      // ignore
    }
  }, [productGroups, normalizeRow]);

  // Fetch products by phone on mount if customer provided
  useEffect(() => {
    if (initialCustomer && initialCustomer.MobileNo) {
      fetchProductsByPhoneHandler(initialCustomer.MobileNo);
    }
  }, [initialCustomer]);

  // Handlers
  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleSearch = async () => {
    try {
      const result = await searchProducts(filters);
      if (result.success) {
        const rawRows = result.data.rows || result.data || [];
        setRows(Array.isArray(rawRows) ? rawRows.map(normalizeRow) : []);
      } else {
        setRows([]);
        alert(result.error || 'Failed to search products');
      }
    } catch (error) {
      console.error('Error searching:', error);
      alert('Something went wrong while searching');
      setRows([]);
    }
  };

  const handleClearFilters = () => {
    setFilters({
      Brand: '',
      ProductGroup: '',
      ProductName: '',
      Model: '',
      ProductSerialNo: '',
    });
    setRows([]);
  };

  const fetchProductsByPhoneHandler = async (phone) => {
    if (!phone) return;
    try {
      const result = await getProductsByPhone(phone);
      if (result.success) {
        const rawRows = result.data.rows || result.data || [];
        setRows(Array.isArray(rawRows) ? rawRows.map(normalizeRow) : []);
      } else {
        setRows([]);
      }
    } catch (error) {
      console.error('Error fetching products by phone:', error);
      alert('Something went wrong while fetching products');
      setRows([]);
    }
  };

  return {
    // State
    filters,
    rows,
    loading,
    error,
    productGroups,

    // Handlers
    handleFilterChange,
    handleSearch,
    handleClearFilters,
    fetchProductsByPhoneHandler,
  };
};
