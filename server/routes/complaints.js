// const express = require("express");
// const router = express.Router();
// const sql = require("mssql");

// // CREATE COMPLAINT
// router.post("/", async (req, res) => {
//   try {
//     const { MobileNo, CallId, SerialNo, CustomerCode, ComplaintId, Name } = req.body;

//     const pool = await sql.connect();

//     await pool.request()
//       .input("MobileNo", sql.NVarChar, MobileNo)
//       .input("CallId", sql.NVarChar, CallId)
//       .input("SerialNo", sql.NVarChar, SerialNo)
//       .input("CustomerCode", sql.NVarChar, CustomerCode)
//       .input("ComplaintId", sql.NVarChar, ComplaintId)
//       .input("Name", sql.NVarChar, Name)
//       .query(`
//         INSERT INTO ComplaintRegistrations
//         (MobileNo, CallId, SerialNo, CustomerCode, ComplaintId, Name)
//         VALUES (@MobileNo, @CallId, @SerialNo, @CustomerCode, @ComplaintId, @Name)
//       `);

//     res.json({ success: true, message: "Complaint created successfully" });
//     alert("complaint registered successfully");

//   } catch (err) {
//     console.error("Complaint insert error:", err);
//     res.status(500).json({ error: "Complaint insert failed" });
//   }
// });

// module.exports = router;


// backend/routes/complaints.js
// const express = require("express");
// const router = express.Router();
// const { poolPromise } = require("../db");

// router.post("/register", async (req, res) => {
//   try {
//     const { customer, product, callInfo } = req.body;
//     if (!customer || !product || !callInfo) return res.status(400).json({ error: "Missing payload" });

//     const pool = await poolPromise;

//     const assignedCenterName = callInfo.AssignedCenter || null;
//     // try to find center id by name (adjust per your schema)
//     let centerId = null;
//     if (assignedCenterName) {
//       const q = await pool.request()
//         .input("CenterName", assignedCenterName)
//         .query("SELECT Id FROM ServiceCenters WHERE CenterName = @CenterName");
//       if (q.recordset.length) centerId = q.recordset[0].Id;
//     }

//     // Insert into ComplaintRegistration
//     const insert = await pool.request()
//       .input("MobileNo", customer.MobileNo || null)
//       .input("Name", customer.Name || null)
//       .input("ProductId", product.Id || null)
//       .input("ProductSerialNo", product.ProductSerialNo || null)
//       .input("CallType", callInfo.CallType || null)
//       .input("AppointmentDate", callInfo.AppointmentDate || null)
//       .input("AppointmentTime", callInfo.AppointmentTime || null)
//       .input("CallerType", callInfo.CallerType || null)
//       .input("CustomerRemarks", callInfo.CustomerRemarks || null)
//       .input("DealerName", callInfo.DealerName || null)
//       .input("Remarks", callInfo.Remarks || null)
//       .input("CallSource", callInfo.CallSource || null)
//       .input("ContactPerson", callInfo.ContactPerson || null)
//       .input("ContactPersonMobile", callInfo.ContactPersonMobile || null)
//       .input("Qty", callInfo.Qty || 1)
//       .input("AssignedCenterId", centerId)
//       .input("DistanceKm", callInfo.Distance || null)
//       .query(`
//         INSERT INTO ComplaintRegistration
//         (MobileNo, Name, ProductId, ProductSerialNo, CallType, AppointmentDate, AppointmentTime, CallerType, CustomerRemarks, DealerName, Remarks, CallSource, ContactPerson, ContactPersonMobile, Qty, AssignedCenterId, DistanceKm, CreatedAt)
//         VALUES
//         (@MobileNo, @Name, @ProductId, @ProductSerialNo, @CallType, @AppointmentDate, @AppointmentTime, @CallerType, @CustomerRemarks, @DealerName, @Remarks, @CallSource, @ContactPerson, @ContactPersonMobile, @Qty, @AssignedCenterId, @DistanceKm, GETDATE())
//       `);

//     res.json({ success: true });
//   } catch (err) {
//     console.error("Register complaint error:", err);
//     res.status(500).json({ error: err.message || "Failed to register complaint" });
//   }
// });

// // added new code for assigning complaint to technician 
// // ================== FETCH COMPLAINTS WITH PRODUCT & CUSTOMER ==================
// router.get("/complaints", async (req, res) => {
//   try {
//     const pool = await poolPromise;

