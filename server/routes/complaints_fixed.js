// Temporary fix: update complaints.js to handle missing CustomerId column
const express = require("express");
const router = express.Router();
const { poolPromise } = require("../db");
const sql = require("mssql");
const { optionalAuthenticate } = require('../middleware/auth');

// ================== REGISTER COMPLAINT (FIXED) ==================
router.post("/", async (req, res) => {
  try {
    const { mobileNo, complaintId, customerId, name, state, city } = req.body;
    
    const pool = await poolPromise;

    // Validate required fields
    if (!mobileNo) {
      return res.status(400).json({ error: "Mobile number is required" });
    }

    console.log("Registering complaint for mobile:", mobileNo);

    // Fetch customer from database
    let dbCustomer = null;
    try {
      // Try exact match first
      const result = await pool.request()
        .input("MobileNo", sql.NVarChar, mobileNo)
        .query("SELECT Id, Name, City, State, PinCode FROM Customers WHERE MobileNo = @MobileNo");

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
            .query("SELECT TOP 1 Id, Name, City, State, PinCode, MobileNo FROM Customers WHERE MobileNo LIKE @Suffix");

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
    } catch (err) {
      console.error("Error fetching customer:", err);
      throw err;
    }

    // Auto-assign to service center by matching City
    let assignedCenterId = null;
    try {
      const centerResult = await pool.request()
        .input("City", sql.NVarChar, dbCustomer.City)
        .query("SELECT TOP 1 Id, CenterName, City FROM ServiceCenters WHERE City = @City");
      
      if (centerResult.recordset.length > 0) {
        assignedCenterId = centerResult.recordset[0].Id;
        console.log(`Auto-assigned to center in ${dbCustomer.City}: ${centerResult.recordset[0].CenterName}`);
      } else {
        console.log(`No service center found in city: ${dbCustomer.City}`);
        // If no center in same city, try to get any center
        const anyCenter = await pool.request()
          .query("SELECT TOP 1 Id, CenterName FROM ServiceCenters");
        
        if (anyCenter.recordset.length > 0) {
          assignedCenterId = anyCenter.recordset[0].Id;
          console.log(`Assigned to default center: ${anyCenter.recordset[0].CenterName}`);
        }
      }
    } catch (err) {
      console.error("Error finding service center:", err);
      // Continue without assignment if error occurs
    }

    // Insert complaint registration - dynamically check which columns exist
    try {
      // Check which columns exist in the table
      let hasCustomerId = false;
      let hasComplaintId = false;
      
      try {
        const colCheck1 = await pool.request().query("SELECT COL_LENGTH('dbo.ComplaintRegistration','CustomerId') AS colExists");
        hasCustomerId = !!(colCheck1.recordset && colCheck1.recordset[0] && colCheck1.recordset[0].colExists);
      } catch (e) {
        hasCustomerId = false;
      }

      try {
        const colCheck2 = await pool.request().query("SELECT COL_LENGTH('dbo.ComplaintRegistration','ComplaintId') AS colExists");
        hasComplaintId = !!(colCheck2.recordset && colCheck2.recordset[0] && colCheck2.recordset[0].colExists);
      } catch (e) {
        hasComplaintId = false;
      }

      console.log(`Column check - CustomerId: ${hasCustomerId}, ComplaintId: ${hasComplaintId}`);

      // Build columns and values arrays
      const columns = ['MobileNo', 'Name', 'AssignedCenterId', 'CreatedAt'];
      const values = ['@MobileNo', '@Name', '@AssignedCenterId', 'GETDATE()'];

      const req = pool.request()
        .input("MobileNo", sql.NVarChar, mobileNo)
        .input("Name", sql.NVarChar, name || dbCustomer.Name)
        .input("AssignedCenterId", sql.Int, assignedCenterId);

      // Add CustomerId if column exists
      if (hasCustomerId) {
        columns.splice(2, 0, 'CustomerId');
        values.splice(2, 0, '@CustomerId');
        req.input("CustomerId", sql.Int, customerId || dbCustomer.Id);
      }

      // Add ComplaintId if column exists
      if (hasComplaintId) {
        columns.splice(columns.indexOf('AssignedCenterId'), 0, 'ComplaintId');
        values.splice(values.indexOf('@AssignedCenterId'), 0, '@ComplaintId');
        req.input("ComplaintId", sql.NVarChar, complaintId || null);
      }

      const insertQuery = `
        INSERT INTO ComplaintRegistration
        (${columns.join(', ')})
        VALUES
        (${values.join(', ')})
      `;

      console.log("Insert query:", insertQuery);

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

module.exports = router;
