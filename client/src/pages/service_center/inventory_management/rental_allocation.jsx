// import React, { useState, useEffect } from 'react';

// const RentalAllocation = () => {
//   const [view, setView] = useState('list'); // 'list' or 'detail'
//   const [requests, setRequests] = useState([]);
//   const [selectedRequest, setSelectedRequest] = useState(null);
//   const [filters, setFilters] = useState({
//     fromDate: '',
//     toDate: '',
//     callId: '',
//     technician: '',
//     status: 'All'
//   });
//   const [loading, setLoading] = useState(false);

//   useEffect(() => {
//     if (view === 'list') {
//       fetchRequests();
//     }
//   }, [view, filters]);

//   const fetchRequests = async () => {
//     setLoading(true);
//     try {
//       const queryParams = new URLSearchParams();
//       Object.entries(filters).forEach(([key, value]) => {
//         if (value) queryParams.append(key, value);
//       });
//       const response = await fetch(`/api/spare-requests?${queryParams}`, {
//         headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
//       });
//       if (!response.ok) throw new Error('Failed to fetch');
//       const data = await response.json();
//       setRequests(data);
//     } catch (error) {
//       console.error('Error fetching requests:', error);
//     }
//     setLoading(false);
//   };

//   const handleFilterChange = (e) => {
//     setFilters({ ...filters, [e.target.name]: e.target.value });
//   };

//   const handleViewDetail = (request) => {
//     setSelectedRequest(request);
//     setView('detail');
//   };

//   const handleBack = () => {
//     setView('list');
//     setSelectedRequest(null);
//   };

//   if (view === 'list') {
//     return (
//       <div className="p-6">
//         <h1 className="text-2xl font-bold mb-4">Rental Allocation</h1>
//         <div className="mb-4 flex flex-wrap gap-4">
//           <div>
//             <label className="block text-sm font-medium">Request From Date:</label>
//             <input
//               type="date"
//               name="fromDate"
//               value={filters.fromDate}
//               onChange={handleFilterChange}
//               className="border p-2 rounded"
//             />
//           </div>
//           <div>
//             <label className="block text-sm font-medium">To Date:</label>
//             <input
//               type="date"
//               name="toDate"
//               value={filters.toDate}
//               onChange={handleFilterChange}
//               className="border p-2 rounded"
//             />
//           </div>
//           <div>
//             <label className="block text-sm font-medium">Call Id:</label>
//             <input
//               type="text"
//               name="callId"
//               value={filters.callId}
//               onChange={handleFilterChange}
//               className="border p-2 rounded"
//             />
//           </div>
//           <div>
//             <label className="block text-sm font-medium">Technician:</label>
//             <input
//               type="text"
//               name="technician"
//               value={filters.technician}
//               onChange={handleFilterChange}
//               className="border p-2 rounded"
//             />
//           </div>
//           <div>
//             <label className="block text-sm font-medium">Request Status:</label>
//             <select
//               name="status"
//               value={filters.status}
//               onChange={handleFilterChange}
//               className="border p-2 rounded"
//             >
//               <option value="All">All</option>
//               <option value="Pending">Pending</option>
//               <option value="Completed">Completed</option>
//             </select>
//           </div>
//           <button
//             onClick={fetchRequests}
//             className="bg-blue-500 text-black px-4 py-2 rounded mt-6"
//           >
//             Search
//           </button>
//           {/* <button
//             onClick={() => setView('return')}
//             className="bg-green-500 text-black px-4 py-2 rounded mt-6 ml-4"
//           >
//             Rental Return
//           </button> */}
//         </div>
//         <div className="mb-4">
//           <p>Total Pending Request: {requests.filter(r => r.status === 'Pending').length}</p>
//         </div>
//         <table className="w-full border-collapse border border-gray-300">
//           <thead>
//             <tr className="bg-gray-100">
//               <th className="border border-gray-300 p-2">Request ID</th>
//               <th className="border border-gray-300 p-2">Requested by Technician</th>
//               <th className="border border-gray-300 p-2">Call ID</th>
//               <th className="border border-gray-300 p-2">Request Status</th>
//               <th className="border border-gray-300 p-2">Action</th>
//             </tr>
//           </thead>
//           <tbody>
//             {requests.map((req) => (
//               <tr key={req.id}>
//                 <td className="border border-gray-300 p-2">{req.requestId}</td>
//                 <td className="border border-gray-300 p-2">{req.technicianName}</td>
//                 <td className="border border-gray-300 p-2">{req.callId}</td>
//                 <td className="border border-gray-300 p-2">{req.status}</td>
//                 <td className="border border-gray-300 p-2">
//                   <button
//                     onClick={() => handleViewDetail(req)}
//                     className="bg-blue-500 text-black px-2 py-1 rounded">View
//                   </button>
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>
//     );
//   }

