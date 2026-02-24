// import React, { useState, useEffect } from 'react';
// import { useNavigate } from 'react-router-dom';

// const DCFStatus = () => {
//   const [requests, setRequests] = useState([]);
//   const [selectedRequest, setSelectedRequest] = useState('');
//   const [dcfNo, setDcfNo] = useState('');
//   const [dcfStatus, setDcfStatus] = useState('');
//   const [dcfData, setDcfData] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState(null);
//   const navigate = useNavigate();

//   useEffect(() => {
//     fetchReturnRequests();
//   }, []);

//   const fetchReturnRequests = async () => {
//     const token = localStorage.getItem('token');
//     if (!token) {
//       setError('Please log in to access this page');
//       return;
//     }
//     try {
//       const response = await fetch('/api/returns/branch-requests', {
//         headers: {
//           'Authorization': `Bearer ${token}`,
//           'Content-Type': 'application/json'
//         }
//       });
//       if (!response.ok) throw new Error('Failed to fetch return requests');
//       const data = await response.json();
//       setRequests(data);
//       setError(null);
//     } catch (error) {
//       console.error('Error fetching return requests:', error);
//       setError('Failed to load return requests');
//     }
//   };

//   const handleRequestChange = (e) => {
//     setSelectedRequest(e.target.value);
//     // Fetch DCF data based on selected request
//     fetchDCFData(e.target.value);
//   };

//   const fetchDCFData = async (requestId) => {
//     if (!requestId) {
//       setDcfData([]);
//       return;
//     }
//     setLoading(true);
//     try {
//       // Use the existing request details endpoint to build DCF table
//       const token = localStorage.getItem('token');
//       const response = await fetch(`/api/returns/branch-requests/${requestId}/details`, {
//         headers: {
//           'Authorization': `Bearer ${token}`,
//           'Content-Type': 'application/json'
//         }
//       });
//       if (!response.ok) throw new Error('Failed to fetch request details');
//       const data = await response.json();
//       const items = data.items || [];
//       const totalQty = typeof data.totalQty !== 'undefined' ? Number(data.totalQty) : items.reduce((s, it) => s + (Number(it.qtyDcf || it.requestedQty || 0)), 0);
//       const cfApproved = items.reduce((s, it) => s + (Number(it.cfApprovedQty || it.ApprovedQty || 0)), 0);
//       setDcfData([
//         {
//           id: requestId,
//           dcfNo: data.requestNumber || data.requestId || '',
//           totalDcfQty: totalQty,
//           cfApprovedQty: cfApproved,
//           dcfSubmitDate: data.dcfSubmitDate || data.createdAt || '',
//           cfReceiptDate: data.cfReceiptDate || '',
//           cfApprovalDate: data.cfApprovalDate || '',
//           cnDate: data.cnDate || '',
//           cnCount: data.cnCount || '',
//           cnValue: data.cnValue || ''
//         }
//       ]);
//       setError(null);
//       setError(null);
//     } catch (error) {
//       console.error('Error fetching DCF data:', error);
//       setError('Failed to load DCF data');
//       setDcfData([]);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleSearch = () => {
//     // Filter data based on dcfNo and dcfStatus
//     // For now, just refetch or filter existing data
//     fetchDCFData(selectedRequest);
//   };

//   const handleReset = () => {
//     setDcfNo('');
//     setDcfStatus('');
//     fetchDCFData(selectedRequest);
//   };

//   const handleDcfClick = (requestId) => {
//     navigate(`/branch/dcf-details/${requestId}`);
//   };

//   return (
//     <div style={{ padding: '20px' }}>
//       <div style={{ marginBottom: '20px' }}>
//         <label style={{ fontSize: '20px', marginRight: '10px' }}>
//           Spare Part Return Request No.:
//         </label>
//         <select
//           value={selectedRequest}
//           onChange={handleRequestChange}
//           style={{ fontSize: '20px', padding: '5px', width: '300px' }}>
//           <option value="">Select</option>
//           {requests.map(req => (
//             <option key={req.id} value={req.id}>{req.requestId}</option>
//           ))}
//         </select>
//       </div>

//       {selectedRequest && (
//         <>
//           <div style={{ border: '2px solid #000', padding: '20px', marginBottom: '20px' }}>
//             <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
//               <label style={{ fontSize: '20px', marginRight: '10px' }}>DCF No. :</label>
//               <input
//                 type="text"
//                 value={dcfNo}
//                 onChange={(e) => setDcfNo(e.target.value)}
//                 style={{ fontSize: '20px', padding: '5px', width: '200px', marginRight: '20px' }}
//               />
//               <label style={{ fontSize: '20px', marginRight: '10px' }}>DCF Status :</label>
//               <select
//                 value={dcfStatus}
//                 onChange={(e) => setDcfStatus(e.target.value)}
//                 style={{ fontSize: '20px', padding: '5px', width: '200px', marginRight: '20px' }}>
//                 <option value="">Select</option>
//                 <option value="pending">Pending</option>
//                 <option value="approved">Approved</option>
//                 <option value="rejected">Rejected</option>
//               </select>
//               <button
//                 onClick={handleSearch}
//                 style={{
//                   fontSize: '20px',
//                   padding: '10px 20px',
//                   backgroundColor: '#007bff',
//                   color: '#fff',
//                   border: 'none',
//                   borderRadius: '5px',
//                   cursor: 'pointer',
//                   marginRight: '10px'
//                 }}>
//                 Search
//               </button>
//               <button
//                 onClick={handleReset}
//                 style={{
//                   fontSize: '20px',
//                   padding: '10px 20px',
//                   backgroundColor: '#6c757d',
//                   color: '#fff',
//                   border: 'none',
//                   borderRadius: '5px',
//                   cursor: 'pointer'
//                 }}>
//                 Reset
//               </button>
//             </div>
//           </div>

