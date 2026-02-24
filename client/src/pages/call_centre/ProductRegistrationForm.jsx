import React from 'react';
import ProductForm from '../../components/products/ProductForm';
import { useProduct } from '../../hooks/useProduct';
import { registerProductForCustomer } from '../../services/callCenterService_updated';

export default function ProductRegistrationForm({ customer, onProductRegistered, onCancel, loading }) {
  const {
    product,
    updateProduct,
    setProductGroup,
    setProductId,
    setModelId,
    productGroups,
    products,
    models,
    loading: hookLoading,
  } = useProduct();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!product.Brand) return alert('Brand is required');
    if (!product.ProductGroup) return alert('Product Group is required');
    if (!product.ProductID) return alert('Product is required');

    const payload = {
      product_id: Number(product.ProductID),
      model_id: product.ModelID ? Number(product.ModelID) : null,
      serial_number: product.ProductSerialNo?.trim() || null,
      purchase_date: product.PurchaseDate || null,
      qty_with_customer: Number(product.qty_with_customer) || 1,
      dealer_name: product.DealerName || null,
      warranty_status: product.WarrantyStatus || null,
      previous_calls: Number(product.PreviousCalls) || 0,
      call_status: product.CallStatus || null,
      brand: product.Brand || null,
      product_group: Number(product.ProductGroup) || null,
    };

    try {
      const customerId = customer?.customer_id || customer?.id || customer?.CustomerID;
      const result = await registerProductForCustomer(customerId, payload);
      alert('✓ Product registered successfully!');
      onProductRegistered && onProductRegistered(result);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to register product');
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mb-6">
      <h2 className="text-2xl font-bold mb-2">📦 Register Product</h2>
      <p className="mb-4">Customer: <b>{customer?.name}</b></p>

      <ProductForm
        product={product}
        updateProduct={updateProduct}
        setProductGroup={setProductGroup}
        setProductId={setProductId}
        setModelId={setModelId}
        productGroups={productGroups}
        products={products}
        models={models}
        onSubmit={handleSubmit}
        loading={hookLoading || loading}
        showCustomerPhone={false}
      />

      <div className="mt-4 flex gap-2">
        <button onClick={onCancel} className="flex-1 bg-gray-200 py-2 rounded">Cancel</button>
      </div>
    </div>
  );
}