//     const complaintsResult = await pool.request().query(`
//       SELECT 
//           c.Id AS CustomerId,
//           c.Name AS CustomerName,
//           c.MobileNo,
//           c.City,
//           c.Area,
//           c.PinCode,
//           p.Id AS ProductId,
//           p.Brand,
//           p.ProductGroup,
//           p.Product,
//           p.Model,
//           p.ModelDescription,
//           p.ProductSerialNo,
//           p.WarrantyStatus,
//           p.CallStatus
//       FROM Customers c
//       LEFT JOIN Products p ON p.CustomerId = c.Id
//       WHERE c.Active = 1;
//     `);

//     const techResult = await pool.request().query(`
//       SELECT Id, TechnicianName FROM Technicians WHERE Active = 1;
//     `);

//     res.json({
//       complaints: complaintsResult.recordset,
//       technicians: techResult.recordset
//     });

//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Error fetching complaints" });
//   }
// });



// // ================== ASSIGN TECHNICIAN ==================
// router.post("/assign-technician", async (req, res) => {
//   const { productId, technicianId } = req.body;

//   try {
//     const pool = await poolPromise;

//     await pool.request()
//       .input("ProductId", productId)
//       .input("TechnicianId", technicianId)
//       .query(`
//         UPDATE Products SET AssignedTechnicianId = @TechnicianId WHERE Id = @ProductId;
//       `);

//     res.json({ message: "Technician assigned successfully" });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Error assigning technician" });
//   }
// });


// module.exports = router;



import express from "express";
const router = express.Router();
import { poolPromise } from "../db.js";
import sql from "mssql";
import { optionalAuthenticate } from '../middleware/auth.js';
import * as autoAssign from './autoAssign.js';

