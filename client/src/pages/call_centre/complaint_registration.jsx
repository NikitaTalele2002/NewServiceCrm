import React, { useState } from 'react';
import CC_Navbar from './NavbarCS';
import { useComplaints } from '../../hooks/useComplaints';
import ComplaintSearchForm from './ComplaintSearchForm';
import CustomerResults from './CustomerResults';
import ProductSelection from './ProductSelection';
import CallStatusForm from './CallStatusForm';

export default function ComplaintRegistration() {
  const { createComplaint, searchComplaints, loading } = useComplaints();

  const [view, setView] = useState('search'); // 'search' | 'customers' | 'products' | 'callstatus'
  const [formData, setFormData] = useState({
    mobileNo: '',
    complaintId: '',
    customerId: '',
    name: '',
    state: '',
    city: '',
  });

  const [searchResults, setSearchResults] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [callData, setCallData] = useState({
    CallType: '',
    AppointmentDate: '',
    AppointmentTime: '',
    CallerMobile: '',
    CustomerRemarks: '',
    DealerName: '',
    CallSource: 'Voice',
    Qty: 1,
  });

  const handleFormChange = (name, value) => setFormData((s) => ({ ...s, [name]: value }));

  const handleSearch = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const isEmpty = Object.values(formData).every((v) => !v);
    if (isEmpty) return alert('Please enter at least one search criteria');
    try {
      const res = await searchComplaints(formData);
      if (res && res.success && Array.isArray(res.data) && res.data.length) {
        setSearchResults(res.data);
        setView('customers');
      } else {
        setSearchResults([]);
        alert('No records found');
      }
    } catch (err) {
      console.error(err);
      alert('Search failed');
    }
  };

  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setView('products');
  };

  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    setView('callstatus');
  };

  const handleCallDataChange = (newData) => setCallData(newData);

  const handleSubmitComplaint = async () => {
    if (!selectedCustomer) return alert('Select a customer first');
    if (!selectedProduct) return alert('Select a product first');
    if (!callData.CallType) return alert('Select Call Type');

    const payload = {
      customer: selectedCustomer,
      product: selectedProduct,
      callInfo: callData,
    };

    try {
      const res = await createComplaint(payload);
      if (res && res.success) {
        alert('Complaint registered successfully');
        // reset state
        setView('search');
        setFormData({ mobileNo: '', complaintId: '', customerId: '', name: '', state: '', city: '' });
        setSearchResults([]);
        setSelectedCustomer(null);
        setSelectedProduct(null);
        setCallData({ CallType: '', AppointmentDate: '', AppointmentTime: '', CallerMobile: '', CustomerRemarks: '', DealerName: '', CallSource: 'Voice', Qty: 1 });
      } else {
        alert((res && (res.error || res.message)) || 'Failed to register complaint');
      }
    } catch (err) {
      console.error(err);
      alert('Error submitting complaint');
    }
  };

  return (
    <div className="min-h-screen w-screen p-4 text-black">
      <CC_Navbar />
      <div className="container mt-10 bg-white p-8 shadow-md rounded-lg">
        <h1 className="text-2xl font-bold mb-4">Call Registration</h1>

        {view === 'search' && (
          <ComplaintSearchForm formData={formData} onFormChange={handleFormChange} onSubmit={handleSearch} loading={loading} />
        )}

        {view === 'customers' && (
          <CustomerResults searchResults={searchResults} onSelectCustomer={handleSelectCustomer} onBackToSearch={() => setView('search')} />
        )}

        {view === 'products' && selectedCustomer && (
          <ProductSelection customerData={selectedCustomer} selectedProduct={selectedProduct} onSelectProduct={handleSelectProduct} onEditProduct={() => setIsEditingProduct((s) => !s)} isEditingProduct={isEditingProduct} onGoToCallStatus={() => setView('callstatus')} onBackToCustomer={() => setView('customers')} />
        )}

        {view === 'callstatus' && selectedCustomer && selectedProduct && (
          <CallStatusForm customerData={selectedCustomer} selectedProduct={selectedProduct} callData={callData} onCallDataChange={handleCallDataChange} onSaveCall={handleSubmitComplaint} onBackToCustomer={() => setView('customers')} onBackToProducts={() => setView('products')} onPreviousCall={() => alert('Previous call')} onViewAndUpload={() => alert('View & Upload')} onRegisterCallDirect={() => handleSubmitComplaint()} />
        )}
      </div>
    </div>
  );
}
// import { useState } from "react";
// import CC_Navbar from "./NavbarCS";
// import { useComplaints } from "../../hooks/useComplaints";

