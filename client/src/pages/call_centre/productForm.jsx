// Product not found page
// this is not in the wokring code directory
// please ignore this file 
import React, { useEffect, useState } from "react";
import { getProducts } from "../api";

// export default function productForm() {
//   const [rows, setRows] = useState([]);

//   useEffect(() => {
//     loadProducts();
//   }, []);

//   async function loadProducts() {
//     const result = await getProducts();
//     setRows(result.rows);
//   }

//  to export daqt
export default function productForm()
{
  const [rows,setRows]=useState([]);
  useEffect(()=>{
    loadProducts(); },
    []);

    async function loadProducts()
    {
      const result=await getProducts();
      setRows(result.rows);

    }

  return (
    <div className="p-3">
      <h3>All Products</h3>

      {rows.length === 0 ? (
        <p>No products found.</p>
      ) : (
        <table border="1" cellPadding="5" className="mt-2.5">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Code</th>
              <th>Price</th>
            </tr>
          </thead>

          <tbody>
            <tr>
              <th>Customer Information</th>
            </tr>

            <tr>
              <td className="border-2 px-2 py-2 font-semibold">Customer ID</td>

            </tr>
          </tbody>

          <tbody>
            {rows.map((p) => (
              <tr key={p.Id}>
                <td>{p.Id}</td>
                <td>{p.ProductName}</td>
                {/* <td>{p.ProductCode}</td> */}
                <td>{p.Price}</td>
                <td>{p.CreatedAt}</td>
              </tr>
            ))}
          </tbody>

          <tbody>
            <tr>
                <td>
                    <button>Register Product</button>
                </td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
}