// ================== REGISTER COMPLAINT ==================
router.post("/", async (req, res) => {
  try {
    const { mobileNo, complaintId, customerId, name, state, city, callInfo, product } = req.body;
    
    const pool = await poolPromise;

    // Validate required fields
    if (!mobileNo) {
      return res.status(400).json({ error: "Mobile number is required" });
    }

    console.log("Registering complaint for mobile:", mobileNo);

    let dbCustomer = null;
    try {
      if (customerId) {
        const byId = await pool.request()
          .input("CustomerId", sql.Int, Number(customerId))
          .query("SELECT TOP 1 * FROM Customers WHERE Id = @CustomerId");

        if (byId.recordset && byId.recordset.length > 0) {
          dbCustomer = byId.recordset[0];
          console.log("Found customer by Id:", dbCustomer);
        } else {
          console.log(`No customer found with Id=${customerId}`);
        }
      }

      if (!dbCustomer) {
        if (!mobileNo) {
          console.log("No customerId or mobileNo provided to resolve customer");
          return res.status(404).json({ error: "Customer not found. Please register customer first." });
        }

        // Try exact match first
        const result = await pool.request()
          .input("MobileNo", sql.NVarChar, mobileNo)
          .query("SELECT TOP 1 * FROM Customers WHERE MobileNo = @MobileNo");

        if (result.recordset.length > 0) {
          dbCustomer = result.recordset[0];
          console.log("Found customer by exact mobile:", dbCustomer);
        } else {

          // Fallback: try matching last 10 digits (handles country codes/formatting)
          const cleaned = (mobileNo || '').replace(/\D/g, '');
          const suffix = cleaned.length > 6 ? cleaned.slice(-10) : cleaned;
          if (suffix) {
            const fuzzy = await pool.request()
              .input("Suffix", sql.NVarChar, `%${suffix}`)
              .query("SELECT TOP 1 * FROM Customers WHERE MobileNo LIKE @Suffix");

            if (fuzzy.recordset.length > 0) {
              dbCustomer = fuzzy.recordset[0];
              console.log("Found customer by mobile suffix:", dbCustomer);
            }
          }

          if (!dbCustomer) {
            console.log("Customer not found with mobile:", mobileNo);
            return res.status(404).json({ error: "Customer not found. Please register customer first." });
          }
        }
      }
    } catch (err) {
      console.error("Error fetching customer:", err);
      throw err;
    }

    let assignedCenterId = null;
    try {
      const customerAddress = dbCustomer?.Address || dbCustomer?.Area || dbCustomer?.CustomerAddress || null;
      const { bestCenter, matchedBy } = await autoAssign.findNearestCenter({
        pincode: dbCustomer?.PinCode || null,
        customerAddress,
        customer: dbCustomer,
      });

      if (bestCenter && bestCenter.Id) {
        assignedCenterId = bestCenter.Id;
        console.log(`Auto-assigned to center (${matchedBy}): ${bestCenter.CenterName} [Id=${bestCenter.Id}]`);
      }
    } catch (err) {
      console.error("Auto-assign error, falling back to simple selection:", err && err.message ? err.message : err);
      try {
        const anyCenter = await pool.request().query("SELECT TOP 1 Id, CenterName FROM ServiceCenters");
        if (anyCenter.recordset.length > 0) {
          assignedCenterId = anyCenter.recordset[0].Id;
          console.log(`Assigned to default center after fallback: ${anyCenter.recordset[0].CenterName}`);
        }
      } catch (e) {
        console.error('Fallback center selection failed:', e && e.message ? e.message : e);
      }
    }

    // Insert complaint registration
    try {
      
      // If frontend sent a product object, fetch the authoritative product row
      // so we can fill ProductId, ProductSerialNo and other product-related fields
      let productFromDb = null; 
      try {
        if (product && (product.Id || product.ProductId || product.ProductSerialNo)) {
          if (product.Id || product.ProductId) {
            const pId = product.Id || product.ProductId;
            const pres = await pool.request()
              .input("pId", sql.Int, pId)
              .query("SELECT TOP 1 * FROM Products WHERE Id = @pId");
            if (pres.recordset && pres.recordset.length > 0) productFromDb = pres.recordset[0];
          }

          if (!productFromDb && product.ProductSerialNo) {
            const pres2 = await pool.request()
              .input("pSN", sql.NVarChar, product.ProductSerialNo)
              .query("SELECT TOP 1 * FROM Products WHERE ProductSerialNo = @pSN");
            if (pres2.recordset && pres2.recordset.length > 0) productFromDb = pres2.recordset[0];
          }

          if (productFromDb) {
            // merge useful fields into callInfo so later insert uses them
            callInfo = callInfo || {};
            callInfo.ProductId = callInfo.ProductId || productFromDb.Id;
            callInfo.ProductSerialNo = callInfo.ProductSerialNo || productFromDb.ProductSerialNo;
            callInfo.WarrantyStatus = callInfo.WarrantyStatus || productFromDb.WarrantyStatus;
            callInfo.CallStatus = callInfo.CallStatus || productFromDb.CallStatus || "Open";
            callInfo.Qty = callInfo.Qty || productFromDb.Qty || 1;

            // if product has AssignedCenterId and we haven't assigned yet, prefer product's center
            if (!assignedCenterId && productFromDb.AssignedCenterId) {
              assignedCenterId = productFromDb.AssignedCenterId;
            }
          }
        }
      } catch (e) {
        console.error('Error fetching product from DB:', e && e.message ? e.message : e);
      }
      // Check which columns exist in ComplaintRegistration table
      let hasComplaintId = false;
      let hasCustomerId = false;
      let hasProductId = false;
      let hasCallType = false;
      let hasCallStatus = false;
      let hasCustomerRemarks = false;
      let hasProductSerialNo = false;
      let hasAppointmentDate = false;
      let hasAppointmentTime = false;
      let hasCallerType = false;
      let hasDealerName = false;
      let hasRemarks = false;
      let hasCallSource = false;
      let hasContactPerson = false;
      let hasContactPersonMobile = false;
      let hasQty = false;
      let hasDistanceKm = false;

      try {
        const colCheck = await pool.request().query("SELECT COL_LENGTH('dbo.ComplaintRegistration','ComplaintId') AS colExists");
        hasComplaintId = !!(colCheck.recordset && colCheck.recordset[0] && colCheck.recordset[0].colExists);
      } catch (e) {
        hasComplaintId = false;
      }

      try {
        const colCheck2 = await pool.request().query("SELECT COL_LENGTH('dbo.ComplaintRegistration','CustomerId') AS colExists");
        hasCustomerId = !!(colCheck2.recordset && colCheck2.recordset[0] && colCheck2.recordset[0].colExists);
      } catch (e) {
        hasCustomerId = false;
      }

      try {
        const colCheck3 = await pool.request().query("SELECT COL_LENGTH('dbo.ComplaintRegistration','ProductId') AS colExists");
        hasProductId = !!(colCheck3.recordset && colCheck3.recordset[0] && colCheck3.recordset[0].colExists);
      } catch (e) {
        hasProductId = false;
      }

      try {
        const colCheck4 = await pool.request().query("SELECT COL_LENGTH('dbo.ComplaintRegistration','CallType') AS colExists");
        hasCallType = !!(colCheck4.recordset && colCheck4.recordset[0] && colCheck4.recordset[0].colExists);
      } catch (e) {
        hasCallType = false;
      }

      try {
        const colCheck5 = await pool.request().query("SELECT COL_LENGTH('dbo.ComplaintRegistration','CallStatus') AS colExists");
        hasCallStatus = !!(colCheck5.recordset && colCheck5.recordset[0] && colCheck5.recordset[0].colExists);
      } catch (e) {
        hasCallStatus = false;
      }

      try {
        const colCheck6 = await pool.request().query("SELECT COL_LENGTH('dbo.ComplaintRegistration','CustomerRemarks') AS colExists");
        hasCustomerRemarks = !!(colCheck6.recordset && colCheck6.recordset[0] && colCheck6.recordset[0].colExists);
      } catch (e) {
        hasCustomerRemarks = false;
      }

      try {
        const colCheck7 = await pool.request().query("SELECT COL_LENGTH('dbo.ComplaintRegistration','ProductSerialNo') AS colExists");
        hasProductSerialNo = !!(colCheck7.recordset && colCheck7.recordset[0] && colCheck7.recordset[0].colExists);
      } catch (e) {
        hasProductSerialNo = false;
      }

      try {
        const colCheck8 = await pool.request().query("SELECT COL_LENGTH('dbo.ComplaintRegistration','AppointmentDate') AS colExists");
        hasAppointmentDate = !!(colCheck8.recordset && colCheck8.recordset[0] && colCheck8.recordset[0].colExists);
      } catch (e) {
        hasAppointmentDate = false;
      }

      try {
        const colCheck9 = await pool.request().query("SELECT COL_LENGTH('dbo.ComplaintRegistration','AppointmentTime') AS colExists");
        hasAppointmentTime = !!(colCheck9.recordset && colCheck9.recordset[0] && colCheck9.recordset[0].colExists);
      } catch (e) {
        hasAppointmentTime = false;
      }

      try {
        const colCheck10 = await pool.request().query("SELECT COL_LENGTH('dbo.ComplaintRegistration','CallerType') AS colExists");
        hasCallerType = !!(colCheck10.recordset && colCheck10.recordset[0] && colCheck10.recordset[0].colExists);
      } catch (e) {
        hasCallerType = false;
      }

      try {
        const colCheck11 = await pool.request().query("SELECT COL_LENGTH('dbo.ComplaintRegistration','DealerName') AS colExists");
        hasDealerName = !!(colCheck11.recordset && colCheck11.recordset[0] && colCheck11.recordset[0].colExists);
      } catch (e) {
        hasDealerName = false;
      }

      try {
        const colCheck12 = await pool.request().query("SELECT COL_LENGTH('dbo.ComplaintRegistration','Remarks') AS colExists");
        hasRemarks = !!(colCheck12.recordset && colCheck12.recordset[0] && colCheck12.recordset[0].colExists);
      } catch (e) {
        hasRemarks = false;
      }

      try {
        const colCheck13 = await pool.request().query("SELECT COL_LENGTH('dbo.ComplaintRegistration','CallSource') AS colExists");
        hasCallSource = !!(colCheck13.recordset && colCheck13.recordset[0] && colCheck13.recordset[0].colExists);
      } catch (e) {
        hasCallSource = false;
      }

      try {
        const colCheck14 = await pool.request().query("SELECT COL_LENGTH('dbo.ComplaintRegistration','ContactPerson') AS colExists");
        hasContactPerson = !!(colCheck14.recordset && colCheck14.recordset[0] && colCheck14.recordset[0].colExists);
      } catch (e) {
        hasContactPerson = false;
      }

      try {
        const colCheck15 = await pool.request().query("SELECT COL_LENGTH('dbo.ComplaintRegistration','ContactPersonMobile') AS colExists");
        hasContactPersonMobile = !!(colCheck15.recordset && colCheck15.recordset[0] && colCheck15.recordset[0].colExists);
      } catch (e) {
        hasContactPersonMobile = false;
      }

      try {
        const colCheck16 = await pool.request().query("SELECT COL_LENGTH('dbo.ComplaintRegistration','Qty') AS colExists");
        hasQty = !!(colCheck16.recordset && colCheck16.recordset[0] && colCheck16.recordset[0].colExists);
      } catch (e) {
        hasQty = false;
      }

      try {
        const colCheck17 = await pool.request().query("SELECT COL_LENGTH('dbo.ComplaintRegistration','DistanceKm') AS colExists");
        hasDistanceKm = !!(colCheck17.recordset && colCheck17.recordset[0] && colCheck17.recordset[0].colExists);
      } catch (e) {
        hasDistanceKm = false;
      }

      console.log('Column checks - hasComplaintId:', hasComplaintId, 'hasCustomerId:', hasCustomerId, 'hasProductId:', hasProductId, 'hasCallType:', hasCallType, 'hasCallStatus:', hasCallStatus, 'hasCustomerRemarks:', hasCustomerRemarks, 'hasProductSerialNo:', hasProductSerialNo, 'hasAppointmentDate:', hasAppointmentDate, 'hasAppointmentTime:', hasAppointmentTime, 'hasCallerType:', hasCallerType, 'hasDealerName:', hasDealerName, 'hasRemarks:', hasRemarks, 'hasCallSource:', hasCallSource, 'hasContactPerson:', hasContactPerson, 'hasContactPersonMobile:', hasContactPersonMobile, 'hasQty:', hasQty, 'hasDistanceKm:', hasDistanceKm);

      const req = pool.request()
        .input("MobileNo", sql.NVarChar, mobileNo)
        .input("Name", sql.NVarChar, name || dbCustomer.Name)
        .input("AssignedCenterId", sql.Int, assignedCenterId);

      // Build column list and values dynamically
      let columns = ["MobileNo", "Name", "AssignedCenterId", "CreatedAt"];
      let values = ["@MobileNo", "@Name", "@AssignedCenterId", "GETDATE()"];

      if (hasCustomerId) {
        req.input("CustomerId", sql.Int, customerId || dbCustomer.Id);
        columns.push("CustomerId");
        values.push("@CustomerId");
      }

      if (hasComplaintId) {
        req.input("ComplaintId", sql.NVarChar, complaintId || null);
        columns.push("ComplaintId");
        values.push("@ComplaintId");
      }

      if (hasProductId && (callInfo?.ProductId || product?.ProductId || product?.Id)) {
        req.input("ProductId", sql.Int, callInfo?.ProductId || product?.ProductId || product?.Id);
        columns.push("ProductId");
        values.push("@ProductId");
      }

      if (hasProductSerialNo && (callInfo?.ProductSerialNo || product?.ProductSerialNo)) {
        req.input("ProductSerialNo", sql.NVarChar, callInfo?.ProductSerialNo || product?.ProductSerialNo);
        columns.push("ProductSerialNo");
        values.push("@ProductSerialNo");
      }

      if (hasCallType && callInfo?.CallType) {
        req.input("CallType", sql.NVarChar, callInfo.CallType);
        columns.push("CallType");
        values.push("@CallType");
      }

      if (hasCallStatus) {
        req.input("CallStatus", sql.NVarChar, callInfo?.CallStatus || "Open");
        columns.push("CallStatus");
        values.push("@CallStatus");
      }

      if (hasCustomerRemarks && callInfo?.CustomerRemarks) {
        req.input("CustomerRemarks", sql.NVarChar, callInfo.CustomerRemarks);
        columns.push("CustomerRemarks");
        values.push("@CustomerRemarks");
      }

      if (hasAppointmentDate && callInfo?.AppointmentDate) {
        req.input("AppointmentDate", sql.Date, callInfo.AppointmentDate);
        columns.push("AppointmentDate");
        values.push("@AppointmentDate");
      }

      if (hasAppointmentTime && callInfo?.AppointmentTime) {
        req.input("AppointmentTime", sql.NVarChar, callInfo.AppointmentTime);
        columns.push("AppointmentTime");
        values.push("@AppointmentTime");
      }

      if (hasCallerType && callInfo?.CallerType) {
        req.input("CallerType", sql.NVarChar, callInfo.CallerType);
        columns.push("CallerType");
        values.push("@CallerType");
      }

      if (hasDealerName && callInfo?.DealerName) {
        req.input("DealerName", sql.NVarChar, callInfo.DealerName);
        columns.push("DealerName");
        values.push("@DealerName");
      }

      if (hasRemarks && callInfo?.Remarks) {
        req.input("Remarks", sql.NVarChar, callInfo.Remarks);
        columns.push("Remarks");
        values.push("@Remarks");
      }

      if (hasCallSource && callInfo?.CallSource) {
        req.input("CallSource", sql.NVarChar, callInfo.CallSource);
        columns.push("CallSource");
        values.push("@CallSource");
      }

      if (hasContactPerson && callInfo?.ContactPerson) {
        req.input("ContactPerson", sql.NVarChar, callInfo.ContactPerson);
        columns.push("ContactPerson");
        values.push("@ContactPerson");
      }

      if (hasContactPersonMobile && callInfo?.ContactPersonMobile) {
        req.input("ContactPersonMobile", sql.NVarChar, callInfo.ContactPersonMobile);
        columns.push("ContactPersonMobile");
        values.push("@ContactPersonMobile");
      }

      if (hasQty && (callInfo?.Qty || callInfo?.Qty === 0)) {
        req.input("Qty", sql.Int, callInfo.Qty);
        columns.push("Qty");
        values.push("@Qty");
      }

      if (hasDistanceKm && (callInfo?.Distance || callInfo?.DistanceKm)) {
        req.input("DistanceKm", sql.Decimal(10, 2), callInfo.Distance || callInfo.DistanceKm);
        columns.push("DistanceKm");
        values.push("@DistanceKm");
      }

      const insertQuery = `
        INSERT INTO ComplaintRegistration
        (${columns.join(", ")})
        VALUES
        (${values.join(", ")})
      `;

      console.log('Insert query:', insertQuery);

      const insertResult = await req.query(insertQuery);

      res.json({ 
        success: true, 
        message: "Complaint registered successfully!",
        assignedCenterId: assignedCenterId
      });
    } catch (err) {
      console.error("Error inserting complaint:", err);
      throw err;
    }
  } catch (err) {
    console.error("Register complaint error:", err);
    res.status(500).json({ error: err.message || "Failed to register complaint" });
  }
});