// export default function ComplaintRegistration() {
//   const { createComplaint, searchComplaints, loading, error } = useComplaints();
//   const [searchResults, setSearchResults] = useState([]);
//   // mobile no, complaint id, name, state,city
//   const [formData, setFormData] = useState({
//     mobileNo: "",
//     complaintId: "",
//     customerId:"", 
//     name: "",
//     state:"",
//     city:"",   
//   });
//   const [isEditingProduct, setIsEditingProduct] = useState(false);

//   // const [isEditingProduct,setIsEditingProduct]=useState(false);
//   const [showCustomerResults, setShowCustomerResults] = useState(false);
//   const [showProducts, setShowProducts] = useState(false);
//   const [showCallStatus, setShowCallStatus] = useState(false);

//   const goToCustomer = () => {
//     setShowCustomerResults(true);
//     setShowProducts(false);
//     setShowCallStatus(false);
//   };

//   const goToProducts = () => {
//     setShowCustomerResults(false);
//     setShowProducts(true);
//     setShowCallStatus(false);
//   };

//   const goToCallStatus = () => {
//     setShowCustomerResults(false);
//     setShowProducts(false);
//     setShowCallStatus(true);
//   };

//   const goToSearch = () => {
//     setShowCustomerResults(false);
//     setShowProducts(false);
//     setShowCallStatus(false);
//     setFormData({
//     mobileNo: "",
//     complaintId: "",
//     customerId:"", 
//     name: "",
//     state:"",
//     city:"", 

//     });
//   };

//   const previousCall = () => alert("Previous Call Page Coming Soon...");
//   const viewAndUpload = () => alert("View & Upload Page Coming Soon...");
//   const registerCallDirect = () => goToCallStatus();
//  const saveCall = async () => {
//   try {
//     const result = await createComplaint(formData);
//     if (result.success) {
//       alert("Complaint saved successfully");
//       // Reset form or navigate as needed
//     } else {
//       alert(result.error || "Error saving complaint");
//     }
//   } catch (err) {
//     alert("Error saving complaint");
//   }
// };
//     }

//     alert("Complaint Saved Successfully!");
//     goToSearch(); // clear the form
//   } catch (err) {
//     console.error(err);
//     alert("Backend not reachable!");
//   }
// };



//   const selectedProduct = customerData.products[0];

//   const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });


//   // this is only for frontend part -> dummy data
//   // const handleSearch = (e) => {
//   //   e.preventDefault();
//   //   if (!formData.mobileNo && !formData.callId && !formData.serialNo && !formData.customerCode) {
//   //     alert("At least one search criteria is mandatory!");
//   //     return;
//   //   }
//   //   setShowCustomerResults(true);
//   //   setShowProducts(false);
//   //   setShowCallStatus(false);
//   // };

//   // const [searchResults, setSearchResults] = useState([]);


//   // integration with backend
// const handleSearch = async (e) => {
//   e.preventDefault();

//   if (!formData.mobileNo && !formData.callId && !formData.serialNo && !formData.customerCode) {
//     alert("At least one field is required");
//     return;
//   }

//   try {
//     const result = await searchComplaints(formData);
//     if (result.success && result.data.length > 0) {
//       setSearchResults(result.data);
//     } else {
//       alert("No Records Found");
//       setSearchResults([]);
//     }
//   } catch (err) {
//     alert("Error searching complaints");
//     setSearchResults([]);
//   }
// };
//     }

//     setSearchResults(data.data);
//     setShowCustomerResults(true);
//   } catch (err) {
//     console.error(err);
//     alert("Backend error");
//   }
// };


//   return (
//     <div className="min-h-screen w-screen p-4 text-black">
//       <CC_Navbar />
//       <div className="container mt-10 bg-white p-8 shadow-md rounded-lg">
//         <h1 className="text-2xl font-bold mb-4">Call Registration</h1>

//       {/* SEARCH FORM */}
//       {!showProducts && !showCallStatus && (
//         <form onSubmit={handleSearch} className="bg-white p-5 border rounded-lg shadow">
//           <p className="text-red-500 text-sm mb-3">At least one search criteria is mandatory.</p>