//   if (view === 'detail') {
//     return <RequestDetail request={selectedRequest} onBack={handleBack} />;
//   }

//   if (view === 'return') {
//     return <RentalReturn onBack={handleBack} />;
//   }
// };

// const RequestDetail = ({ request, onBack }) => {
//   const [parts, setParts] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [allocations, setAllocations] = useState({});
//   const [cart, setCart] = useState([]);

//   useEffect(() => {
//     fetchRequestDetails();
//   }, [request]);

//   const fetchRequestDetails = async () => {
//     setLoading(true);
//     try {
//       const response = await fetch(`/api/spare-requests/${request.id}`, {
//         headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
//       });
//       if (!response.ok) throw new Error('Failed to fetch details');
//       const data = await response.json();
//       setParts(data.items);
//       // Initialize allocations
//       const initialAllocations = {};
//       data.items.forEach(item => {
//         initialAllocations[item.id] = item.requestedQty;
//       });
//       setAllocations(initialAllocations);
//     } catch (error) {
//       console.error('Error fetching details:', error);
//     }
//     setLoading(false);
//   };

// const handleCheckAvailability = async (partId) => {
//     try {
//       const response = await fetch(`/api/spare-requests/${partId}/availability`, {
//         headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
//       });
//       if (!response.ok) throw new Error('Failed to check availability');
//       const data = await response.json();
//       // Update the part with available qty
//       setParts(parts.map(p => p.id === partId ? {
//         ...p,
//         available: data.available,
//         availabilityStatus: data.available === 0 ? 'unavailable' : 'available'
//       } : p));
//     } catch (error) {
//       console.error('Error checking availability:', error);
//       // Set availability status to unavailable on error
//       setParts(parts.map(p => p.id === partId ? {
//         ...p,
//         available: 0,
//         availabilityStatus: 'unavailable'
//       } : p));
//     }
//   };

//   const handleAllocationChange = (partId, value) => {
//     setAllocations({ ...allocations, [partId]: parseInt(value) || 0 });
//   };

//   const handleOrder = (partId) => {
//     const part = parts.find(p => p.id === partId);
//     if (part) {
//       const shortage = Math.max(0, allocations[partId] - (part.available || 0));
//       if (shortage > 0) {
//         setCart(prev => [...prev, {
//           ...part,
//           orderQty: shortage
//         }]);
//         alert(`Added ${shortage} ${part.spareName} to cart`);
//       }
//     }
//   };

//   const canAllocate = () => {
//     return parts.every(part => (part.available || 0) >= allocations[part.id]);
//   };

//   const handleAllocate = async () => {
//     if (!canAllocate()) {
//       alert('Cannot allocate: Not all parts are available in sufficient quantity.');
//       return;
//     }
//     try {
//       const response = await fetch(`/api/spare-requests/${request.id}/allocate`, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           Authorization: `Bearer ${localStorage.getItem('token')}`
//         },
//         body: JSON.stringify({ allocations })
//       });
//       if (!response.ok) throw new Error('Allocation failed');
//       alert('Allocated successfully');
//       onBack();
//     } catch (error) {
//       console.error('Error allocating:', error);
//       alert('Allocation failed');
//     }
//   };

//   const handleOrderFromBranch = async () => {
//     try {
//       const response = await fetch(`/api/spare-requests/${request.id}/order-from-branch`, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           Authorization: `Bearer ${localStorage.getItem('token')}`
//         },
//         body: JSON.stringify({ cartItems: cart })
//       });
//       if (!response.ok) throw new Error('Order failed');
//       alert('Ordered from branch successfully');
//       setCart([]);
//       // Refresh parts availability
//       fetchRequestDetails();
//     } catch (error) {
//       console.error('Error ordering from branch:', error);
//       alert('Order from branch failed');
//     }
//   };

//   const handleViewCart = () => {
//     if (cart.length === 0) {
//       alert('Cart is empty');
//       return;
//     }
//     const cartSummary = cart.map(item => `${item.orderQty} x ${item.spareName}`).join('\n');
//     if (confirm(`Cart contents:\n${cartSummary}\n\nOrder from branch?`)) {
//       handleOrderFromBranch();
//     }
//   };