// ================== FETCH COMPLAINTS ==================
router.get("/", optionalAuthenticate, async (req, res) => {
  try {
    const pool = await poolPromise;
    // Determine centerId to filter complaints by
    let centerId = req.query.centerId || null;
    if (req.user) {
      if (req.user.centerId) {
        centerId = req.user.centerId;
      } else if (req.user.role === 'service_center' || req.user.role === 'service-center') {
        try {
          const sc = await pool.request()
            .input('Username', sql.NVarChar, req.user.username)
            .query("SELECT TOP 1 Id FROM service_centers WHERE name = @Username OR phone = @Username");
          if (sc.recordset && sc.recordset.length > 0) {
            centerId = sc.recordset[0].Id;
          }
        } catch (e) {
          console.error('Error resolving service center for user:', e && e.message ? e.message : e);
        }
      }
    }

    // Query complaints from the calls table with complete customer and product information
    const complaintsRes = await pool.request().query(`
      SELECT
        c.call_id AS ComplaintId,
        c.customer_id AS CustomerId,
        COALESCE(cust.name, '') AS CustomerName,
        COALESCE(cust.mobile_no, '') AS MobileNo,
        COALESCE(cust.email, '') AS Email,
        COALESCE(cust.house_no, '') AS HouseNo,
        COALESCE(cust.building_name, '') AS BuildingName,
        COALESCE(cust.street_name, '') AS StreetName,
        COALESCE(cust.area, '') AS Area,
        COALESCE(cust.landmark, '') AS Landmark,
        COALESCE(cust.state_id, '') AS State,
        COALESCE(city.Description, '') AS City,
        COALESCE(cust.pincode, '') AS Pincode,
        COALESCE(cust.customer_type, '') AS CustomerType,
        COALESCE(cust.alt_mob_no, '') AS AltMobile,
        COALESCE(cust_prod.product_id, 0) AS ProductId,
        COALESCE(pm.VALUE, '') AS Product,
        COALESCE(pg.DESCRIPTION, '') AS ProductGroup,
        COALESCE(pg.DESCRIPTION, '') AS ProductGroupName,
        COALESCE(pmod.BRAND, '') AS Brand,
        COALESCE(pmod.MODEL_DESCRIPTION, '') AS Model,
        COALESCE(pmod.MODEL_DESCRIPTION, '') AS ModelDescription,
        COALESCE(cust_prod.serial_no, '') AS ProductSerialNo,
        COALESCE(cust_prod.date_of_purchase, '') AS PurchaseDate,
        COALESCE(c.call_type, '') AS CallStatus,
        c.created_at AS CreatedAt,
        c.assigned_asc_id AS AssignedCenterId,
        c.assigned_tech_id AS AssignedTechnicianId,
        COALESCE(tech.name, '') AS TechnicianName,
        COALESCE(tech.mobile_no, '') AS TechnicianMobile,
        COALESCE(cust_prod.qty_with_customer, 1) AS Qty,
        COALESCE(c.visit_date, '') AS AppointmentDate,
        COALESCE(c.visit_time, '') AS AppointmentTime,
        COALESCE(c.customer_remark, '') AS CustomerRemarks,
        COALESCE(c.call_source, '') AS CallSource,
        COALESCE(c.caller_mobile_no, '') AS CallerMobile,
        COALESCE(sc.asc_name, '') AS ServiceCenterName,
        COALESCE(c.remark, '') AS Remark
      FROM calls c
      LEFT JOIN customers cust ON cust.customer_id = c.customer_id
      LEFT JOIN Cities city ON city.Id = cust.city_id
      LEFT JOIN customers_products cust_prod ON cust_prod.customers_products_id = c.customer_product_id
      LEFT JOIN ProductMaster pm ON pm.ID = cust_prod.product_id
      LEFT JOIN ProductGroups pg ON pg.ID = pm.Product_group_ID
      LEFT JOIN ProductModels pmod ON pmod.Id = cust_prod.model_id
      LEFT JOIN technicians tech ON tech.technician_id = c.assigned_tech_id
      LEFT JOIN service_centers sc ON sc.asc_id = c.assigned_asc_id
      WHERE c.assigned_asc_id IS NOT NULL
      ORDER BY c.created_at DESC
    `);

    const techResult = await pool.request().query(`SELECT technician_id AS Id, name AS TechnicianName FROM technicians WHERE status = 'active'`);

    let complaints = complaintsRes.recordset || [];

    // If the caller provided a centerId, filter server-side so only assigned complaints are returned
    if (centerId) {
      complaints = complaints.filter((c) => String(c.AssignedCenterId) === String(centerId));
    }

    res.json({
      complaints,
      technicians: techResult.recordset,
    });

  } catch (error) {
    console.error('Error in GET /api/complaints:', error && error.stack ? error.stack : error);
    res.status(500).json({ message: "Error fetching complaints", error: error && error.message ? error.message : String(error) });
  }
});


