// import React from "react";
// import { useNavigate } from "react-router-dom";

// export default function CustomerCard({ customer }) {
//   const navigate = useNavigate();

//   return (
//     <div style={{ border: '1px solid #ddd', padding: 12, borderRadius: 6, marginBottom: 12 }}>
//       <h3>Customer Details</h3>
// {/* 
//       <div className="border-2 p-3 m-2">Name: {customer.Name || customer.name}</div>
//       <div className="border-2 p-3 m-2">Mobile: {customer.MobileNo || customer.mobileNo}</div>
//       <div className="border-2 p-3 m-2">Email: {customer.Email || customer.email}</div> */}

//       <div>
//         <table className="border-2 border-black">
//           <tbody>
//             <tr className="border-1 ">
//               <th className="border-1 p-3">Name</th>
//               <th className="border-1 p-3">Mobile</th>
//               <th className="border-1 p-3">Email</th>
//             </tr>
//             <tr className="border-1">
//               <td className="border-1 p-3">{customer.Name || customer.name}</td>
//               <td className="border-1 p-3">{customer.MobileNo || customer.mobileNo}</td>
//               <td className="border-1 p-3">{customer.Email || customer.email}</td>
//             </tr>
//           </tbody>
//         </table>
//       </div>
//       <div style={{ marginTop: 10 }}>
//         <button onClick={() => navigate("/call-centre/show")}>
//           Show Products
//         </button>
//       </div>
//     </div>
//   );
// }



// import React from "react";
// import { useNavigate } from "react-router-dom";

// export default function CustomerCard({ customer }) {
//   const navigate = useNavigate();

//   const handleShowProducts = () => {
//     // Pass the customer's mobile number via state
//     navigate("/call-centre/show", { state: { mobile: customer.MobileNo } });
//   };

//   return (
//     <div style={{ border: '1px solid #ddd', padding: 12, borderRadius: 6, marginBottom: 12 }}>
//       <h3>Customer Details</h3>
//       <table className="border-2 border-black">
//         <tbody>
//           <tr className="border-1">
//             <th className="border-1 p-3">Name</th>
//             <th className="border-1 p-3">Mobile</th>
//             <th className="border-1 p-3">Email</th>
//           </tr>
//           <tr className="border-1">
//             <td className="border-1 p-3">{customer.Name || customer.name}</td>
//             <td className="border-1 p-3">{customer.MobileNo || customer.mobileNo}</td>
//             <td className="border-1 p-3">{customer.Email || customer.email}</td>
//           </tr>
//         </tbody>
//       </table>

//       <div style={{ marginTop: 10 }}>
//         <button onClick={handleShowProducts}>
//           Show Products
//         </button>
//       </div>
//     </div>
//   );
// }



import React from "react";
import { useNavigate } from "react-router-dom";

export default function CustomerCard({ customer }) {
  const navigate = useNavigate();

  const handleShowProducts = () => {
    navigate("/call-centre/show", { state: { customer } });
  };

  return (
    <div className="border border-gray-300 p-3 rounded mb-3">
      <h3>Customer Details</h3>
      <table className="border-2 border-black">
        <tbody>
          <tr>
            <th>Customer ID</th>
            <th>Name</th>
            <th>Mobile</th>
            <th>Email</th>
          </tr>
          <tr>
            <td>{customer.Id || customer.ID}</td>
            <td>{customer.Name || customer.name}</td>
            <td>{customer.MobileNo || customer.mobileNo}</td>
            <td>{customer.Email || customer.email}</td>
          </tr>
        </tbody>
      </table>

      <div className="mt-2.5">
        <button onClick={handleShowProducts}>Show Products</button>
      </div>
    </div>
  );
}


