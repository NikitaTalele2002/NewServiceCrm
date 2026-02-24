import React, { useState } from 'react';
import { useReplacementHistory } from '../../../hooks/useProductReplacement';
import ReplacementHistoryFilters from '../../../components/product_replacement/ReplacementHistoryFilters';
import ReplacementHistoryTable from '../../../components/product_replacement/ReplacementHistoryTable';
import ReplacementHistoryPagination from '../../../components/product_replacement/ReplacementHistoryPagination';
import ReplacementDetailsModal from '../../../components/product_replacement/ReplacementDetailsModal';

export default function ViewReplacementHistory() {
  const {
    data,
    loading,
    filters,
    pagination,
    handleFilterChange,
    handlePageChange
  } = useReplacementHistory();

  const [selectedReplacement, setSelectedReplacement] = useState(null);
  const [fullReplacement, setFullReplacement] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  const handleViewDetails = async (item) => {
    setSelectedReplacement(item);
    setModalLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/complaints/${item.callId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const fullData = await res.json();
        setFullReplacement(fullData);
      } else {
        setFullReplacement(item); // fallback
      }
    } catch (error) {
      console.error('Error fetching complaint details:', error);
      setFullReplacement(item); // fallback
    } finally {
      setModalLoading(false);
    }
  };

  const handlePrint = (replacement) => {
    // Implement print functionality
    const printContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Product Replacement Details</h2>
        <p><strong>Call ID:</strong> ${replacement.callId}</p>
        <p><strong>Request Number:</strong> ${replacement.requestNumber}</p>
        <p><strong>Status:</strong> ${replacement.status}</p>
        <p><strong>Customer:</strong> ${replacement.customer?.name || ''}</p>
        <p><strong>Mobile:</strong> ${replacement.customer?.mobile || ''}</p>
        <p><strong>Serial Number:</strong> ${replacement.product?.serialNo || ''}</p>
        <p><strong>Replacement Reason:</strong> ${replacement.replacement?.reason || ''}</p>
        <h3>Replacement Items:</h3>
        <ul>
          ${replacement.replacement?.items?.map(item =>
            `<li>${item.name} (SKU: ${item.sku}) - Qty: ${item.requestedQty}</li>`
          ).join('') || '<li>No items</li>'}
        </ul>
      </div>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Product Replacement History</h1>

      <ReplacementHistoryFilters
        filters={filters}
        onFilterChange={handleFilterChange}
      />

      <ReplacementHistoryTable
        data={data}
        loading={loading}
        onViewDetails={handleViewDetails}
        onPrint={handlePrint}
      />

      <ReplacementHistoryPagination
        pagination={pagination}
        onPageChange={handlePageChange}
      />

      <ReplacementDetailsModal
        selectedReplacement={selectedReplacement}
        fullReplacement={fullReplacement}
        modalLoading={modalLoading}
        onClose={() => setSelectedReplacement(null)}
        onPrint={handlePrint}
      />
    </div>
  );
}