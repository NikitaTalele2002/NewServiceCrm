const { poolPromise, sql } = require('../db');

(async () => {
  try {
    const pool = await poolPromise;
    console.log('\n=== Testing GET /api/complaints query ===\n');

    const centerId = 2;
    console.log(`Testing for centerId=${centerId}\n`);

    // Run the exact query from complaints.js
    const complaintsRes = await pool.request().query(`
      SELECT
        COALESCE(c.Id, 0) AS CustomerId,
        COALESCE(c.Name, cr.Name) AS CustomerName,
        cr.MobileNo,
        COALESCE(c.City, '') AS City,
        COALESCE(p.ProductID, 0) AS ProductId,
        COALESCE(p.Product, '') AS Product,
        COALESCE(p.Model, '') AS Model,
        COALESCE(cr.ProductSerialNo, p.ProductSerialNo, '') AS ProductSerialNo,
        COALESCE(p.WarrantyStatus, '') AS WarrantyStatus,
        COALESCE(cr.CallType, 'Complaint') AS CallStatus,
        cr.Id AS ComplaintId,
        cr.CreatedAt,
        cr.AssignedCenterId,
        cr.AssignedTechnicianId
      FROM ComplaintRegistration cr
      LEFT JOIN Customers c ON c.MobileNo = cr.MobileNo
      LEFT JOIN Products p ON p.ProductID = cr.ProductId
      WHERE cr.AssignedCenterId IS NOT NULL
      ORDER BY cr.CreatedAt DESC
    `);

    console.log(`Total complaints with AssignedCenterId: ${complaintsRes.recordset.length}`);
    
    // Filter by centerId
    const filtered = complaintsRes.recordset.filter((c) => String(c.AssignedCenterId) === String(centerId));
    console.log(`Complaints for centerId=${centerId}: ${filtered.length}`);
    
    if (filtered.length > 0) {
      console.log('\nFirst few complaints:');
      filtered.slice(0, 3).forEach(c => {
        console.log(`  - ${c.CustomerName} (${c.MobileNo}), ComplaintId=${c.ComplaintId}, AssignedCenterId=${c.AssignedCenterId}`);
      });
    } else {
      console.log('No complaints assigned to this center.');
    }

    console.log('\n Query executed successfully');
    process.exit(0);
  } catch (err) {
    console.error('\n Error:', err && err.message ? err.message : err);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  }
})();