// ================== ASSIGN TECHNICIAN ==================
router.post("/assign-technician", async (req, res) => {
  const { complaintId, technicianId } = req.body;

  console.log('Assign technician request:', { complaintId, technicianId });

  if (!complaintId || !technicianId) {
    return res.status(400).json({ message: "Missing complaintId or technicianId" });
  }

  try {
    const pool = await poolPromise;

    // Fetch complaint to check its assigned service center
    const complaintRes = await pool.request()
      .input("ComplaintId", sql.Int, Number(complaintId))
      .query("SELECT call_id, assigned_asc_id FROM calls WHERE call_id = @ComplaintId");

    console.log('Complaint query result:', complaintRes.recordset);

    if (!complaintRes.recordset.length) {
      return res.status(404).json({ message: "Complaint not found" });
    }
    const assignedCenterId = complaintRes.recordset[0].assigned_asc_id;

    if (!assignedCenterId) {
      return res.status(400).json({ message: "Complaint is not assigned to any service center" });
    }

    // Fetch technician to check their center
    const techRes = await pool.request()
      .input("TechnicianId", sql.Int, Number(technicianId))
      .query("SELECT technician_id, name, service_center_id FROM technicians WHERE technician_id = @TechnicianId AND status = 'active'");

    console.log('Technician query result:', techRes.recordset);

    if (!techRes.recordset.length) {
      return res.status(404).json({ message: "Technician not found or inactive" });
    }
    const technician = techRes.recordset[0];

    // Validate technician belongs to same center
    if (String(technician.service_center_id) !== String(assignedCenterId)) {
      return res.status(403).json({
        message: `Technician ${technician.name} is not allocated at this complaint's service center`,
      });
    }

    // Assign technician to call
    await pool.request()
      .input("CallId", sql.Int, Number(complaintId))
      .input("TechnicianId", sql.Int, Number(technicianId))
      .query(`
        UPDATE calls
        SET assigned_tech_id = @TechnicianId, updated_at = GETDATE()
        WHERE call_id = @CallId
      `);

    res.json({
      message: `Technician ${technician.name} assigned successfully to complaint ${complaintId}`,
      assignedTechnicianId: technician.technician_id,
      assignedTechnicianName: technician.name,
    });

  } catch (err) {
    console.error("Assign tech error:", err);
    res.status(500).json({ message: "Error assigning technician", error: err.message });
  }
});

