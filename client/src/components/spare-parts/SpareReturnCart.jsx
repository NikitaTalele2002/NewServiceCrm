import React, { useEffect, useState } from 'react';
import { DataTable, Button } from '../common';

const SpareReturnCart = ({ cart, onRemoveItem, onSubmitCart, loading, cartInvoices = {} }) => {
  const [debugInfo, setDebugInfo] = useState('');

  useEffect(() => {
    if (cart.length > 0) {
      // Debug: Log cart item structure and invoice data
      console.log('📋 Cart items:', cart);
      console.log('📋 Cart invoices:', cartInvoices);
      
      if (cart[0]) {
        console.log('📋 First cart item keys:', Object.keys(cart[0]));
        console.log('📋 First cart item:', JSON.stringify(cart[0], null, 2));
      }
    }
  }, [cart, cartInvoices]);

  const getSpareId = (item) => {
    // Try multiple possible field names
    return item.spare_id || item.spareId || item.Id || item.id || item.PART;
  };

  const columns = [
    { key: 'DESCRIPTION', header: 'Spare Part' },
    { key: 'returnQty', header: 'Return QTY' },
    { key: 'reason', header: 'Reason' },
    {
      key: 'invoice',
      header: 'Invoice Number & Details',
      render: (item) => {
        // Try to find invoice data for this spare using multiple strategies
        const spareId = getSpareId(item);
        
        let invoiceData = null;
        
        // Try direct lookup first
        if (cartInvoices?.[spareId]) {
          invoiceData = cartInvoices[spareId];
        } else if (item.fifo_invoice) {
          // Try if invoice data is stored on the item itself
          invoiceData = typeof item.fifo_invoice === 'string' 
            ? JSON.parse(item.fifo_invoice) 
            : item.fifo_invoice;
        }
        
        if (invoiceData && invoiceData.sap_doc_number) {
          return (
            <div className="flex flex-col gap-2 py-2">
              <div className="bg-blue-50 border border-blue-200 rounded p-2">
                <div className="font-bold text-blue-700 text-sm">
                  📄 {invoiceData.sap_doc_number}
                </div>
                {invoiceData.unit_price && (
                  <div className="text-xs text-gray-700">
                    Rate: <span className="font-semibold">₹{invoiceData.unit_price.toFixed(2)}</span>
                  </div>
                )}
                {invoiceData.hsn && (
                  <div className="text-xs text-gray-700">
                    HSN: <span className="font-semibold">{invoiceData.hsn}</span>
                  </div>
                )}
                {invoiceData.gst !== undefined && (
                  <div className="text-xs text-gray-700">
                    GST: <span className="font-semibold">{invoiceData.gst}%</span>
                  </div>
                )}
                {invoiceData.invoice_date && (
                  <div className="text-xs text-gray-500">
                    Date: {new Date(invoiceData.invoice_date).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          );
        }
        
        return (
          <div className="text-gray-400 text-sm italic">
            ⏳ Fetching invoice...
          </div>
        );
      }
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item, index) => (
        <Button
          variant="danger"
          size="sm"
          onClick={() => onRemoveItem(index)}>
          Remove
        </Button>
      )
    }
  ];

  const totalItems = cart.reduce((sum, item) => sum + parseInt(item.returnQty || item.quantity || 0), 0);

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Return Cart ({cart.length} items, Total: {totalItems})
        </h3>
        {cart.length > 0 && (
          <Button
            onClick={onSubmitCart}
            loading={loading}
            variant="success"
          >Submit Return Request
          </Button>
        )}
      </div>

      {cart.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No items in cart</p>
      ) : (
        <DataTable
          columns={columns}
          data={cart}
          emptyMessage="No items in cart"
        />
      )}
    </div>
  );
};

export default SpareReturnCart;


