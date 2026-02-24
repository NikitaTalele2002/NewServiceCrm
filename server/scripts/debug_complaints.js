const { poolPromise, sql } = require('../db');

(async () => {
  try {
    const pool = await poolPromise;
    console.log('\n=== Checking Complaints Data ===\n');

    // Check Users and their linked service centers
    console.log('--- Users with ServiceCenterId ---');
    const usersRes = await pool.request().query(`
      SELECT UserID, Username, Role, ServiceCenterId FROM Users WHERE Role LIKE '%service%'
    `);
    console.log('Users:', usersRes.recordset);

    // Check ServiceCenters
    console.log('\n--- ServiceCenters ---');
    const centersRes = await pool.request().query(`
      SELECT Id, CenterName, City FROM ServiceCenters ORDER BY Id
    `);
    console.log('Centers:', centersRes.recordset);

    // Check all complaints
    console.log('\n--- All Complaints (ComplaintRegistration) ---');
    const allComplaintsRes = await pool.request().query(`
      SELECT TOP 10 Id, MobileNo, Name, AssignedCenterId, CreatedAt FROM ComplaintRegistration ORDER BY CreatedAt DESC
    `);
    console.log('Total complaints checked:', allComplaintsRes.recordset.length);
    console.log('Complaints:', allComplaintsRes.recordset);

    // Check complaints by AssignedCenterId
    console.log('\n--- Complaints count by AssignedCenterId ---');
    const countRes = await pool.request().query(`
      SELECT AssignedCenterId, COUNT(*) as cnt FROM ComplaintRegistration 
      WHERE AssignedCenterId IS NOT NULL
      GROUP BY AssignedCenterId
      ORDER BY AssignedCenterId
    `);
    console.log('Counts:', countRes.recordset);

    // Check what the GET /api/complaints endpoint would return for each service center
    console.log('\n--- Simulating GET /api/complaints for each center ---');
    for (const user of usersRes.recordset) {
      if (user.ServiceCenterId) {
        const complaintsRes = await pool.request()
          .input('centerId', sql.Int, user.ServiceCenterId)
          .query(`
            SELECT
              c.Id AS CustomerId,
              COALESCE(c.Name, cr.Name) AS CustomerName,
              cr.MobileNo,
              c.City,
              p.Id AS ProductId,
              p.Product,
              p.Model,
              COALESCE(cr.ProductSerialNo, p.ProductSerialNo) AS ProductSerialNo,
              p.WarrantyStatus,
              cr.CallType AS CallStatus,
              cr.Id AS ComplaintId,
              cr.CreatedAt,
              cr.AssignedCenterId,
              cr.AssignedTechnicianId
            FROM ComplaintRegistration cr
            LEFT JOIN Customers c ON c.MobileNo = cr.MobileNo
            LEFT JOIN Products p ON p.Id = cr.ProductId
            WHERE cr.AssignedCenterId = @centerId
            ORDER BY cr.CreatedAt DESC
          `);
        console.log(`\nComplaints for ${user.Username} (CenterId=${user.ServiceCenterId}):`, complaintsRes.recordset.length, 'rows');
        complaintsRes.recordset.slice(0, 3).forEach(r => {
          console.log(`  - ${r.CustomerName} (${r.MobileNo}), ComplaintId=${r.ComplaintId}, AssignedCenterId=${r.AssignedCenterId}`);
        });
      }
    }

    console.log('\ Done');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err && err.message ? err.message : err);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  }
})();