//   return (
//     <div className="p-6">
//       <button onClick={onBack} className="mb-4 bg-gray-500 text-black px-4 py-2 rounded">Back</button>
//       <div className="mb-4">
//         <div className="flex gap-4 mb-2">
//           <div>
//             <label className="block text-sm font-medium">Request ID:</label>
//             <input type="text" value={request.requestId} readOnly className="border p-2 rounded" />
//           </div>
//           <div>
//             <label className="block text-sm font-medium">Technician:</label>
//             <input type="text" value={request.technicianName} readOnly className="border p-2 rounded" />
//           </div>
//         </div>
//         <div className="flex gap-4 mb-2">
//           <div>
//             <label className="block text-sm font-medium">Created At:</label>
//             <input type="text" value={new Date(request.createdAt).toLocaleDateString()} readOnly className="border p-2 rounded" />
//           </div>
//           <div>
//             <label className="block text-sm font-medium">Call Id:</label>
//             <input type="text" value={request.callId} readOnly className="border p-2 rounded" />
//           </div>
//         </div>
//       </div>
//       <h2 className="text-xl font-bold mb-4">Requested Spare Part List:</h2>
//       <table className="w-full border-collapse border border-gray-300 mb-4">
//         <thead>
//           <tr className="bg-gray-100">
//             <th className="border border-gray-300 p-2">Part code</th>
//             <th className="border border-gray-300 p-2">Part Description</th>
//             <th className="border border-gray-300 p-2">Requested QTY</th>
//             <th className="border border-gray-300 p-2">Check Availability</th>
//             <th className="border border-gray-300 p-2">No. Of Spares Available</th>
//             <th className="border border-gray-300 p-2">Allocate No. Of Spares</th>
//             <th className="border border-gray-300 p-2">Order Spares</th>
//             <th className="border border-gray-300 p-2">Shortage</th>
//             <th className="border border-gray-300 p-2">Status</th>
//           </tr>
//         </thead>
//         <tbody>
//           {parts.map((part) => (
//             <tr key={part.id}>
//               <td className="border border-gray-300 p-2">{part.partCode}</td>
//               <td className="border border-gray-300 p-2">{part.description}</td>
//               <td className="border border-gray-300 p-2">{part.requestedQty}</td>
//               <td className="border border-gray-300 p-2">
//                 <button
//                   onClick={() => handleCheckAvailability(part.id)}
//                   className="bg-blue-500 text-black px-2 py-1 rounded"
// >Check
//                 </button>
//               </td>
//               <td className="border border-gray-300 p-2">{part.available || 0}</td>
//               <td className="border border-gray-300 p-2">
//                 <input
//                   type="number"
//                   value={allocations[part.id] || 0}
//                   onChange={(e) => handleAllocationChange(part.id, e.target.value)}
//                   className="border p-1 w-16"
//                   min="0"
//                   max={part.available || 0}/>
//               </td>
//               <td className="border border-gray-300 p-2">
//                 <button
//                   onClick={() => handleOrder(part.id)}
//                   className="bg-green-500 text-black px-2 py-1 rounded">Add to cart
//                 </button>
//               </td>
//               <td className="border border-gray-300 p-2">{Math.max(0, allocations[part.id] - (part.available || 0))}</td>
//               <td className="border border-gray-300 p-2">
//                 {(part.available || 0) >= allocations[part.id] ? 'Completed' : 'Pending'}
//               </td>
//             </tr>
//           ))}
//         </tbody>
//       </table>
//       <div className="flex gap-4">
//         <button
//           onClick={handleViewCart}
//           className="bg-blue-500 text-black px-4 py-2 rounded"
//         >
//           View Cart
//         </button>
//         <button
//           onClick={handleAllocate}
//           disabled={!canAllocate()}
//           className={`px-4 py-2 rounded ${canAllocate() ? 'bg-green-500 text-black' : 'bg-gray-500 text-gray-300'}`}
//         >
//           Allocate
//         </button>
//       </div>
//     </div>
//   );
// };

// const RentalReturn = ({ onBack }) => {
//   const [technicians, setTechnicians] = useState([]);
//   const [selectedTechnician, setSelectedTechnician] = useState('');
//   const [technicianInventory, setTechnicianInventory] = useState([]);
//   const [returns, setReturns] = useState({});
//   const [loading, setLoading] = useState(false);

//   useEffect(() => {
//     fetchTechnicians();
//   }, []);

//   useEffect(() => {
//     if (selectedTechnician) {
//       fetchTechnicianInventory();
//     }
//   }, [selectedTechnician]);

//   const fetchTechnicians = async () => {
//     try {
//       const response = await fetch('/api/technicians', {
//         headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
//       });
//       if (!response.ok) throw new Error('Failed to fetch technicians');
//       const data = await response.json();
//       setTechnicians(data);
//     } catch (error) {
//       console.error('Error fetching technicians:', error);
//     }
//   };

//   const fetchTechnicianInventory = async () => {
//     try {
//       const response = await fetch(`/api/technicians/${selectedTechnician}/inventory`, {
//         headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
//       });
//       if (!response.ok) throw new Error('Failed to fetch inventory');
//       const data = await response.json();
//       setTechnicianInventory(data);
//       // Initialize returns
//       const initialReturns = {};
//       data.forEach(item => {
//         initialReturns[item.id] = { goodQty: 0, defectiveQty: 0 };
//       });
//       setReturns(initialReturns);
//     } catch (error) {
//       console.error('Error fetching technician inventory:', error);
//     }
//   };

