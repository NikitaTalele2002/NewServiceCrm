import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../../../config/apiConfig';

export default function SpareReturnRequest() {
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
  const [selectedItems, setSelectedItems] = useState({});
  const [loading, setLoading] = useState(false);

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

  if (!centerId) {
    return <div>Please log in as a service center user.</div>;
  }

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

  const fetchGroups = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl(`/returns/service-centers/${centerId}/inventory/groups`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setGroups(data);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl(`/returns/service-centers/${centerId}/inventory/products?group=${encodeURIComponent(productGroup)}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchModels = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl(`/returns/service-centers/${centerId}/inventory/models?product=${encodeURIComponent(product)}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setModels(data);
      }
    } catch (error) {
      console.error('Error fetching models:', error);
    }
  };

  const fetchSpares = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl(`/returns/service-centers/${centerId}/inventory/spares?model=${encodeURIComponent(model)}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSpares(data);
      }
    } catch (error) {
      console.error('Error fetching spares:', error);
    }
  };

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (productGroup) params.append('group', productGroup);
      if (product) params.append('product', product);
      if (model) params.append('model', model);
      if (sparePart) params.append('spare', sparePart);

      const response = await fetch(getApiUrl(`/returns/service-centers/${centerId}/inventory?${params}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setInventory(data);
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
    }
    setLoading(false);
  };

  const handleSelectItem = (sku, checked) => {
    setSelectedItems(prev => ({
      ...prev,
      [sku]: checked
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
      returnQty: selectedItems[item.sku].returnQty
    }))]);
    setSelectedItems({});
  };

  const viewCart = () => {
    // Show cart modal or navigate
    alert(`Cart has ${cart.length} items`);
  };

  const submitRequest = async () => {
    if (cart.length === 0) {
      alert('Cart is empty');
      return;
    }
    if (!returnType) {
      alert('Please select a return type');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl('/returns'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ returnType, items: cart })
      });
      if (response.ok) {
        alert('Return request submitted successfully');
        setCart([]);
      } else {
        const errorData = await response.json();
        alert(`Failed to submit request: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error submitting request:', error);
      alert('Error submitting request');
    }
  };

  return (
    <div className="p-6 bg-white min-h-screen">
      <h1 className="text-4xl font-bold mb-6">Spare Part Return Request</h1>

      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-5 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Return Type:</label>
          <select
            value={returnType}
            onChange={(e) => setReturnType(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded">
            <option value="">Select</option>
            <option value="Defective">Defective</option>
            <option value="Excess">Good</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Product Group:</label>
          <select
            value={productGroup}
            onChange={(e) => setProductGroup(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded">
            <option value="">Select</option>
            {groups.map(g => (
              <option key={g.groupCode} value={g.groupCode}>{g.groupName}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Product:</label>
          <select
            value={product}
            onChange={(e) => setProduct(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
            disabled={!productGroup}
          >
            <option value="">Select</option>
            {products.map(p => (
              <option key={p.productName} value={p.productName}>{p.productName}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Model:</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
            disabled={!product}>
          
            <option value="">Select</option>
            {models.map(m => (
              <option key={m.modelId || m.id || m.MODEL_CODE || m.modelName} value={m.modelId || m.id || m.MODEL_CODE}>{m.modelName || m.MODEL_DESCRIPTION || m.MODEL_CODE}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Spare Part:</label>
          <select
            value={sparePart}
            onChange={(e) => setSparePart(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
            disabled={!model}
          >
            <option value="">Select</option>
            {spares.map(s => (
              <option key={s.sku || s.PART || s.spareName} value={s.sku || s.PART}>{s.spareName || s.DESCRIPTION || s.PART}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="mb-6">
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 p-2">Select</th>
              <th className="border border-gray-300 p-2">Part Code</th>
              <th className="border border-gray-300 p-2">Part Description</th>
              <th className="border border-gray-300 p-2">Remaining QTY</th>
              <th className="border border-gray-300 p-2">Return QTY</th>
            </tr>
          </thead>
          <tbody>
            {inventory.map(item => (
              <tr key={item.sku}>
                <td className="border border-gray-300 p-2 text-center">
                  <input
                    type="checkbox"
                    checked={!!selectedItems[item.sku]}
                    onChange={(e) => handleSelectItem(item.sku, e.target.checked)}
                  />
                </td>
                <td className="border border-gray-300 p-2">{item.sku}</td>
                <td className="border border-gray-300 p-2">{item.spareName}</td>
                <td className="border border-gray-300 p-2">{item.remainingQty}</td>
                <td className="border border-gray-300 p-2">
                  <input
                    type="number"
                    min="0"
                    max={item.remainingQty}
                    value={selectedItems[item.sku]?.returnQty || ''}
                    onChange={(e) => handleReturnQtyChange(item.sku, e.target.value)}
                    className="w-full p-1 border border-gray-300 rounded"
                    disabled={!selectedItems[item.sku]}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && <p className="mt-4">Loading...</p>}
      </div>

      {/* Buttons */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={addToCart}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Add to Cart
        </button>
        <button
          onClick={viewCart}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 relative"
        >
          View Cart
          {cart.length > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">
              {cart.length}
            </span>
          )}
        </button>
      </div>

      {/* Submit */}
      <div className="flex justify-center">
        <button
          onClick={submitRequest}
          className="px-6 py-3 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Submit
        </button>
      </div>
    </div>
  );
}