import React from 'react';

const DCFForm = ({
  formData,
  onChange,
  onSubmit,
  technicians,
  productGroups,
  products,
  models,
  loading
}) => {
  const handleInputChange = (field, value) => {
    onChange({ ...formData, [field]: value });
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Generate DCF</h2>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Technician</label>
            <select
              value={formData.technician}
              onChange={(e) => handleInputChange('technician', e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
              required
            >
              <option value="">Select Technician</option>
              {technicians.map((tech) => (
                <option key={tech.Id} value={tech.Id}>
                  {tech.displayName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Product Group</label>
            <select
              value={formData.productGroup}
              onChange={(e) => handleInputChange('productGroup', e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
              required
            >
              <option value="">Select Product Group</option>
              {productGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Product Type</label>
            <select
              value={formData.productType}
              onChange={(e) => handleInputChange('productType', e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
              required
              disabled={!formData.productGroup}
            >
              <option value="">Select Product Type</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Model</label>
            <select
              value={formData.model}
              onChange={(e) => handleInputChange('model', e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
              required
              disabled={!formData.productType}
            >
              <option value="">Select Model</option>
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Quantity</label>
            <input
              type="number"
              value={formData.quantity}
              onChange={(e) => handleInputChange('quantity', e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
              placeholder="Enter quantity"
              required
              min="1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Remarks</label>
            <textarea
              value={formData.remarks}
              onChange={(e) => handleInputChange('remarks', e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
              placeholder="Enter remarks (optional)"
              rows="3"
            />
          </div>
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-400"
          >
            {loading ? 'Generating...' : 'Generate DCF'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DCFForm;