// =============================================
// GET /api/complaints/:id
// Fetch a single complaint by ID
// =============================================
router.get("/:id", optionalAuthenticate, async (req, res) => {
  try {
    const pool = await poolPromise;
    const complaintId = req.params.id;

    const complaintsRes = await pool.request().query(`
      SELECT
        c.customer_id AS CustomerId,
        cust.name AS CustomerName,
        cust.mobile_no AS MobileNo,
        cust.email AS Email,
        cust.house_no AS HouseNo,
        cust.building_name AS BuildingName,
        cust.street_name AS StreetName,
        cust.area AS Area,
        cust.landmark AS Landmark,
        cust.state_id AS State,
        cust.city_id AS City,
        cust.pincode AS Pincode,
        cust.customer_type AS CustomerType,
        cust.alt_mobile_no AS AltMobile,
        cp.product_id AS ProductId,
        pm.product_name AS Product,
        pg.product_group_name AS ProductGroup,
        pg.product_group_name AS ProductGroupName,
        pm.brand_name AS Brand,
        pmo.model_name AS Model,
        pm.model_description AS ModelDescription,
        cp.serial_number AS ProductSerialNo,
        CONVERT(DATE, cust_prod.purchase_date) AS PurchaseDate,
        cust_prod.dealer_name AS DealerName,
        c.call_type AS CallStatus,
        c.call_id AS ComplaintId,
        c.created_at AS CreatedAt,
        c.assigned_asc_id AS AssignedCenterId,
        c.assigned_tech_id AS AssignedTechnicianId,
        COALESCE(tech.name, '') AS TechnicianName,
        COALESCE(tech.mobile_no, '') AS TechnicianMobile,
        1 AS Qty,
        c.visit_date AS AppointmentDate,
        c.visit_time AS AppointmentTime,
        c.customer_remark AS CustomerRemarks,
        c.call_source AS CallSource,
        c.caller_mobile_no AS CallerMobile,
        cust_prod.dealer_name AS CallDealerName
      FROM calls c
      LEFT JOIN customers cust ON cust.customer_id = c.customer_id
      LEFT JOIN customers_products cust_prod ON cust_prod.customer_product_id = c.customer_product_id
      LEFT JOIN product cp ON cp.product_id = cust_prod.product_id
      LEFT JOIN ProductMaster pm ON pm.product_id = cp.product_id
      LEFT JOIN ProductModels pmo ON pmo.model_id = cp.model_id
      LEFT JOIN ProductGroups pg ON pg.product_group_id = pm.product_group_id
      LEFT JOIN technicians tech ON tech.technician_id = c.assigned_tech_id
      WHERE c.call_id = ${complaintId}
    `);

    const complaint = complaintsRes.recordset[0];
    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    // Format the response with complete data
    const formatted = {
      id: complaint.ComplaintId,
      callId: complaint.ComplaintId,
      assignedCenterId: complaint.AssignedCenterId,
      customer: {
        name: complaint.CustomerName || '',
        mobile: complaint.MobileNo || '',
        email: complaint.Email || '',
        houseNo: complaint.HouseNo || '',
        buildingName: complaint.BuildingName || '',
        streetName: complaint.StreetName || '',
        area: complaint.Area || '',
        landmark: complaint.Landmark || '',
        state: complaint.State || '',
        city: complaint.City || '',
        pincode: complaint.Pincode || '',
        type: complaint.CustomerType || '',
      },
      product: {
        group: complaint.ProductGroup || '',
        name: complaint.Product || '',
        model: complaint.ModelDescription || complaint.Model || '',
        serialNo: complaint.ProductSerialNo || '',
        purchaseDate: complaint.PurchaseDate || '',
        dealerName: complaint.DealerName || '',
        warrantyStatus: ''
      },
      call: {
        callId: complaint.ComplaintId || '',
        callType: complaint.CallStatus || '',
        registrationDate: complaint.CreatedAt || '',
        appointmentDate: complaint.AppointmentDate || '',
        status: complaint.CallStatus || '',
        callerMobile: complaint.CallerMobile || '',
        technician: complaint.TechnicianName || ''
      }
    };

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching complaint:', error);
    res.status(500).json({ error: 'Failed to fetch complaint' });
  }
});