//           <div style={{ marginBottom: '20px' }}>
//             <h2 style={{ fontSize: '25px' }}>DCF Status Report:</h2>
//           </div>

//           <div style={{ border: '2px solid #000', padding: '10px' }}>
//             <table style={{ width: '100%', borderCollapse: 'collapse' }}>
//               <thead>
//                 <tr>
//                   <th style={{ border: '2px solid #000', padding: '10px', fontSize: '20px', textAlign: 'left' }}>DCF No.</th>
//                   <th style={{ border: '2px solid #000', padding: '10px', fontSize: '20px', textAlign: 'left' }}>Total DCF QTY</th>
//                   <th style={{ border: '2px solid #000', padding: '10px', fontSize: '20px', textAlign: 'left' }}>C&F Approved QTY</th>
//                   <th style={{ border: '2px solid #000', padding: '10px', fontSize: '20px', textAlign: 'left' }}>DCF Submit Date</th>
//                   <th style={{ border: '2px solid #000', padding: '10px', fontSize: '20px', textAlign: 'left' }}>C&F Receipt Date</th>
//                   <th style={{ border: '2px solid #000', padding: '10px', fontSize: '20px', textAlign: 'left' }}>C&F Approval/Rejection Date</th>
//                   <th style={{ border: '2px solid #000', padding: '10px', fontSize: '20px', textAlign: 'left' }}>CN Date</th>
//                   <th style={{ border: '2px solid #000', padding: '10px', fontSize: '20px', textAlign: 'left' }}>CN Count</th>
//                   <th style={{ border: '2px solid #000', padding: '10px', fontSize: '20px', textAlign: 'left' }}>CN Value</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {dcfData.map((item, index) => (
//                   <tr key={index}>
//                     <td
//                       style={{ border: '2px solid #000', padding: '10px', fontSize: '20px', cursor: 'pointer', color: 'blue' }}
//                       onClick={() => handleDcfClick(item.id)}>
//                       {item.dcfNo}
//                     </td>
//                     <td style={{ border: '2px solid #000', padding: '10px', fontSize: '20px' }}>{item.totalDcfQty}</td>
//                     <td style={{ border: '2px solid #000', padding: '10px', fontSize: '20px' }}>{item.cfApprovedQty}</td>
//                     <td style={{ border: '2px solid #000', padding: '10px', fontSize: '20px' }}>{item.dcfSubmitDate}</td>
//                     <td style={{ border: '2px solid #000', padding: '10px', fontSize: '20px' }}>{item.cfReceiptDate}</td>
//                     <td style={{ border: '2px solid #000', padding: '10px', fontSize: '20px' }}>{item.cfApprovalDate}</td>
//                     <td style={{ border: '2px solid #000', padding: '10px', fontSize: '20px' }}>{item.cnDate}</td>
//                     <td style={{ border: '2px solid #000', padding: '10px', fontSize: '20px' }}>{item.cnCount}</td>
//                     <td style={{ border: '2px solid #000', padding: '10px', fontSize: '20px' }}>{item.cnValue}</td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         </>
//       )}

//       {loading && <p>Loading...</p>}
//       {error && <p style={{ color: 'red' }}>{error}</p>}
//     </div>
//   );
// };

// export default DCFStatus;


