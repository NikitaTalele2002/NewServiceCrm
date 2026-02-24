import { useState, useEffect, useCallback } from 'react';
import { rentalAllocationApi } from '../services/rentalAllocationService';

export const useRequestDetail = (request, onBack) => {
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [allocations, setAllocations] = useState({});
  const [isApproved, setIsApproved] = useState(false);

  const fetchRequestDetails = useCallback(async () => {
    setLoading(true);
    try {
      // Use requestId, id, or spare_request_id - whichever is available
      const requestId = request?.requestId || request?.id || request?.spare_request_id;
      if (!request || !requestId) {
        console.error('❌ Invalid request object:', request);
        throw new Error('Request ID is missing');
      }

      console.log('📋 Fetching details for requestId:', requestId, 'Full request object:', request);

      // Check if request is already approved
      const isRequestApproved = request.status === 'approved' || request.status === 'Approved';
      console.log('🔍 Request status:', request.status, '- Is Approved:', isRequestApproved);
      setIsApproved(isRequestApproved);

      const data = await rentalAllocationApi.fetchRequestDetails(requestId);
      let itemsWithAvailability = data.items || [];
      
      console.log('📦 Raw items from API:', itemsWithAvailability);
      
      // Map fields - skip availability check to avoid 404 errors
      itemsWithAvailability = itemsWithAvailability.map((item, index) => {
        // Ensure spare_request_item_id is unique and properly set
        const itemId = item.spare_request_item_id || item.id || `item-${index}`;
        
        // Map API field names to component field names
        const mappedItem = {
          id: itemId,
          spare_request_item_id: itemId,
          spare_id: item.spare_id,
          partCode: item.spare_part_code,
          spare_part_code: item.spare_part_code,
          description: item.spare_part_name,
          spare_part_name: item.spare_part_name,
          requestedQty: item.quantity_requested,
          quantity_requested: item.quantity_requested,
          approvedQty: item.approved_qty || 0,
          index: index,
          available: item.available_qty || 0 // Get available from API instead of 0
        };
        
        console.log(`🔍 Mapped item ${index}:`, mappedItem);
        return mappedItem;
      });
      
      console.log('📊 All items with availability:', itemsWithAvailability);
      setParts(itemsWithAvailability);
      
      // Initialize allocations with unique item IDs - each item gets its own state entry
      const initialAllocations = {};
      itemsWithAvailability.forEach((item, idx) => {
        const itemId = item.spare_request_item_id;
        // Always use approved quantity from API if available, otherwise 0
        const qty = item.approvedQty || 0;
        initialAllocations[itemId] = qty;
        console.log(`🔑 Allocations key [${idx}] = ${itemId} -> ${qty} (approvedQty: ${item.approvedQty})`);
      });
      
      console.log('🎯 Initial allocations:', initialAllocations);
      setAllocations(initialAllocations);
    } catch (error) {
      console.error('Error fetching details:', error);
      // Fallback to sample data
      const isRequestApproved = request?.status === 'approved' || request?.status === 'Approved';
      
      const fallbackItems = (request?.items || []).map((item, index) => {
        const itemId = item.spare_request_item_id || item.id || `item-${index}`;
        return {
          id: itemId,
          spare_request_item_id: itemId,
          spare_id: item.spare_id,
          partCode: item.spare_part_code,
          spare_part_code: item.spare_part_code,
          description: item.spare_part_name,
          spare_part_name: item.spare_part_name,
          requestedQty: item.quantity_requested,
          quantity_requested: item.quantity_requested,
          approvedQty: item.approved_qty || 0,
          index: index,
          available: item.available_qty || 0
        };
      });
      setParts(fallbackItems);
      const initialAllocations = {};
      fallbackItems.forEach(item => {
        initialAllocations[item.spare_request_item_id] = item.approvedQty || 0;
      });
      setAllocations(initialAllocations);
    }
    setLoading(false);
  }, [request]);

  useEffect(() => {
    if (request) {
      fetchRequestDetails();
    }
  }, [request, fetchRequestDetails]);

  /* Commented out - availability is now fetched automatically on page load
  const handleCheckAvailability = async (part) => {
    if (!part.sku) {
      console.error('Part SKU is missing!');
      return;
    }

    try {
      const data = await rentalAllocationApi.checkSpareAvailability(part.sku);
      // Update the part with available qty
      setParts(parts.map(p => p.sku === part.sku ? { ...p, available: data.available } : p));
    } catch (error) {
      console.error('Error checking availability:', error);
      // Fallback: set mock available quantity for testing
      const mockAvailable = Math.floor(Math.random() * 10) + 1; // Random 1-10
      setParts(parts.map(p => p.sku === part.sku ? { ...p, available: mockAvailable } : p));
    }
  };
  */

  const handleAllocationChange = (itemId, value, part) => {
    // Prevent changes if request is already approved
    if (isApproved) {
      console.log('⛔ Cannot modify - Request is already approved');
      return;
    }

    const requestedQty = part?.quantity_requested || 0;
    const availableQty = part?.available || 0;
    const maxAllowable = Math.min(requestedQty, availableQty);
    
    let newValue = parseInt(value) || 0;
    
    // Enforce bounds: 0 to min(requested, available)
    newValue = Math.max(0, Math.min(newValue, maxAllowable));
    
    console.log(`📝 Allocation change - Item ${itemId}, Requested: ${requestedQty}, Available: ${availableQty}, NewValue: ${newValue}`);
    
    setAllocations(prevAllocations => ({
      ...prevAllocations,
      [itemId]: newValue
    }));
  };

  const handleOrder = (part) => {
    // Implement order logic, perhaps add to cart
    alert(`Add to cart functionality not implemented yet for ${part.sku}`);
  };

  const getPartStatus = (part) => {
    const availableQty = part.available || 0;
    const requestedQty = part.quantity_requested || 0;
    // Status is "Completed" only if there is NO shortage (available >= requested)
    return availableQty >= requestedQty ? 'Completed' : 'Pending';
  };

  const canAllocate = () => {
    // Cannot allocate if already approved
    if (isApproved) {
      console.log('❌ Cannot allocate - Request already approved');
      return false;
    }

    // Can only allocate if:
    // 1. ALL parts have "Completed" status (no shortage for any part)
    // 2. Each allocated quantity is valid (> 0 and within bounds)
    
    const allCompleted = parts.every(part => getPartStatus(part) === 'Completed');
    
    if (!allCompleted) {
      console.log('❌ Cannot allocate - Not all parts are completed');
      return false;
    }

    // Check if at least one part is allocated and all allocations are valid
    const hasAllocations = parts.some(part => (allocations[part.spare_request_item_id] || 0) > 0);
    
    if (!hasAllocations) {
      console.log('❌ Cannot allocate - No allocations made');
      return false;
    }

    const allValidAllocations = parts.every(part => {
      const allocatedQty = allocations[part.spare_request_item_id] || 0;
      const availableQty = part.available || 0;
      const requestedQty = part.quantity_requested || 0;
      const isValid = allocatedQty <= availableQty && allocatedQty <= requestedQty;
      
      if (!isValid) {
        console.log(`❌ Invalid allocation for ${part.spare_part_code}: allocated=${allocatedQty}, available=${availableQty}, requested=${requestedQty}`);
      }
      return isValid;
    });
    
    console.log('✅ canAllocate:', allCompleted && hasAllocations && allValidAllocations);
    return allCompleted && hasAllocations && allValidAllocations;
  };

  const handleAllocate = async () => {
    if (!canAllocate()) {
      alert('Cannot allocate: Not all parts are available in sufficient quantity.');
      return;
    }

    if (!request || !request.requestId) {
      alert('Error: Request ID is missing');
      return;
    }

    try {
      // Transform allocations to the format expected by the API
      // allocations format: { spare_request_item_id: qty, ... }
      // API expects: { approvedItems: [{ spare_request_item_id, approvedQty }, ...] }
      const approvedItems = parts
        .map(part => {
          const allocatedQty = allocations[part.spare_request_item_id] || 0;
          console.log(`📋 Part ${part.spare_part_code}: allocated=${allocatedQty}, available=${part.available}, requested=${part.quantity_requested}`);
          return {
            spare_request_item_id: part.spare_request_item_id,
            approvedQty: allocatedQty,
            remarks: 'Approved from service center inventory'
          };
        })
        .filter(item => item.approvedQty > 0);

      if (approvedItems.length === 0) {
        alert('Please select at least one spare part to allocate');
        return;
      }

      console.log('📤 Approving request:', request.requestId);
      console.log('📋 Total items in request:', parts.length);
      console.log('📋 Items being approved:', approvedItems.length);
      console.log('📋 Sending Items:', JSON.stringify(approvedItems, null, 2));
      
      // Call the approve endpoint 
      const response = await rentalAllocationApi.approveSpareParts(request.requestId, { approvedItems });
      
      console.log('✅ Allocation successful:', response);
      alert('✅ Spares allocated successfully!');
      onBack();
    } catch (error) {
      console.error('❌ Error allocating:', error);
      const errorMsg = error.message || 'Unknown error occurred';
      alert(`❌ Allocation failed:\n${errorMsg}`);
    }
  };

  const handleViewCart = () => {
    // Implement view cart
    alert('View cart functionality not implemented yet');
  };

  return {
    parts,
    loading,
    allocations,
    isApproved,
    handleAllocationChange,
    handleOrder,
    getPartStatus,
    canAllocate,
    handleAllocate,
    handleViewCart
  };
};