//           <table className="w-full ">
//             <tbody>
//               <tr>
//                 <td className="p-2 font-semibold ">Mobile No ++</td>
//                 <td className=" p-2">
//                   <input
//                     type="text"
//                     name="mobileNo"
//                     value={formData.mobileNo}
//                     onChange={handleChange}
//                     className="border p-2 rounded w-64" />
//                 </td>
              
//                 <td className="p-2 font-semibold ">Complaint ID.</td>
//                 <td className=" p-2">
//                   <input
//                     type="text"
//                     name="complaintId"
//                     value={formData.complaintId}
//                     onChange={handleChange}
//                     className="border p-2 rounded w-64"/>
//                 </td>
             
//                 <td className="p-2 font-semibold ">Name</td>
//                 <td className=" p-2">
//                   <input
//                     type="text"   
//                     name="name"
//                     value={formData.name}
//                     onChange={handleChange}
//                     className="border p-2 rounded w-64" />
//                 </td>
//                 </tr>
//                 <tr>
//                 <td className="p-2 font-semibold ">State</td>
//                 <td className=" p-2">
//                   <input
//                     type="text"
//                     name="state"
//                     value={formData.state}
//                     onChange={handleChange}
//                     className="border p-2 rounded w-64" />
//                 </td>

//                  <td className="p-2 font-semibold ">City</td>
//                 <td className=" p-2">
//                   <input
//                     type="text"
//                     name="city"
//                     value={formData.city}
//                     onChange={handleChange}
//                     className="border p-2 rounded w-64"/>
//                 </td>
//               </tr>
//             </tbody>
//           </table>
//           <div className=" flex justify-end">
//             <button type="submit" className="mt-5 bg-green-600 px-4 py-2 rounded text-black">  Search</button>
//             {/* <button type="submit" className=" mt-5 bg-green-600 px-4 py-2 rounded text-black"> Add Customer</button> */}
//           </div>

// {/* 
//           <button onClick={goToSearch} type="button" className="mt-5 ml-4 bg-gray-500 px-4 py-2 rounded text-black">
//             Back to Search Results
//           </button> */}
//         </form>
//       )}

//       {/* CUSTOMER RESULTS */}
//       {showCustomerResults && !showProducts && (
//         <div className="bg-white p-4 rounded shadow mt-6">
//           <h2 className="text-lg font-bold">Customer Details</h2>

//           <table className="w-full border mt-4">
//             <thead className="bg-gray-100">
//               <tr>
//                 <th className="border px-2 py-1">Customer Code</th>
//                 <th className="border px-2 py-1">Name</th>
//                 <th className="border px-2 py-1">Address</th>
//                 <th className="border px-2 py-1">Area</th>
//                 <th className="border px-2 py-1">City</th>
//                 <th className="border px-2 py-1">State</th>
//                 <th className="border px-2 py-1">Mobile</th>
//                 <th className="border px-2 py-1">Action</th>
//               </tr>
//             </thead>

//             <tbody>
//               <tr>
//                 <td className="border px-2 py-1">{customerData.code}</td>
//                 <td className="border px-2 py-1">{customerData.name}</td>
//                 <td className="border px-2 py-1">{customerData.address}</td>
//                 <td className="border px-2 py-1">{customerData.area}</td>
//                 <td className="border px-2 py-1">{customerData.city}</td>
//                 <td className="border px-2 py-1">{customerData.state}</td>
//                 <td className="border px-2 py-1">{customerData.mobile}</td>

//                 <td className="border px-2 py-1 text-center">
//                   <button onClick={goToProducts} className="bg-blue-500 text-black px-3 py-1 rounded">
//                     Show Product
//                   </button>
//                 </td>
//               </tr>
//             </tbody>
//           </table>
//         </div>
//       )}



//         {showCustomerResults && !showProducts && (
//          <div className="bg-white p-4 rounded shadow mt-6">
//           <h2 className="text-lg font-bold">Customer Details</h2>

//           <table className="w-full border mt-4">
//           <thead className="bg-gray-100">
//           <tr>
//             <th className="border px-2 py-1">Mobile No</th>
//             <th className="border px-2 py-1">Call ID</th>
//             <th className="border px-2 py-1">Serial No</th>
//             <th className="border px-2 py-1">Customer Code</th>
//             <th className="border px-2 py-1">Complaint ID</th>
//             <th className="border px-2 py-1">Name</th>
//             <th className="border px-2 py-1">Show Products</th>
//           </tr>
//         </thead>

