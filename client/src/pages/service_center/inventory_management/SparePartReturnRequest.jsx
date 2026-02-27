import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiUrl } from '../../../config/apiConfig';
import './SparePartReturnRequest.css';

export default function SparePartReturnRequest() {
  const navigate = useNavigate();
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
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submittedRequestId, setSubmittedRequestId] = useState(null);
  const [inventoryMap, setInventoryMap] = useState({}); // Map of group/product/model/spare hierarchy from actual inventory

  // Get service center ID from token
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

  if (!centerId) {
    return (
      <div className="error-message">
        Please log in as a service center user to access this page.
      </div>
    );
  }

  // Fetch service center inventory on mount - this drives all filtering
  useEffect(() => {
    const fetchServiceCenterInventory = async () => {
      try {
        console.log('🔄 Fetching service center inventory for centerId:', centerId);
        const response = await fetch(getApiUrl(`/spare-returns/inventory`), {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          console.log('✅ Service center inventory fetched:', data);
          setInventoryMap(data.inventoryMap || {});
          
          // Extract available groups from inventory
          const availableGroups = Object.values(data.inventoryMap || {}).map(group => ({
            Id: group.groupId,
            VALUE: group.groupName,
            DESCRIPTION: group.groupName
          }));
          console.log('✅ Available groups:', availableGroups);
          setGroups(availableGroups);
          
          if (availableGroups.length === 0) {
            setError('No spare inventory available for this service center');
          }
        } else {
          console.error('❌ API error response:', response.status, response.statusText);
          const errorData = await response.json().catch(() => ({}));
          setError(`Failed to load inventory: ${errorData.error || 'Unknown error'}`);
        }
      } catch (error) {
        console.error('❌ Error fetching service center inventory:', error);
        setError(`Failed to load inventory: ${error.message}`);
      }
    };
    fetchServiceCenterInventory();
  }, [token, centerId]);

  // Fetch products from hierarchy (kept for fallback) but filter by inventory
  useEffect(() => {
    if (productGroup && inventoryMap[productGroup]) {
      // Get products from inventory for this group
      const availableProducts = Object.values(inventoryMap[productGroup].products || {}).map(prod => ({
        ID: prod.productId,
        VALUE: prod.productName,
        DESCRIPTION: prod.productName
      }));
      setProducts(availableProducts);
      setProduct('');
      setModels([]);
      setModel('');
      setSpares([]);
      setSparePart('');
    } else {
      setProducts([]);
      setModel('');
      setSpares([]);
      setSparePart('');
    }
  }, [productGroup, inventoryMap]);

  // Fetch models when product changes - filter by inventory
  useEffect(() => {
    if (product && productGroup && inventoryMap[productGroup]?.products[product]) {
      // Get models from inventory for this product
      const availableModels = Object.values(inventoryMap[productGroup].products[product].models || {}).map(mdl => ({
        Id: mdl.modelId,
        MODEL_CODE: mdl.modelCode,
        MODEL_DESCRIPTION: mdl.modelDescription
      }));
      setModels(availableModels);
      setModel('');
      setSpares([]);
      setSparePart('');
    } else {
      setModels([]);
      setModel('');
      setSpares([]);
      setSparePart('');
    }
  }, [product, productGroup, inventoryMap]);

  // Fetch spares when model changes - filter by inventory
  useEffect(() => {
    if (model && product && productGroup && inventoryMap[productGroup]?.products[product]?.models[model]) {
      // Get spares from inventory for this model
      const availableSpares = Object.values(inventoryMap[productGroup].products[product].models[model].spares || {}).map(spare => ({
        Id: spare.spareId,
        PART: spare.partCode,
        DESCRIPTION: spare.partDescription,
        totalQty: spare.totalQty,
        goodQty: spare.goodQty,
        defectiveQty: spare.defectiveQty
      }));
      setSpares(availableSpares);
      setSparePart('');
    } else {
      setSpares([]);
      setSparePart('');
    }
  }, [model, product, productGroup, inventoryMap]);

  // Populate inventory table when spare selected or model changes
  useEffect(() => {
    console.log('Inventory effect triggered:', { model, sparePart, sparesCount: spares.length });
    
    if (!model) {
      setInventory([]);
      setLoading(false);
      return;
    }

    // If spares are still loading, show loading state
    if (model && spares.length === 0) {
      setLoading(true);
      console.log('Waiting for spares to load...');
      return;
    }

    // If specific spare is selected, show only that spare
    if (sparePart && spares.length > 0) {
      const selectedSpare = spares.find(s => s.Id === parseInt(sparePart));
      if (selectedSpare) {
        console.log('Showing selected spare:', selectedSpare);
        setInventory([{
          Id: selectedSpare.Id,
          spare_id: selectedSpare.Id,
          spareId: selectedSpare.Id,
          id: selectedSpare.Id,
          PART: selectedSpare.PART,
          DESCRIPTION: selectedSpare.DESCRIPTION,
          currentQty: selectedSpare.totalQty,  // Use actual inventory quantity
          goodQty: selectedSpare.goodQty,
          defectiveQty: selectedSpare.defectiveQty
        }]);
        setLoading(false);
      }
      return;
    }

    // Show all spares for the selected model
    if (model && Array.isArray(spares) && spares.length > 0) {
      console.log('Showing all spares for model:', spares.length);
      setInventory(spares.map(spare => ({
        Id: spare.Id,
        spare_id: spare.Id,
        spareId: spare.Id,
        id: spare.Id,
        PART: spare.PART,
        DESCRIPTION: spare.DESCRIPTION,
        currentQty: spare.totalQty,  // Use actual inventory quantity
        goodQty: spare.goodQty,
        defectiveQty: spare.defectiveQty
      })));
      setLoading(false);
    }
  }, [sparePart, model, spares]);

  // Remove the old problematic inventory fetch hook - replaced by logic above

  // Handle item selection
  const handleSelectItem = (itemId, checked) => {
    setSelectedItems(prev => ({
      ...prev,
      [itemId]: checked ? { returnQty: 0, remainingQty: 0 } : undefined
    }));
  };

  // Handle return quantity change
  const handleReturnQtyChange = (itemId, qty) => {
    setSelectedItems(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        returnQty: parseInt(qty) || 0
      }
    }));
  };

  // Add selected items to cart
  const handleAddToCart = () => {
    const itemsToAdd = inventory.filter(item => {
      const itemId = item.spare_id || item.spareId || item.Id || item.id;
      return selectedItems[itemId] && selectedItems[itemId].returnQty > 0;
    });
    
    if (itemsToAdd.length === 0) {
      setError('Please select items with quantity > 0');
      return;
    }

    const newItems = itemsToAdd.map(item => {
      const itemId = item.spare_id || item.spareId || item.Id || item.id;
      return {
        sparePartId: itemId,
        spare_id: itemId,
        spareId: itemId,  // Ensure spareId is always set
        PART: item.PART,
        DESCRIPTION: item.DESCRIPTION,
        currentQty: item.currentQty,
        returnQty: selectedItems[itemId].returnQty,
        remainingQty: (item.currentQty || 0) - (selectedItems[itemId].returnQty || 0)
      };
    });

    console.log('📦 Adding to cart:', newItems);
    setCart(prev => [...prev, ...newItems]);
    setSelectedItems({});
    setSuccess('Items added to cart');
    setTimeout(() => setSuccess(''), 3000);
  };

  // Remove item from cart
  const handleRemoveFromCart = (index) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  // Navigate to view cart
  const handleViewCart = () => {
    if (cart.length === 0) {
      setError('Cart is empty');
      return;
    }
    navigate('/service-center/inventory/view-cart', { state: { cart, returnType } });
  };

  // Submit spare return request
  const handleSubmitReturn = async () => {
    if (cart.length === 0) {
      setError('Cart is empty. Please add items before submitting.');
      return;
    }

    if (!returnType) {
      setError('Please select a return type');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const payload = {
        items: cart.map(item => ({
          spareId: item.spareId || item.spare_id || item.sparePartId,  // Try multiple field names
          returnQty: item.returnQty,
          remainingQty: item.remainingQty || ((item.currentQty || 0) - (item.returnQty || 0))
        })),
        returnType,
        productGroup,
        product,
        model
      };

      console.log('📤 Submitting spare return request with payload:', payload);

      const response = await fetch(getApiUrl('/spare-returns/create'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const requestId = data.returnRequest?.requestId || data.requestId;
        setSubmittedRequestId(requestId);
        setSuccess(`✅ Spare return request submitted successfully! Request #SPR-${requestId}`);
        setCart([]);
        setReturnType('');
        setProductGroup('');
        setProduct('');
        setModel('');
        setSparePart('');
        setSelectedItems({});
        setInventory([]);
      } else {
        setError(`Failed to submit return request: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Error submitting return request:', error);
      setError(`Error submitting return request: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="spare-return-request-container">
      <h1>Spare Part Return Request</h1>

      {error && (
        <div className="alert alert-error">
          {error}
          <button onClick={() => setError('')}>&times;</button>
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <div>
            <p>{success}</p>
            {submittedRequestId && (
              <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
                <button 
                  className="btn btn-primary" 
                  onClick={() => navigate('/service-center/inventory/view-spare-return')}
                  style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                >
                  View Return Requests
                </button>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => navigate(`/service-center/inventory/print-return-challan/${submittedRequestId}`)}
                  style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                >
                  Print Challan
                </button>
              </div>
            )}
          </div>
          <button onClick={() => { setSuccess(''); setSubmittedRequestId(null); }}>&times;</button>
        </div>
      )}

      {/* Filter Section */}
      <div className="filter-section">
        <div className="form-group">
          <label>Return Type:</label>
          <select value={returnType} onChange={(e) => setReturnType(e.target.value)}>
            <option value="">Select Return Type</option>
            <option value="defect">Defective Return</option>
            <option value="bulk">Bulk Return</option>
            <option value="replacement">Replacement</option>
          </select>
        </div>

        {returnType && (
          <>
            <div className="form-group">
              <label>Product Group:</label>
              {groups.length === 0 ? (
                <div className="empty-message">No product groups with spare inventory available</div>
              ) : (
                <select value={productGroup} onChange={(e) => setProductGroup(e.target.value)}>
                  <option value="">Select Group</option>
                  {groups.map(group => (
                    <option key={group.Id} value={group.Id}>{group.VALUE || group.DESCRIPTION}</option>
                  ))}
                </select>
              )}
            </div>

            {productGroup && (
              <>
                <div className="form-group">
                  <label>Product:</label>
                  <select value={product} onChange={(e) => setProduct(e.target.value)} disabled={!productGroup}>
                    <option value="">Select Product</option>
                    {products.map(prod => (
                      <option key={prod.ID} value={prod.ID}>{prod.VALUE || prod.DESCRIPTION}</option>
                    ))}
                  </select>
                </div>

                {product && (
                  <>
                    <div className="form-group">
                      <label>Model:</label>
                      <select value={model} onChange={(e) => setModel(e.target.value)} disabled={!product}>
                        <option value="">Select Model</option>
                        {models.map(mdl => (
                          <option key={mdl.Id} value={mdl.Id}>{mdl.MODEL_CODE || mdl.MODEL_DESCRIPTION}</option>
                        ))}
                      </select>
                    </div>

                    {model && (
                      <div className="form-group">
                        <label>Spare Part:</label>
                        <select value={sparePart} onChange={(e) => setSparePart(e.target.value)} disabled={!model}>
                          <option value="">Select Spare</option>
                          {Array.isArray(spares) && spares.map(spare => (
                            <option key={spare.Id} value={spare.Id}>{spare.PART} - {spare.DESCRIPTION}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Inventory Table */}
      <div className="inventory-table-section">
        <h2>Inventory Available for Return</h2>
        
        {!model ? (
          <div className="empty-message">Please select a Product Group, Product, and Model to see available inventory</div>
        ) : loading || (model && spares.length === 0) ? (
          <div className="loading-message" style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
            <p>Loading inventory items...</p>
          </div>
        ) : inventory.length > 0 ? (
          <div className="table-wrapper">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>Select</th>
                  <th>Part Code</th>
                  <th>Part Description</th>
                  <th>Available QTY</th>
                  <th>Return QTY</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map(item => {
                  const itemId = item.spare_id || item.spareId || item.Id || item.id;
                  return (
                    <tr key={itemId}>
                      <td>
                        <input
                          type="checkbox"
                          checked={!!selectedItems[itemId]}
                          onChange={(e) => handleSelectItem(itemId, e.target.checked)}
                        />
                      </td>
                      <td>{item.PART || 'N/A'}</td>
                      <td>{item.DESCRIPTION || 'Unknown'}</td>
                      <td>{item.currentQty}</td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          max={item.currentQty}
                          value={selectedItems[itemId]?.returnQty || 0}
                          onChange={(e) => handleReturnQtyChange(itemId, e.target.value)}
                          disabled={!selectedItems[itemId]}
                          className="qty-input"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-message">No spare parts available for the selected model</div>
        )}
      </div>

      {/* Cart Preview */}
      {cart.length > 0 && (
        <div className="cart-preview-section">
          <h2>Return Items Cart ({cart.length} items)</h2>
          <div className="cart-table-wrapper">
            <table className="cart-table">
              <thead>
                <tr>
                  <th>Part Code</th>
                  <th>Part Description</th>
                  <th>Return QTY</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {cart.map((item, index) => (
                  <tr key={index}>
                    <td>{item.PART || 'N/A'}</td>
                    <td>{item.DESCRIPTION || 'Unknown'}</td>
                    <td>{item.returnQty}</td>
                    <td>
                      <button
                        className="btn-remove"
                        onClick={() => handleRemoveFromCart(index)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="action-buttons">
        <button 
          className="btn btn-primary" 
          onClick={handleAddToCart}
          disabled={loading}
        >
          Add to Cart
        </button>
        <button 
          className="btn btn-secondary" 
          onClick={handleViewCart}
          disabled={cart.length === 0 || loading}
        >
          View Cart
        </button>
        <button 
          className="btn btn-success" 
          onClick={handleSubmitReturn}
          disabled={cart.length === 0 || loading}
          title="Submit the spare return request to the plant"
        >
          {loading ? 'Submitting...' : 'Submit Return Request'}
        </button>
      </div>
    </div>
  );
}