//   const handleReturnChange = (itemId, type, value) => {
//     setReturns(prev => ({
//       ...prev,
//       [itemId]: {
//         ...prev[itemId],
//         [type]: parseInt(value) || 0
//       }
//     }));
//   };

//   const handleReturn = async () => {
//     const returnItems = Object.entries(returns)
//       .filter(([_, quantities]) => quantities.goodQty > 0 || quantities.defectiveQty > 0)
//       .map(([itemId, quantities]) => {
//         const item = technicianInventory.find(i => i.id === parseInt(itemId));
//         return {
//           sku: item.sku,
//           goodQty: quantities.goodQty,
//           defectiveQty: quantities.defectiveQty
//         };
//       });

//     if (returnItems.length === 0) {
//       alert('No items to return');
//       return;
//     }

//     try {
//       const response = await fetch(`/api/spare-requests/return/${selectedTechnician}`, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           Authorization: `Bearer ${localStorage.getItem('token')}`
//         },
//         body: JSON.stringify({ returns: returnItems })
//       });
//       if (!response.ok) throw new Error('Return failed');
//       alert('Parts returned successfully');
//       fetchTechnicianInventory(); // Refresh inventory
//     } catch (error) {
//       console.error('Error returning parts:', error);
//       alert('Return failed');
//     }
//   };

//   return (
//     <div className="p-6">
//       <button onClick={onBack} className="mb-4 bg-gray-500 text-black px-4 py-2 rounded">Back</button>
//       <h1 className="text-2xl font-bold mb-4">Rental Return</h1>
      
//       <div className="mb-4">
//         <label className="block text-sm font-medium mb-2">Select Technician:</label>
//         <select
//           value={selectedTechnician}
//           onChange={(e) => setSelectedTechnician(e.target.value)}
//           className="border p-2 rounded"
//         >
//           <option value="">Select Technician</option>
//           {technicians.map(tech => (
//             <option key={tech.id} value={tech.id}>{tech.name}</option>
//           ))}
//         </select>
//       </div>

//       {selectedTechnician && (
//         <div>
//           <h2 className="text-xl font-bold mb-4">Technician Inventory</h2>
//           <table className="w-full border-collapse border border-gray-300 mb-4">
//             <thead>
//               <tr className="bg-gray-100">
//                 <th className="border border-gray-300 p-2">SKU</th>
//                 <th className="border border-gray-300 p-2">Part Name</th>
//                 <th className="border border-gray-300 p-2">Good Qty</th>
//                 <th className="border border-gray-300 p-2">Defective Qty</th>
//                 <th className="border border-gray-300 p-2">Return Good Qty</th>
//                 <th className="border border-gray-300 p-2">Return Defective Qty</th>
//               </tr>
//             </thead>
//             <tbody>
//               {technicianInventory.map((item) => (
//                 <tr key={item.id}>
//                   <td className="border border-gray-300 p-2">{item.sku}</td>
//                   <td className="border border-gray-300 p-2">{item.spareName}</td>
//                   <td className="border border-gray-300 p-2">{item.goodQty}</td>
//                   <td className="border border-gray-300 p-2">{item.defectiveQty}</td>
//                   <td className="border border-gray-300 p-2">
//                     <input
//                       type="number"
//                       value={returns[item.id]?.goodQty || 0}
//                       onChange={(e) => handleReturnChange(item.id, 'goodQty', e.target.value)}
//                       className="border p-1 w-20"
//                       min="0"
//                       max={item.goodQty}
//                     />
//                   </td>
//                   <td className="border border-gray-300 p-2">
//                     <input
//                       type="number"
//                       value={returns[item.id]?.defectiveQty || 0}
//                       onChange={(e) => handleReturnChange(item.id, 'defectiveQty', e.target.value)}
//                       className="border p-1 w-20"
//                       min="0"
//                       max={item.defectiveQty}
//                     />
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//           <button
//             onClick={handleReturn}
//             className="bg-red-500 text-white px-4 py-2 rounded"
//           >
//             Return Parts
//           </button>
//         </div>
//       )}
//     </div>
//   );
// };

// export default RentalAllocation;

import React, { useState, useEffect } from 'react';
import './rental_allocation.css';
import { getApiUrl } from '../../../config/apiConfig';

// ========== TEST HELPER FUNCTIONS (Development) ==========
/**
 * Fetch a test JWT token from the server for a given Service Center ID
 * Usage in browser console: getTestToken(2)
 */
