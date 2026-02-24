import React from 'react';

export const SparePartReturnForm = ({
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
  spares
}) => {
  return (
    <div className="mb-6 grid grid-cols-1 md:grid-cols-5 gap-4">
      <div>
        <label className="block text-sm font-medium mb-1">Return Type:</label>
        <select
          value={returnType}
          onChange={(e) => setReturnType(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded">
          <option value="">Select</option>
          <option value="Defective">Defective</option>
          <option value="Excess">Excess</option>
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
          disabled={!productGroup}>
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
            <option key={m.modelName} value={m.modelName}>{m.modelName}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Spare Part:</label>
        <select
          value={sparePart}
          onChange={(e) => setSparePart(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded"
          disabled={!model}>
          <option value="">Select</option>
          {spares.map(s => (
            <option key={s.spareName} value={s.spareName}>{s.spareName}</option>
          ))}
        </select>
      </div>
    </div>
  );
};