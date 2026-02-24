import React from 'react';

export default function ProductForm({
  product,
  updateProduct,
  setProductGroup,
  setProductId,
  setModelId,
  productGroups,
  products,
  models,
  onSubmit,
  loading,
  showCustomerPhone = true,
}) {
  const handleGroupChange = (e) => {
    setProductGroup(e.target.value);
  };

  const handleProductChange = (e) => {
    const pid = e.target.value;
    const sel = products.find((p) => String(p.ID ?? p.ProductID) === String(pid));
    setProductId(
      pid,
      sel?.DESCRIPTION ?? sel?.ProductName ?? sel?.VALUE ?? sel?.Value ?? ''
    );
  };

  const handleModelChange = (e) => {
    const mid = e.target.value;
    const sel = models.find((m) => String(m.ID ?? m.Id ?? m.id) === String(mid));
    setModelId(
      mid,
      sel?.MODEL_DESCRIPTION ?? sel?.MODEL ?? sel?.Value ?? sel?.Description ?? ''
    );
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {showCustomerPhone && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Customer Phone <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            placeholder="Enter customer phone number"
            value={product.CustomerPhone}
            onChange={(e) => updateProduct('CustomerPhone', e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
        </div>
      )}

      {/* Brand */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Brand <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          placeholder="Enter brand name"
          value={product.Brand}
          onChange={(e) => updateProduct('Brand', e.target.value)}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
        />
      </div>

      {/* Product Group */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Product Group <span className="text-red-500">*</span>
        </label>
        <select
          value={product.ProductGroup}
          onChange={handleGroupChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white"
        >
          <option value="">Select Product Group</option>
          {productGroups.map((g) => (
            <option key={g.ID ?? g.Id} value={g.ID ?? g.Id}>
              {g.DESCRIPTION ?? g.Value ?? g.Description}
            </option>
          ))}
        </select>
      </div>

      {/* Product */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Product <span className="text-red-500">*</span>
        </label>
        <select
          value={product.ProductID}
          onChange={handleProductChange}
          disabled={!product.ProductGroup}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <option value="">Select Product</option>
          {products.map((p) => (
            <option key={p.ID ?? p.ProductID} value={p.ID ?? p.ProductID}>
              {p.DESCRIPTION ?? p.ProductName ?? p.Value}
            </option>
          ))}
        </select>
      </div>

      {/* Model */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Model <span className="text-red-500">*</span>
        </label>
        <select
          value={product.ModelID}
          onChange={handleModelChange}
          disabled={!product.ProductID}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <option value="">Select Model</option>
          {models.map((m) => (
            <option key={m.ID ?? m.Id} value={m.ID ?? m.Id}>
              {m.MODEL_DESCRIPTION ?? m.ModelCode ?? m.Value}
            </option>
          ))}
        </select>
      </div>

      {/* Serial No */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Serial Number
        </label>
        <input
          type="text"
          placeholder="Enter product serial number"
          value={product.ProductSerialNo}
          onChange={(e) => updateProduct('ProductSerialNo', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
        />
      </div>

      {/* Purchase Date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Purchase Date
        </label>
        <input
          type="date"
          value={product.PurchaseDate}
          onChange={(e) => updateProduct('PurchaseDate', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
        />
      </div>

      {/* Dealer Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Dealer Name
        </label>
        <input
          type="text"
          placeholder="Enter dealer name"
          value={product.DealerName}
          onChange={(e) => updateProduct('DealerName', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
        />
      </div>

      {/* Warranty Status */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Warranty Status
        </label>
        <input
          type="text"
          placeholder="e.g., Active, Expired"
          value={product.WarrantyStatus}
          onChange={(e) => updateProduct('WarrantyStatus', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
        />
      </div>

      {/* Previous Calls */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Previous Calls
        </label>
        <input
          type="number"
          placeholder="Enter number of previous calls"
          value={product.PreviousCalls}
          onChange={(e) =>
            updateProduct('PreviousCalls', parseInt(e.target.value) || 0)
          }
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          min="0"
        />
      </div>

      {/* Call Status */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Call Status
        </label>
        <input
          type="text"
          placeholder="e.g., Open, Closed, Pending"
          value={product.CallStatus}
          onChange={(e) => updateProduct('CallStatus', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
        />
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-black font-semibold py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Registering...
          </>
        ) : (
          'Register Product'
        )}
      </button>
    </form>
  );
}
