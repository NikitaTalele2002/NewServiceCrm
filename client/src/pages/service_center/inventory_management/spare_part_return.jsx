import React from 'react';
import { useSparePartReturn } from '../../../hooks/useSparePartReturn';
import { SparePartReturnForm, SparePartReturnTable, SparePartReturnCart } from '../../../components/sparePartReturn';

export default function SpareReturnRequest() {
  const {
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
    selectedItems,
    loading,
    error,
    centerId,
    handleSelectItem,
    handleReturnQtyChange,
    addToCart,
    removeFromCart,
    submitRequest
  } = useSparePartReturn();

  if (!centerId) {
    return <div>Please log in as a service center user.</div>;
  }

  return (
    <div className="p-6 bg-white min-h-screen">
      <h1 className="text-4xl font-bold mb-6">Spare Part Return Request</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <SparePartReturnForm
        returnType={returnType}
        setReturnType={setReturnType}
        productGroup={productGroup}
        setProductGroup={setProductGroup}
        product={product}
        setProduct={setProduct}
        model={model}
        setModel={setModel}
        sparePart={sparePart}
        setSparePart={setSparePart}
        groups={groups}
        products={products}
        models={models}
        spares={spares}/>

      <SparePartReturnTable
        inventory={inventory}
        selectedItems={selectedItems}
        handleSelectItem={handleSelectItem}
        handleReturnQtyChange={handleReturnQtyChange}
        loading={loading}/>

      <SparePartReturnCart
        cart={cart}
        removeFromCart={removeFromCart}/>

      {/* Buttons */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={addToCart}
          className="px-4 py-2 bg-blue-500 text-black rounded hover:bg-blue-600">Add to Cart
        </button>
      </div>

      {/* Submit */}
      <div className="flex justify-center">
        <button
          onClick={submitRequest}
          className="px-6 py-3 bg-green-500 text-black rounded hover:bg-green-600">Submit
        </button>
      </div>
    </div>
  );
}

