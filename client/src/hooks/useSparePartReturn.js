import { useState, useEffect } from 'react';
import { sparePartReturnService } from '../services/sparePartReturnService';

export const useSparePartReturn = () => {
  const [returnType, setReturnType] = useState('');
  const [productGroup, setProductGroup] = useState('');
  const [product, setProduct] = useState('');
  const [model, setModel] = useState('');
  const [sparePart, setSparePart] = useState('');
  const [groups, setGroups] = useState([]);
  const [products, setProducts] = useState([]);
  const [models, setModels] = useState([]);
  const [spares, setSpares] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [cart, setCart] = useState([]);
  const [cartInvoices, setCartInvoices] = useState({});  // NEW: Store invoice data per spare
  const [selectedItems, setSelectedItems] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getCenterId = () => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.centerId;
    } catch (e) {
      console.error('Error decoding token:', e);
      return null;
    }
  };

  const centerId = getCenterId();
  const token = localStorage.getItem('token');

  const fetchGroups = async () => {
    if (!centerId || !token) return;
    try {
      setError(null);
      const data = await sparePartReturnService.getGroups(centerId, token);
      setGroups(data);
    } catch (error) {
      console.error('Error fetching groups:', error);
      setError('Failed to fetch groups');
    }
  };

  const fetchProducts = async () => {
    if (!centerId || !token || !productGroup) return;
    try {
      setError(null);
      const data = await sparePartReturnService.getProducts(centerId, productGroup, token);
      setProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
      setError('Failed to fetch products');
    }
  };

  const fetchModels = async () => {
    if (!centerId || !token || !product) return;
    try {
      setError(null);
      const data = await sparePartReturnService.getModels(centerId, product, token);
      setModels(data);
    } catch (error) {
      console.error('Error fetching models:', error);
      setError('Failed to fetch models');
    }
  };

  const fetchSpares = async () => {
    if (!centerId || !token || !model) return;
    try {
      setError(null);
      const data = await sparePartReturnService.getSpares(centerId, model, token);
      setSpares(data);
    } catch (error) {
      console.error('Error fetching spares:', error);
      setError('Failed to fetch spares');
    }
  };

  const fetchInventory = async () => {
    if (!centerId || !token) return;
    setLoading(true);
    try {
      setError(null);
      const filters = { group: productGroup, product, model, spare: sparePart };
      const data = await sparePartReturnService.getInventory(centerId, filters, token);
      setInventory(data);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      setError('Failed to fetch inventory');
    }
    setLoading(false);
  };

  const handleSelectItem = (sku, checked) => {
    setSelectedItems(prev => ({
      ...prev,
      [sku]: checked ? { returnQty: 0 } : undefined
    }));
  };

  const handleReturnQtyChange = (sku, qty) => {
    setSelectedItems(prev => ({
      ...prev,
      [sku]: {
        ...prev[sku],
        returnQty: parseInt(qty) || 0
      }
    }));
  };

  const addToCart = () => {
    const itemsToAdd = inventory.filter(item => selectedItems[item.sku] && selectedItems[item.sku].returnQty > 0);
    setCart(prev => [...prev, ...itemsToAdd.map(item => ({
      ...item,
      returnQty: selectedItems[item.sku].returnQty,
      // Ensure spare_id is set for FIFO invoice matching
      spare_id: item.spare_id || item.Id || item.id
    }))]);
    setSelectedItems({});
  };

  const removeFromCart = (index) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  // NEW: Fetch FIFO invoices for items in cart
  const fetchCartInvoices = async () => {
    if (cart.length === 0) {
      setCartInvoices({});
      return;
    }

    try {
      // Extract spare IDs from cart items - try multiple possible field names
      const spareIds = [];
      const spareIdMap = {};
      
      cart.forEach(item => {
        // Try to find spare ID in various possible field names
        const spareId = item.spare_id || item.Id || item.id || item.spareId;
        if (spareId) {
          spareIds.push(spareId);
          spareIdMap[spareId] = item;
        }
      });

      if (spareIds.length === 0) {
        console.warn('⚠️  No spare IDs found in cart items');
        return;
      }

      console.log('📦 Fetching FIFO invoices for cart spare IDs:', spareIds);
      const response = await sparePartReturnService.getFIFOInvoices(spareIds, token);
      
      if (response.success && response.data) {
        console.log('✅ FIFO invoices fetched:', response.data);
        setCartInvoices(response.data);
      }
    } catch (error) {
      console.error('⚠️  Error fetching cart invoices:', error);
      // Don't set error here - just log it, as this is supplementary data
    }
  };

  const submitRequest = async () => {
    if (cart.length === 0) {
      setError('Cart is empty');
      return;
    }
    if (!returnType) {
      setError('Please select a return type');
      return;
    }
    try {
      setError(null);
      await sparePartReturnService.submitReturnRequest(returnType, cart, token);
      setCart([]);
      setReturnType('');
      setProductGroup('');
      setProduct('');
      setModel('');
      setSparePart('');
      setProducts([]);
      setModels([]);
      setSpares([]);
      setInventory([]);
      setSelectedItems({});
    } catch (error) {
      console.error('Error submitting request:', error);
      setError(error.message);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  useEffect(() => {
    if (productGroup) {
      fetchProducts();
    } else {
      setProducts([]);
      setProduct('');
    }
  }, [productGroup]);

  useEffect(() => {
    if (product) {
      fetchModels();
    } else {
      setModels([]);
      setModel('');
    }
  }, [product]);

  useEffect(() => {
    if (model) {
      fetchSpares();
    } else {
      setSpares([]);
      setSparePart('');
    }
  }, [model]);

  useEffect(() => {
    if (productGroup || product || model || sparePart) {
      fetchInventory();
    } else {
      setInventory([]);
    }
  }, [productGroup, product, model, sparePart]);

  // NEW: Fetch FIFO invoices whenever cart changes
  useEffect(() => {
    fetchCartInvoices();
  }, [cart]);

  return {
    // State
    returnType,
    setReturnType,
    productGroup,
    setProductGroup,
    product,
    setProduct,
    model,
    setModel,
    sparePart,
    setSparePart,
    groups,
    products,
    models,
    spares,
    inventory,
    cart,
    cartInvoices,  // NEW: Invoice data for cart items
    selectedItems,
    loading,
    error,
    centerId,

    // Actions
    handleSelectItem,
    handleReturnQtyChange,
    addToCart,
    removeFromCart,
    submitRequest
  };
};