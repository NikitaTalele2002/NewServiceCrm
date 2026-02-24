import React, { useState, useEffect } from 'react';

export default function OrderRequestCreate({ onBack, onSubmit }) {
  const [formData, setFormData] = useState({
    productGroup: '',
    product: '',
    model: '',
    sparePart: '',
    quantity: ''
  });

  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [productGroups, setProductGroups] = useState([]);
  const [products, setProducts] = useState([]);
  const [models, setModels] = useState([]);
  const [spareParts, setSpareParts] = useState([]);

  // Fetch ProductGroups
  useEffect(() => {
    fetchProductGroups();
  }, []);

  const fetchProductGroups = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/products/hierarchy');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setProductGroups(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch product groups:', err);
      setProductGroups([]);
      alert('Failed to fetch product groups. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Products when ProductGroup changes
  useEffect(() => {
    if (!formData.productGroup) {
      setProducts([]);
      setModels([]);
      setSpareParts([]);
      return;
    }

    const selectedGroup = productGroups.find(pg => pg.Id === parseInt(formData.productGroup));
    if (selectedGroup && selectedGroup.productMasters) {
      setProducts(selectedGroup.productMasters);
    }
  }, [formData.productGroup]);

  // Fetch Models when Product changes
  useEffect(() => {
    if (!formData.product) {
      setModels([]);
      setSpareParts([]);
      return;
    }

    const selectedProduct = products.find(p => p.ID === parseInt(formData.product));
    if (selectedProduct && selectedProduct.productModels) {
      setModels(selectedProduct.productModels);
    }
  }, [formData.product]);

  // Fetch SpareParts when Model changes
  useEffect(() => {
    if (!formData.model) {
      setSpareParts([]);
      return;
    }

    const fetchSpareParts = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/products/models/${formData.model}/spares`);
        if (!response.ok) {
          console.error('Failed to fetch spare parts:', response.status);
          setSpareParts([]);
          return;
        }
        const data = await response.json();
        setSpareParts(Array.isArray(data) ? data : []);
        console.log(`Loaded ${Array.isArray(data) ? data.length : 0} spare parts for model ${formData.model}`);
      } catch (err) {
        console.error('Error fetching spare parts:', err);
        setSpareParts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSpareParts();
  }, [formData.model]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddToCart = () => {
    if (!formData.productGroup || !formData.product || !formData.model || !formData.sparePart || !formData.quantity) {
      alert('Please fill all required fields');
      return;
    }

    const selectedGroup = productGroups.find(pg => pg.Id === parseInt(formData.productGroup));
    const selectedProduct = products.find(p => p.ID === parseInt(formData.product));
    const selectedModel = models.find(m => m.Id === parseInt(formData.model));
    const selectedSpare = spareParts.find(sp => sp.Id === parseInt(formData.sparePart));

    const cartItem = {
      id: Date.now(),
      productGroupName: selectedGroup?.DESCRIPTION || '',
      productName: selectedProduct?.DESCRIPTION || '',
      modelCode: selectedModel?.MODEL_DESCRIPTION || '',
      sparePart: selectedSpare?.DESCRIPTION || '',
      quantity: formData.quantity,
      productGroupId: formData.productGroup,
      productId: formData.product,
      modelId: formData.model,
      sparePartId: formData.sparePart
    };

    setCart([...cart, cartItem]);
    setFormData({ productGroup: '', product: '', model: '', sparePart: '', quantity: '' });
  };

  const handleRemoveFromCart = (id) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const handleSubmit = async () => {
    if (cart.length === 0) {
      alert('Please add at least one item to cart');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const payload = {
        items: cart.map(item => ({
          productGroupId: item.productGroupId,
          productId: item.productId,
          modelId: item.modelId,
          sparePartId: item.sparePartId,
          quantity: parseInt(item.quantity)
        }))
      };

      console.log('📤 Submitting order request with payload:', payload);

      const response = await fetch('/api/spare-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const responseData = await response.json();
      console.log('📥 Server response:', responseData);

      if (!response.ok) {
        const errorMsg = responseData?.message || responseData?.error || 'Failed to create order request';
        throw new Error(errorMsg);
      }

      alert('Order request created successfully: ' + responseData?.request?.requestId);
      setCart([]);
      onSubmit?.();
      onBack?.();
    } catch (err) {
      console.error('❌ Error submitting order:', err);
      alert('Failed to create order request: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && productGroups.length === 0) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="p-6 bg-white rounded-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Create Order Request</h2>
        <button onClick={onBack} className="text-gray-600 hover:text-gray-800 text-2xl">✕</button>
      </div>

      {/* Form Section */}
      <div className="border border-gray-300 p-4 rounded mb-6 bg-gray-50">
        <h3 className="font-semibold text-lg mb-4">Add Items to Order</h3>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Product Group */}
          <div>
            <label className="block text-sm font-medium mb-2">Product Group *</label>
            <select
              name="productGroup"
              value={formData.productGroup}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:border-blue-500"
            >
              <option value="">Select</option>
              {Array.isArray(productGroups) && productGroups.map(pg => (
                <option key={pg.Id} value={pg.Id}>{pg.DESCRIPTION}</option>
              ))}
            </select>
          </div>

          {/* Product */}
          <div>
            <label className="block text-sm font-medium mb-2">Product *</label>
            <select
              name="product"
              value={formData.product}
              onChange={handleChange}
              disabled={!formData.productGroup}
              className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:border-blue-500 disabled:bg-gray-100"
            >
              <option value="">Select</option>
              {Array.isArray(products) && products.map(p => (
                <option key={p.ID} value={p.ID}>{p.DESCRIPTION}</option>
              ))}
            </select>
          </div>

          {/* Model */}
          <div>
            <label className="block text-sm font-medium mb-2">Model *</label>
            <select
              name="model"
              value={formData.model}
              onChange={handleChange}
              disabled={!formData.product}
              className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:border-blue-500 disabled:bg-gray-100"
            >
              <option value="">Select</option>
              {Array.isArray(models) && models.map(m => (
                <option key={m.Id} value={m.Id}>{m.MODEL_DESCRIPTION}</option>
              ))}
            </select>
          </div>

          {/* Spare Part */}
          <div>
            <label className="block text-sm font-medium mb-2">Spare Part *</label>
            <select
              name="sparePart"
              value={formData.sparePart}
              onChange={handleChange}
              disabled={!formData.model}
              className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:border-blue-500 disabled:bg-gray-100"
            >
              <option value="">Select</option>
              {Array.isArray(spareParts) && spareParts.map(sp => (
                <option key={sp.Id} value={sp.Id}>{sp.DESCRIPTION}</option>
              ))}
            </select>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium mb-2">QTY *</label>
            <input
              type="number"
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              min="1"
              className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:border-blue-500"
              placeholder="Enter quantity"
            />
          </div>
        </div>

        {/* Add to Cart Button */}
        <button
          onClick={handleAddToCart}
          className="bg-green-600 text-black px-6 py-2 rounded hover:bg-green-700 font-medium"
        >
          + Add to Cart
        </button>
      </div>

      {/* Cart Section */}
      <div className="mb-6">
        <h3 className="font-semibold text-lg mb-3">Order Items ({cart.length})</h3>
        
        {cart.length > 0 ? (
          <div className="overflow-x-auto border border-gray-300 rounded">
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="p-3 text-left text-sm font-semibold">Product Group</th>
                  <th className="p-3 text-left text-sm font-semibold">Product</th>
                  <th className="p-3 text-left text-sm font-semibold">Model Code</th>
                  <th className="p-3 text-left text-sm font-semibold">Spare Part</th>
                  <th className="p-3 text-left text-sm font-semibold">QTY</th>
                  <th className="p-3 text-center text-sm font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {cart.map(item => (
                  <tr key={item.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 text-sm">{item.productGroupName}</td>
                    <td className="p-3 text-sm">{item.productName}</td>
                    <td className="p-3 text-sm">{item.modelCode}</td>
                    <td className="p-3 text-sm">{item.sparePart}</td>
                    <td className="p-3 text-sm">{item.quantity}</td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleRemoveFromCart(item.id)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="border border-gray-300 rounded p-4 text-center text-gray-500">
            No items added yet
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end">
        <button
          onClick={onBack}
          className="border border-gray-300 text-gray-700 px-6 py-2 rounded hover:bg-gray-50 font-medium"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={cart.length === 0 || loading}
          className="bg-blue-600 text-black px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 font-medium"
        >
          {loading ? 'Submitting...' : 'Submit Order Request'}
        </button>
      </div>
    </div>
  );
}

