import React from 'react';
import { useProduct } from '../../hooks/useProduct';
import ProductForm from '../../components/products/ProductForm';

export default function RegisterProduct() {
  const {
    product,
    updateProduct,
    setProductGroup,
    setProductId,
    setModelId,
    submitProduct,
    resetProduct,
    productGroups,
    products,
    models,
    loading,
    error,
  } = useProduct();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await submitProduct();
    if (result.success) {
      alert('✓ Product registered successfully!');
    } else {
      alert('✗ Failed to register product: ' + result.error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6 border-l-4 border-blue-600">
          <div className="flex items-center gap-3 mb-2">
            <div className="text-3xl">📦</div>
            <h1 className="text-3xl font-bold text-black-900">Register Product</h1>
          </div>
          <p className="text-gray-600 mt-2">
            Add a new product 
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
            <span className="text-red-600 text-xl">⚠️</span>
            <div>
              <h3 className="font-semibold text-red-900">Error</h3>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
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
            loading={loading}
          />

          {/* Help Text */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 flex items-center gap-2">
              <span>ℹ️</span>
              Fields marked with <span className="text-red-500 font-bold">*</span> are required
            </p>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>Need help? Contact support at support@company.com</p>
        </div>
      </div>
    </div>
  );
}