//         <tbody>
//           {searchResults.length === 0 ? (
//             <tr>
//               <td className="border p-2 text-center" colSpan="6">No Records Found</td>
//             </tr>
//           ) : (
//             searchResults.map((item, index) => (
//               <tr key={index}>
//                 <td className="border px-2 py-1">{item.MobileNo}</td>
//                 <td className="border px-2 py-1">{item.CallId}</td>
//                 <td className="border px-2 py-1">{item.SerialNo}</td>
//                 <td className="border px-2 py-1">{item.CustomerCode}</td>
//                 <td className="border px-2 py-1">{item.ComplaintId}</td>
//                 <td className="border px-2 py-1">{item.Name}</td>
//                 <td><button>Show Products</button></td>
//               </tr>
              
//             ))
//           )}
//         </tbody>
//       </table>
//     </div>
//     )}


//       {/* PRODUCT DETAILS PAGE */}
//     {showProducts && !showCallStatus && (
//         <div className="bg-white p-6 rounded shadow mt-6">
//           <h2 className="text-lg font-bold">Customer Information</h2>

//           <table className="w-full border mt-4">
//             <tbody>
//               {Object.entries(customerData).map(([key, value], index) => {
//                 if (key === "products") return null;
//                 return (
//                   <tr key={index}>
//                     <td className="border p-2 font-semibold capitalize">{key}</td>
//                     <td className="border p-2">
//                       <input defaultValue={value} className="border p-2 rounded w-64" />
//                     </td>
//                   </tr>
//                 );
//               })}
//             </tbody>
//           </table>

//           <h2 className="text-lg font-bold mt-6">Products Purchased</h2>

//           <table className="w-full border mt-4">
//             <thead className="bg-gray-100">
//               <tr>
//                 <th className="border px-2">Brand</th>
//                 <th className="border px-2">Group</th>
//                 <th className="border px-2">Product</th>
//                 <th className="border px-2">Model</th>
//                 <th className="border px-2">Serial No</th>
//                 <th className="border px-2">Warranty</th>
//                 <th className="border px-2">Action</th>
//               </tr>
//             </thead>

//             <tbody>
//               {customerData.products.map((p, i) => (
//               <tr key={i}>
//                 <td className="border px-2">
//                 <input
//                   className="border p-1 rounded w-64"
//                   defaultValue={p.brand}
//                   disabled={!isEditingProduct}/>
//                 </td>

//                 <td className="border px-2">
//                 <input
//                   className="border p-1 rounded w-64"
//                   defaultValue={p.group}
//                   disabled={!isEditingProduct}/>
//                 </td>

//                 <td className="border px-2">
//                 <input
//                   className="border p-1 rounded w-64"
//                   defaultValue={p.product}
//                   disabled={!isEditingProduct}/>
//                 </td>

//                 <td className="border px-2">
//                 <input
//                   className="border p-1 rounded w-64"
//                   defaultValue={p.model}
//                   disabled={!isEditingProduct}/>
//                 </td>

//                 <td className="border px-2">
//                 <input
//                   className="border p-1 rounded w-64"
//                   defaultValue={p.serialNo}
//                   disabled={!isEditingProduct}/>
//                 </td>

//                 <td className="border px-2">
//                 <input
//                   className="border p-1 rounded w-64"
//                   defaultValue={p.warranty}
//                   disabled={!isEditingProduct}/>
//                 </td>

//                 <td className="border px-2 text-center">
//                 {/* {!isEditingProduct ? (
//                 <button
//                   onClick={() => setIsEditingProduct(true)}
//                   className="bg-yellow-500 text-black px-3 py-1 rounded"
//                   >Edit
//                 </button>
//                 ) : ( */}
//                 {/* {(
//                   <button
//                     onClick={() => {
//                     setIsEditingProduct(false);
//                     alert("Product updated!");
//                   }}
//                   className="bg-green-600 text-white px-3 py-1 rounded"
//                 >
//                   Save
//                 </button>
//                 )} */}