window.getTestToken = async (centerId = 2) => {
  try {
    console.log(`📞 Requesting test token for SC ${centerId}...`);
    const response = await fetch(getApiUrl('/auth/test-token') + `?centerId=${centerId}`);
    const data = await response.json();
    
    if (data.token) {
      localStorage.setItem('token', data.token);
      console.log(`✅ Test token acquired and stored for SC ${centerId}`);
      console.log(`   Payload:`, data.payload);
      console.log(`   Token: ${data.token.substring(0, 50)}...`);
      console.log('   Reload page or click Search to fetch requests');
      return data.token;
    } else {
      console.error('❌ No token received:', data);
    }
  } catch (e) {
    console.error('❌ Error getting test token:', e.message);
  }
};

const RentalAllocation = () => {
  const [activeTab, setActiveTab] = useState('rental');
  const [view, setView] = useState('list'); // 'list' or 'detail'
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [filters, setFilters] = useState({
    fromDate: '',
    toDate: '',
    callId: '',
    technician: '',
    status: 'All'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    console.log('📌 Component mounted, activeTab:', activeTab);
    if (activeTab === 'rental') {
      console.log('✅ Fetching requests...');
      fetchRequests();
    }
  }, [activeTab]);

  const fetchRequests = async () => {
    setLoading(true);
    setError('');
    try {
      let token = localStorage.getItem('token');
      
      // If no token, try fetching without auth header or with a basic test SC ID
      // For development, we'll use SC ID 1 or 2 from the database
      if (!token) {
        console.warn('⚠️ No token in localStorage, attempting to fetch requests...');
        console.log('💡 TIP: For testing, please log in with a Service Center user account');
        // Don't use a hardcoded test token - let backend handle it
        // OR set localStorage: localStorage.setItem('token', 'your-token-here')
      }
      
      const apiUrl = getApiUrl('/technician-sc-spare-requests/rental-allocation');
      console.log('🔍 Fetching technician spare requests...');
      console.log('📍 API URL:', apiUrl);
      console.log('🔑 Token provided:', !!token);

      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ API Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('✅ API Response data:', data);
      
      const requestsData = data.data || [];
      console.log('📊 Requests count:', requestsData.length);
      console.log('📋 Request list with items:');
      requestsData.forEach((req, idx) => {
        console.log(`  ${idx + 1}. Request ${req.requestId}:`);
        console.log(`     - Has items property: ${!!req.items}`);
        console.log(`     - Items is array: ${Array.isArray(req.items)}`);
        if (req.items) {
          console.log(`     - Items count: ${req.items.length}`);
          if (req.items.length > 0) {
            console.log(`     - First item:`, req.items[0]);
          }
        }
      });
      
      setRequests(requestsData);
      if (requestsData.length === 0) {
        console.log('⚠️ No requests found in response');
        setError('No technician spare requests available');
      } else {
        console.log('✅ Successfully loaded', requestsData.length, 'requests');
      }
    } catch (err) {
      console.error('❌ Error fetching requests:', err);
      console.error('Error details:', {
        message: err.message,
        stack: err.stack
      });
      setError(err.message || 'Failed to fetch technician spare requests');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = (request) => {
    console.log('🔎 handleViewDetail called with request:', request);
    console.log('   Request ID:', request.requestId);
    console.log('   Has items?', !!request.items);
    if (request.items) {
      console.log('   Items count:', request.items.length);
      console.log('   First item:', request.items[0]);
    } else {
      console.log('   ❌ NO ITEMS ARRAY IN REQUEST');
    }
    setSelectedRequest(request);
    setView('detail');
  };

  const handleBack = () => {
    setView('list');
    setSelectedRequest(null);
  };

  if (view === 'list') {
    return (
      <div className="p-6">
        <div className="mb-4">
          <h1 className="text-2xl font-bold mb-4">Rental Allocation</h1>
          
          <div className="mb-4 grid grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Request From Date:</label>
              <input
                type="date"
                value={filters.fromDate}
                onChange={(e) => setFilters({...filters, fromDate: e.target.value})}
                className="border p-2 rounded w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">To Date:</label>
              <input
                type="date"
                value={filters.toDate}
                onChange={(e) => setFilters({...filters, toDate: e.target.value})}
                className="border p-2 rounded w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Call Id:</label>
              <input
                type="text"
                value={filters.callId}
                onChange={(e) => setFilters({...filters, callId: e.target.value})}
                placeholder="Enter Call ID"
                className="border p-2 rounded w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Technician:</label>
              <input
                type="text"
                value={filters.technician}
                onChange={(e) => setFilters({...filters, technician: e.target.value})}
                placeholder="Enter Technician Name"
                className="border p-2 rounded w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status:</label>
              <select 
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
                className="border p-2 rounded w-full"
              >
                <option value="All">All</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={fetchRequests}
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 h-10"
              >
                {loading ? '⏳ Searching...' : '🔍 Search'}
              </button>
              <button
                onClick={() => window.getTestToken(2)}
                title="Get test token for SC 2 from server"
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 text-sm h-10"
              >
                🔐 Get Test Token
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            <strong>Error:</strong> {error}
          </div>
        )}

        {loading && <div className="text-center py-4 text-blue-600 font-semibold">⏳ Loading requests...</div>}

        {!loading && requests.length === 0 && !error && (
          <div className="text-center py-8 text-gray-500">
            <p className="text-lg">📭 No requests found</p>
            <p className="text-sm text-gray-400 mt-2">No technician spare requests available for this service center</p>
          </div>
        )}

        {!loading && requests.length === 0 && error && (
          <div className="text-center py-8 text-gray-500">
            <p className="text-lg">❌ Could not load requests</p>
            <p className="text-sm text-gray-400 mt-2">{error}</p>
          </div>
        )}

        {!loading && requests.length > 0 && (
          <div className="overflow-x-auto">
            {console.log('📋 Rendering requests list with', requests.length, 'requests')}
            {requests.map((r, idx) => {
              console.log(`Request ${idx}:`, {
                requestId: r.requestId,
                hasItems: !!r.items,
                itemsCount: r.items?.length || 0,
                itemsArray: r.items
              });
              return null;
            })}
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-2">Request ID</th>
                  <th className="border border-gray-300 p-2">Call ID</th>
                  <th className="border border-gray-300 p-2">Technician</th>
                  <th className="border border-gray-300 p-2">Items Count</th>
                  <th className="border border-gray-300 p-2">Status</th>
                  <th className="border border-gray-300 p-2">Requested Date</th>
                  <th className="border border-gray-300 p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request.requestId} onClick={() => console.log('📍 Clicked request:', request)}>
                    <td className="border border-gray-300 p-2 font-semibold">{request.requestId}</td>
                    <td className="border border-gray-300 p-2">{request.call_id || 'N/A'}</td>
                    <td className="border border-gray-300 p-2">{request.technicianName}</td>
                    <td className="border border-gray-300 p-2 text-center">{request.items?.length || 0}</td>
                    <td className="border border-gray-300 p-2">
                      <span className="inline-block px-2 py-1 rounded text-xs font-semibold bg-yellow-100 text-yellow-800">
                        {request.status || 'pending'}
                      </span>
                    </td>
                    <td className="border border-gray-300 p-2 text-sm">
                      {new Date(request.createdAt).toLocaleDateString()}
                    </td>
                    <td className="border border-gray-300 p-2">
                      <button
                        onClick={() => handleViewDetail(request)}
                        className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  if (view === 'detail') {
    return <RequestDetail request={selectedRequest} onBack={handleBack} />;
  }
};

const RequestDetail = ({ request, onBack }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [itemApprovals, setItemApprovals] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // Alert to show component loaded
  console.log('🚀 RequestDetail component RENDERED');
  console.log('   Props received:');
  console.log('   - request:', request);
  console.log('   - request.requestId:', request?.requestId);
  console.log('   - onBack:', typeof onBack);


  useEffect(() => {
    console.log('🎯 RequestDetail MOUNTED with request prop:', request);
    
    if (!request) {
      console.warn('⚠️ No request prop provided to RequestDetail!');
      setItems([]);
      return;
    }
    
    console.log(`📌 RequestDetail - Request ID: ${request.requestId}`);
    console.log(`📌 RequestDetail - Request obj keys:`, Object.keys(request));
    console.log(`📌 RequestDetail - Has items?: ${!!request.items}`);
    console.log(`📌 RequestDetail - Items type: ${typeof request.items}`);
    console.log(`📌 RequestDetail - Is Array?: ${Array.isArray(request.items)}`);
    
    // Log full request object to see structure
    console.log('📄 Full request object:');
    console.log(JSON.stringify(request, (key, value) => {
      // Don't stringify huge arrays inline
      if (Array.isArray(value) && value.length > 3) {
        return `[Array of ${value.length} items]`;
      }
      return value;
    }, 2));
    
    if (Array.isArray(request.items)) {
      console.log(`📌 RequestDetail - Items length: ${request.items.length}`);
      if (request.items.length > 0) {
        console.log(`📌 First item keys:`, Object.keys(request.items[0]));
        console.log(`📌 First item:`, request.items[0]);
      }
    } else if (request.items !== undefined) {
      console.warn(`⚠️ request.items exists but is not an array!`, typeof request.items);
    }
    
    // Continue with item processing
    if (request && request.items && request.items.length > 0) {
      console.log('✅ BRANCH A: Items from request prop');
      
      // Map API response fields to component fields
      const mappedItems = request.items.map((item, idx) => {
        const mapped = {
          id: item.itemId,
          spare_id: item.spareId,
          spare_code: item.partCode,
          spare_desc: item.partDescription,
          description: item.partDescription,
          partCode: item.partCode,
          requestedQty: item.requestedQty,
          approvedQty: item.approvedQty || 0,
          availableQty: item.availableQty || 0,
          availability_status: item.availability_status
        };
        return mapped;
      });
      
      console.log('✅ Mapped', mappedItems.length, 'items. First:', mappedItems[0]);
      setItems(mappedItems);
      
      // Initialize item approvals
      const initialApprovals = {};
      mappedItems.forEach(item => {
        const itemKey = `item_${item.id || item.spare_id}`;
        initialApprovals[itemKey] = {
          approve: true,
          quantity: item.requestedQty,
          remarks: ''
        };
      });
      setItemApprovals(initialApprovals);
    } else {
      // ALWAYS fetch from API to get the complete data
      console.log('⚠️ BRANCH B: Fetching items from API (items not in request prop or empty)');
      const token = localStorage.getItem('token');
      
      fetch(getApiUrl('/technician-sc-spare-requests/rental-allocation'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      .then(res => res.json())
      .then(data => {
        if (data.data && Array.isArray(data.data)) {
          const foundRequest = data.data.find(r => r.requestId === request?.requestId);
          if (foundRequest && foundRequest.items && foundRequest.items.length > 0) {
            console.log('📥 Found in API response:', foundRequest.requestId, 'with', foundRequest.items.length, 'items');
            console.log('   First item:', foundRequest.items[0]);
            
            const mappedItems = foundRequest.items.map(item => ({
              id: item.itemId,
              spare_id: item.spareId, 
              spare_code: item.partCode,
              spare_desc: item.partDescription,
              description: item.partDescription,
              partCode: item.partCode,
              requestedQty: item.requestedQty,
              approvedQty: item.approvedQty || 0,
              availableQty: item.availableQty || 0,
              availability_status: item.availability_status
            }));
            
            console.log('✅ Mapped from API:', mappedItems.length, 'items. First:', mappedItems[0]);
            setItems(mappedItems);
            
            // Initialize approvals
            const initialApprovals = {};
            mappedItems.forEach(item => {
              const itemKey = `item_${item.id || item.spare_id}`;
              initialApprovals[itemKey] = {
                approve: true,
                quantity: item.requestedQty,
                remarks: ''
              };
            });
            setItemApprovals(initialApprovals);
          } else {
            console.log('❌ Request not found in API or has no items');
            setItems([]);
          }
        }
      })
      .catch(err => {
        console.error('❌ API fetch failed:', err);
        setItems([]);
      });
    }
  }, [request]);

  const handleApprove = async () => {
    setSubmitting(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      
      // Collect approved items
      const approvedItems = [];
      items.forEach(item => {
        const itemKey = `item_${item.id || item.spare_id}`;
        const approval = itemApprovals[itemKey];
        
        if (approval && approval.approve) {
          approvedItems.push({
            spare_request_item_id: item.id,
            spare_part_id: item.spare_id,
            quantity: parseInt(approval.quantity) || item.requestedQty,
            remarks: approval.remarks || ''
          });
        }
      });

      if (approvedItems.length === 0) {
        setError('Please select at least one item to approve');
        setSubmitting(false);
        return;
      }

      console.log('📤 Approving with items:', approvedItems);

      const token = localStorage.getItem('token');
      const response = await fetch(
        `/api/technician-sc-spare-requests/${request.requestId}/approve`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ approvedItems })
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Approval response:', data);

      alert('Request approved successfully! Stock movement created.');
      onBack();
    } catch (err) {
      console.error('❌ Error approving request:', err);
      setError(err.message || 'Failed to approve request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;

    setSubmitting(true);
    setError('');
    try {
      const token = localStorage.getItem('token');

      console.log('📤 Rejecting request with reason:', reason);

      const response = await fetch(
        `/api/technician-sc-spare-requests/${request.requestId}/reject`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ reason })
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Rejection response:', data);

      alert('Request rejected successfully');
      onBack();
    } catch (err) {
      console.error('❌ Error rejecting request:', err);
      setError(err.response?.data?.error || err.message || 'Failed to reject request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleItemCheckbox = (itemId, field, value) => {
    const itemKey = `item_${itemId}`;
    setItemApprovals(prev => ({
      ...prev,
      [itemKey]: {
        ...prev[itemKey],
        [field]: value
      }
    }));
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <button 
        onClick={onBack} 
        className="mb-4 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
      >
        ← Back to List
      </button>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="bg-white p-4 rounded border border-gray-300 mb-4">
        <h2 className="text-xl font-bold mb-4">Request Details</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <label className="text-sm text-gray-600">Request ID</label>
            <p className="font-semibold">{request.requestId}</p>
          </div>
          <div>
            <label className="text-sm text-gray-600">Technician</label>
            <p className="font-semibold">{request.technicianName}</p>
          </div>
          <div>
            <label className="text-sm text-gray-600">Call ID</label>
            <p className="font-semibold">{request.call_id || 'N/A'}</p>
          </div>
          <div>
            <label className="text-sm text-gray-600">Request Type</label>
            <p className="font-semibold capitalize">{request.request_reason || 'N/A'}</p>
          </div>
          <div>
            <label className="text-sm text-gray-600">Created Date</label>
            <p className="font-semibold">{new Date(request.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded border border-gray-300 mb-4">
        <h3 className="text-lg font-bold mb-4">Requested Spare Parts</h3>
        
        {/* DEBUG SECTION */}
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-xs font-mono">
          <div className="font-bold text-blue-900 mb-2">🔍 DEBUG INFO:</div>
          <div>Items count in state: {items.length}</div>
          <div>Items state JSON: {JSON.stringify(items.slice(0, 1), null, 2)}</div>
          <div>Request prop items count: {Array.isArray(request?.items) ? request.items.length : 'N/A'}</div>
        </div>
        
        {items.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>📭 No spare items found in this request</p>
            <p className="text-xs text-gray-400 mt-2">Items may not have been loaded. Check the browser console for details.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b-2 border-gray-300">
                  <th className="border p-2 text-left">Part Code</th>
                  <th className="border p-2 text-left">Description</th>
                  <th className="border p-2 text-center">Requested Qty</th>
                  <th className="border p-2 text-center">Availability</th>
                  <th className="border p-2 text-center">Available Qty</th>
                  <th className="border p-2 text-center">Approve Qty</th>
                  <th className="border p-2 text-center">Approve</th>
                  <th className="border p-2 text-left">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const itemKey = `item_${item.id || item.spare_id}`;
                  const approval = itemApprovals[itemKey];
                  
                  // Get values with multiple fallbacks
                  const partCode = item.spare_code || item.partCode || item.code || 'N/A';
                  const description = item.spare_desc || item.description || 'N/A';
                  const qty = item.requestedQty || item.requested_qty || 0;
                  
                  // Debug logging for each row
                  console.log(`🎯 Rendering item ${itemKey}:`, {
                    item_raw: item,
                    partCode_display: partCode,
                    description_display: description,
                    qty_display: qty
                  });
                  
                  return (
                    <tr key={itemKey} className="border-b border-gray-300 hover:bg-gray-50">
                      <td className="border p-2"><strong>{partCode}</strong></td>
                      <td className="border p-2 text-sm">{description}</td>
                      <td className="border p-2 text-center font-semibold">{qty}</td>
                      <td className="border p-2 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          item.availability_status === 'fully_available' ? 'bg-green-100 text-green-800' :
                          item.availability_status === 'partially_available' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {item.availability_status === 'fully_available' ? '✅ Full' :
                           item.availability_status === 'partially_available' ? '⚠️ Partial' :
                           '❌ Not Available'}
                        </span>
                      </td>
                      <td className="border p-2 text-center font-semibold text-blue-600">
                        {item.availableQty || 0}
                      </td>
                      <td className="border p-2 text-center">
                        <input
                          type="number"
                          value={approval?.quantity || item.requestedQty}
                          onChange={(e) => handleItemCheckbox(item.id || item.spare_id, 'quantity', e.target.value)}
                          className="border border-gray-300 p-1 w-20 text-center rounded"
                          min="0"
                          max={item.availableQty || item.requestedQty}
                          disabled={!approval?.approve}
                        />
                      </td>
                      <td className="border p-2 text-center">
                        <input
                          type="checkbox"
                          checked={approval?.approve || false}
                          onChange={(e) => handleItemCheckbox(item.id || item.spare_id, 'approve', e.target.checked)}
                          className="w-4 h-4"
                        />
                      </td>
                      <td className="border p-2">
                        <input
                          type="text"
                          value={approval?.remarks || ''}
                          onChange={(e) => handleItemCheckbox(item.id || item.spare_id, 'remarks', e.target.value)}
                          placeholder="Add remarks"
                          className="border border-gray-300 p-1 rounded w-full text-sm"
                          disabled={!approval?.approve}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex gap-4 justify-end">
        <button
          onClick={handleReject}
          disabled={submitting}
          className="bg-red-500 text-white px-6 py-2 rounded hover:bg-red-600 disabled:bg-gray-400"
        >
          {submitting ? 'Processing...' : 'Reject Request'}
        </button>
        <button
          onClick={handleApprove}
          disabled={submitting}
          className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
        >
          {submitting ? 'Processing...' : 'Approve & Create Stock Movement'}
        </button>
      </div>
    </div>
  );
};

export default RentalAllocation;