// =============================================
// GET /api/complaints/:id/action-log
// Fetch action log for a complaint
// =============================================
router.get("/:id/action-log", optionalAuthenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;

    // Assuming action log is from some history, for now return dummy data or query if exists
    // Since no log table, perhaps return assignment history or something
    const logs = await pool.request()
      .input("ComplaintId", sql.Int, Number(id))
      .query(`
        SELECT 
          cr.Id AS CallID,
          cr.CreatedAt AS ActionDate,
          'Call Centre' AS Company,
          COALESCE(u.Username, 'System') AS UserName,
          cr.CallStatus AS Status,
          CASE 
            WHEN cr.AssignedTechnicianId IS NOT NULL THEN 'Assigned to Technician'
            ELSE 'Open'
          END AS Stage
        FROM ComplaintRegistration cr
        LEFT JOIN Users u ON u.Id = cr.AssignedBy
        WHERE cr.Id = @ComplaintId
        UNION ALL
        SELECT 
          cr.Id AS CallID,
          cr.AssignedAt AS ActionDate,
          'Service Centre' AS Company,
          t.Name AS UserName,
          'Assigned' AS Status,
          'Assigned to Technician' AS Stage
        FROM ComplaintRegistration cr
        LEFT JOIN Technicians t ON t.Id = cr.AssignedTechnicianId
        WHERE cr.Id = @ComplaintId AND cr.AssignedAt IS NOT NULL
        ORDER BY ActionDate DESC
      `);

    res.json(logs.recordset || []);
  } catch (err) {
    console.error("Error fetching action log:", err);
    res.status(500).json({ error: "Failed to fetch action log" });
  }
});


// Note: Technicians by center are now handled in /api/technicians/by-centre route


export default router;