import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const DCFStatus = () => {
  const [dcfData, setDcfData] = useState([]);
  const [filteredDcfData, setFilteredDcfData] = useState([]);
  const [dcfNoFilter, setDcfNoFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAllDCFData();
  }, []);

  useEffect(() => {
    // Filter data based on dcfNoFilter
    if (dcfNoFilter.trim() === '') {
      setFilteredDcfData(dcfData);
    } else {
      const filtered = dcfData.filter(item =>
        item.dcfNo.toString().toLowerCase().includes(dcfNoFilter.toLowerCase())
      );
      setFilteredDcfData(filtered);
    }
  }, [dcfData, dcfNoFilter]);

  const fetchAllDCFData = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please log in to access this page');
      return;
    }
    setLoading(true);
    try {
      // First fetch all requests
      const response = await fetch('/api/returns/service-center-requests', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Failed to fetch return requests');
      const requests = await response.json();

      // Then fetch details for each request to build DCF data
      const dcfPromises = requests.map(async (req) => {
        try {
          const detailResponse = await fetch(`/api/returns/service-center-requests/${req.id}/details`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          if (!detailResponse.ok) return null;
          const data = await detailResponse.json();
          const items = data.items || [];
          const totalQty = items.reduce((sum, it) => sum + (Number(it.requestedQty || it.qtyDcf || 0)), 0);
          const cfApproved = items.reduce((sum, it) => sum + (Number(it.cfApprovedQty || it.ApprovedQty || 0)), 0);
          return {
            id: req.id,
            dcfNo: data.requestId || data.requestNumber || req.requestId,
            totalDcfQty: totalQty,
            cfApprovedQty: cfApproved,
            dcfSubmitDate: data.dcfSubmitDate || req.createdAt || '',
            cfReceiptDate: data.cfReceiptDate || '',
            cfApprovalDate: data.cfApprovalDate || '',
            cnDate: data.cnDate || '',
            cnCount: data.cnCount || '',
            cnValue: data.cnValue || ''
          };
        } catch (error) {
          console.error(`Error fetching details for request ${req.id}:`, error);
          return null;
        }
      });

      const dcfResults = await Promise.all(dcfPromises);
      const validDcfData = dcfResults.filter(item => item !== null);
      setDcfData(validDcfData);
      setError(null);
    } catch (error) {
      console.error('Error fetching DCF data:', error);
      setError('Failed to load DCF data');
    } finally {
      setLoading(false);
    }
  };

  const handleDcfClick = (requestId) => {
    // Navigate to DCF details page for service center
    navigate(`/service-center/inventory/dcf-details/${requestId}`);
  };

  return (
    <div className="p-5">
      <div className="border-2 border-black p-5 mb-5">
        <div className="flex items-center mb-5">
          <label className="mr-2.5" style={{ fontSize: '20px' }}>DCF No. :</label>
          <input
            type="text"
            value={dcfNoFilter}
            onChange={(e) => setDcfNoFilter(e.target.value)}
            placeholder="Enter DCF Number to filter"
            className="p-1 w-72 border border-gray-300 rounded"
            style={{ fontSize: '20px' }}
          />
        </div>
      </div>

      <div className="mb-5">
        <h2 className="text-2xl">DCF Status Report:</h2>
      </div>

      <div className="border-2 border-black p-2.5 overflow-x-auto">
        <table className="w-full border-collapse" style={{ minWidth: '1200px' }}>
          <thead>
            <tr>
              <th className="border-2 border-black p-2.5 text-left" style={{ fontSize: '20px' }}>DCF No.</th>
              <th className="border-2 border-black p-2.5 text-left" style={{ fontSize: '20px' }}>Total DCF QTY</th>
              <th className="border-2 border-black p-2.5 text-left" style={{ fontSize: '20px' }}>C&F Approved QTY</th>
              <th className="border-2 border-black p-2.5 text-left" style={{ fontSize: '20px' }}>DCF Submit Date</th>
              <th className="border-2 border-black p-2.5 text-left" style={{ fontSize: '20px' }}>C&F Receipt Date</th>
              <th className="border-2 border-black p-2.5 text-left" style={{ fontSize: '20px' }}>C&F Approval/Rejection Date</th>
              <th className="border-2 border-black p-2.5 text-left" style={{ fontSize: '20px' }}>CN Date</th>
              <th className="border-2 border-black p-2.5 text-left" style={{ fontSize: '20px' }}>CN Count</th>
              <th className="border-2 border-black p-2.5 text-left" style={{ fontSize: '20px' }}>CN Value</th>
            </tr>
          </thead>
          <tbody>
            {filteredDcfData.map((item, index) => (
              <tr key={index}>
                <td
                  className="border-2 border-black p-2.5 cursor-pointer text-blue-600"
                  style={{ fontSize: '20px' }}
                  onClick={() => handleDcfClick(item.id)}
                >
                  {item.dcfNo}
                </td>
                <td className="border-2 border-black p-2.5" style={{ fontSize: '20px' }}>{item.totalDcfQty}</td>
                <td className="border-2 border-black p-2.5" style={{ fontSize: '20px' }}>{item.cfApprovedQty}</td>
                <td className="border-2 border-black p-2.5" style={{ fontSize: '20px' }}>{item.dcfSubmitDate}</td>
                <td className="border-2 border-black p-2.5" style={{ fontSize: '20px' }}>{item.cfReceiptDate}</td>
                <td className="border-2 border-black p-2.5" style={{ fontSize: '20px' }}>{item.cfApprovalDate}</td>
                <td className="border-2 border-black p-2.5" style={{ fontSize: '20px' }}>{item.cnDate}</td>
                <td className="border-2 border-black p-2.5" style={{ fontSize: '20px' }}>{item.cnCount}</td>
                <td className="border-2 border-black p-2.5" style={{ fontSize: '20px' }}>{item.cnValue}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {loading && <p>Loading...</p>}
      {error && <p className="text-red-600">{error}</p>}
    </div>
  );
};

export default DCFStatus;