//                 <button
//                   onClick={goToCallStatus}
//                   className="bg-purple-600 text-red px-3 py-1 rounded ml-2">
//                   Call Status
//                 </button>
//                 </td>
//               </tr>
//               ))}
//           </tbody>
//         </table>


//           <button onClick={goToCustomer} className="mt-6 bg-gray-300 px-4 py-2 rounded">
//             Back to Customer Details
//           </button>
//         </div>
//       )}

//       {/* CALL STATUS PAGE */}
//       {showCallStatus && (
//         <div className="bg-white p-6 rounded shadow mt-6 space-y-6">
//           <h2 className="text-xl font-bold">Call Management - Registration</h2>

//           {/* Customer Information */}
//           <h3 className="font-bold text-lg">Customer Information</h3>

//           <table className="border w-full">
//             <tbody>
//               {Object.entries(customerData).map(([key, value], i) => {
//                 if (key === "products") return null;
//                 return (
//                   <tr key={i}>
//                     <td className="p-2 font-semibold capitalize">{key}</td>
//                     <td className="p-2">
//                       <input defaultValue={value} className="border p-2 rounded w-64" />
//                     </td>
//                   </tr>
//                 );
//               })}
            
//               <tr>
//                 <td colSpan="2" className="p-3">
//                   <div className="w-full flex justify-end space-x-3">
//                     <button onClick={goToCustomer} className="bg-gray-400 px-4 py-2 rounded">
//                       Back to customer Details
//                     </button>
//                   </div>
//                 </td>
//               </tr>
//             </tbody>
//           </table>

//           {/*  Product Information */}
//           <h3 className="font-bold text-lg mt-6">Product Information</h3>

//           <table className="w-full border">
//             <tbody>
//               {Object.entries(selectedProduct).map(([key, value], i) => (
//                 <tr key={i}>
//                   <td className="p-2 font-semibold capitalize">{key}</td>
//                   <td className="p-2">
//                     <input defaultValue={value} className="border p-2 rounded w-64" />
//                   </td>
//                 </tr>
//               ))}

//               {/* BUTTON ROW */}
//               <tr>
//                 <td colSpan="2" className="p-3">
//                   <div className="w-full flex justify-end space-x-3">
//                     <button onClick={goToProducts} className="bg-gray-400 px-4 py-2 rounded">
//                       Back to Product Details
//                     </button>
//                     <button onClick={previousCall} className="bg-gray-600 text-black px-4 py-2 rounded">
//                       Previous Call
//                     </button>
//                     <button onClick={viewAndUpload} className="bg-blue-600 text-black px-4 py-2 rounded">
//                       View & Upload
//                     </button>
//                     <button onClick={registerCallDirect} className="bg-green-600 text-black px-4 py-2 rounded">
//                       Register Call
//                     </button>
//                   </div>
//                 </td>
//               </tr>
//             </tbody>
//           </table>

//           {/*  Call Information */}
//           <h3 className="font-bold text-lg mt-6">Call Information</h3>

//           <table className="min-w-full border">
//             <tbody>
//               <tr>
//                 <td className="p-2 font-semibold">Call Type</td>
//                 <td className="p-2">
//                   <select className="border p-2 w-64 rounded">
//                     <option>-Select-</option>
//                     <option value="Complaint">Complaint</option>
//                     <option value="Installation">Installation</option>
//                   </select>
//                 </td>

//                 <td className="p-2 font-semibold">Call Date</td>
//                 <td className="p-2">
//                   <input type="date" className="border p-2 rounded w-64" />
//                 </td>

//                 <td className="p-2 font-semibold">Complaint</td>
//                 <td className="p-2">
//                   <textarea className="border p-2 w-64 rounded h-20"></textarea>
//                 </td>
//               </tr>

//               <tr>
//                 <td className="p-2 font-semibold">Estimated Time</td>
//                 <td className="p-2">
//                   <input type="number" className="border p-2 rounded w-64" />
//                 </td>
//               </tr>
//             </tbody>
//           </table>

//           {/* Save & Back Buttons */}
//           <button onClick={saveCall} className="bg-green-600 text-black px-4 py-2 rounded mr-3">
//             Save
//           </button>

//           <button onClick={goToCustomer} className="bg-gray-300 px-4 py-2 rounded">
//             Back to Customer Details
//           </button>
//         </div>
//       )}
//     </div>
//     </div>
//   );
// }
