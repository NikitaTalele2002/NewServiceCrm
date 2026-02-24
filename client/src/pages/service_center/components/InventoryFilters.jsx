import React from 'react';

export default function InventoryFilters({ groups, selectedGroup, setSelectedGroup, products, selectedProduct, setSelectedProduct, models, selectedModel, setSelectedModel, filter, setFilter, sortBy, setSortBy, resultsCount, totalCount }) {
  // Support shapes returned by /api/admin/master-data endpoints
  // Use numeric IDs consistently for filtering
  const getGroupLabel = (g) => g.VALUE || g.value || g.DESCRIPTION || g.description || g.groupName || 'Unknown';
  const getGroupId = (g) => g.Id || g.ID || g.id || g.VALUE || g.value;

  const getProductLabel = (p) => p.VALUE || p.value || p.DESCRIPTION || p.description || p.NAME || p.name || p.productName || 'Unknown';
  const getProductId = (p) => p.Id || p.ID || p.id || p.VALUE || p.value || p.productName;

  const getModelLabel = (m) => m.MODEL_DESCRIPTION || m.model_description || m.PRODUCT || m.MODEL_CODE || m.model_code || m.modelName || 'Unknown';
  const getModelId = (m) => m.Id || m.ID || m.id || m.MODEL_CODE || m.model_code;
  
  console.log('InventoryFilters props:', { groups: groups?.length, products: products?.length, models: models?.length });
  console.log('Sample group:', groups?.[0]);
  console.log('Sample product:', products?.[0]);
  console.log('Sample model:', models?.[0]);
  
  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Product Group</label>
          <select value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)} className="w-full border rounded-lg p-2 text-sm">
            <option value="">All Groups ({groups.length})</option>
            {Array.isArray(groups) && groups.map(g => (
              <option key={getGroupId(g)} value={getGroupId(g)}>
                {getGroupLabel(g)}
              </option>
            ))}
          </select>
          {groups.length === 0 && <p className="text-xs text-red-500 mt-1">No groups available</p>}
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Product</label>
          <select value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)} disabled={!selectedGroup} className="w-full border rounded-lg p-2 text-sm disabled:bg-gray-100">
            <option value="">Select Product ({products.length})</option>
            {Array.isArray(products) && selectedGroup && products.map(p => (
              <option key={getProductId(p)} value={getProductId(p)}>
                {getProductLabel(p)}
              </option>
            ))}
          </select>
          {selectedGroup && products.length === 0 && <p className="text-xs text-orange-500 mt-1">No products found</p>}
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Model</label>
          <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)} disabled={!selectedProduct} className="w-full border rounded-lg p-2 text-sm disabled:bg-gray-100">
            <option value="">Select Model ({models.length})</option>
            {Array.isArray(models) && selectedProduct && models.map(m => (
              <option key={getModelId(m)} value={getModelId(m)}>
                {getModelLabel(m)}
              </option>
            ))}
          </select>
          {selectedProduct && models.length === 0 && <p className="text-xs text-orange-500 mt-1">No models found</p>}
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Filter By</label>
          <select value={filter} onChange={e => setFilter(e.target.value)} className="w-full border rounded-lg p-2 text-sm">
            <option value="all">All Items</option>
            <option value="good">Good Items Only</option>
            <option value="defective">Defective Items Only</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Sort By</label>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="w-full border rounded-lg p-2 text-sm">
            <option value="sku">SKU</option>
            <option value="name">Name</option>
            <option value="qty">Quantity (High to Low)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Results</label>
          <div className="text-sm text-gray-600 p-2">Showing <strong>{resultsCount}</strong> of <strong>{totalCount}</strong> items</div>
        </div>
      </div>
    </div>
  );
}
  
//   return (
//     <div className="bg-white rounded-lg shadow p-4 mb-6">
//       <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
//         <div>
//           <label className="block text-sm font-semibold text-gray-700 mb-2">Product Group</label>
//           <select value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)} className="w-full border rounded-lg p-2 text-sm">
//             <option value="">All Groups ({groups.length})</option>
//             {Array.isArray(groups) && groups.map(g => (
//               <option key={getGroupId(g)} value={getGroupId(g)}>
//                 {getGroupLabel(g)}
//               </option>
//             ))}
//           </select>
//           {groups.length === 0 && <p className="text-xs text-red-500 mt-1">No groups available</p>}
//         </div>
//         <div>
//           <label className="block text-sm font-semibold text-gray-700 mb-2">Product</label>
//           <select value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)} disabled={!selectedGroup} className="w-full border rounded-lg p-2 text-sm disabled:bg-gray-100">
//             <option value="">Select Product ({products.length})</option>
//             {Array.isArray(products) && selectedGroup && products.map(p => (
//               <option key={getProductId(p)} value={getProductId(p)}>
//                 {getProductLabel(p)}
//               </option>
//             ))}
//           </select>
//           {selectedGroup && products.length === 0 && <p className="text-xs text-orange-500 mt-1">No products found</p>}
//         </div>
//         <div>
//           <label className="block text-sm font-semibold text-gray-700 mb-2">Model</label>
//           <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)} disabled={!selectedProduct} className="w-full border rounded-lg p-2 text-sm disabled:bg-gray-100">
//             <option value="">Select Model ({models.length})</option>
//             {Array.isArray(models) && selectedProduct && models.map(m => (
//               <option key={getModelId(m)} value={getModelId(m)}>
//                 {getModelLabel(m)}
//               </option>
//             ))}
//           </select>
//           {selectedProduct && models.length === 0 && <p className="text-xs text-orange-500 mt-1">No models found</p>}
//         </div>
//         <div>
//           <label className="block text-sm font-semibold text-gray-700 mb-2">Filter By</label>
//           <select value={filter} onChange={e => setFilter(e.target.value)} className="w-full border rounded-lg p-2 text-sm">
//             <option value="all">All Items</option>
//             <option value="good">Good Items Only</option>
//             <option value="defective">Defective Items Only</option>
//           </select>
//         </div>
//       </div>
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//         <div>
//           <label className="block text-sm font-semibold text-gray-700 mb-2">Sort By</label>
//           <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="w-full border rounded-lg p-2 text-sm">
//             <option value="sku">SKU</option>
//             <option value="name">Name</option>
//             <option value="qty">Quantity (High to Low)</option>
//           </select>
//         </div>
//         <div>
//           <label className="block text-sm font-semibold text-gray-700 mb-2">Results</label>
//           <div className="text-sm text-gray-600 p-2">Showing <strong>{resultsCount}</strong> of <strong>{totalCount}</strong> items</div>
//         </div>
//       </div>
//       </div>
//   );
// }
