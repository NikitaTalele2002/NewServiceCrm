import sql from "mssql";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env") });

const config = {
  server: process.env.DB_SERVER || 'localhost\\SQLEXPRESS',
  database: process.env.DB_NAME || 'Crm',
  user: process.env.DB_USER || 'crm_user',
  password: process.env.DB_PASSWORD || 'StrongPassword123!',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    instanceName: 'SQLEXPRESS'
  }
};

async function insertSampleRequests() {
  try {
    const pool = await sql.connect(config);
    console.log("Connected to MSSQL");

    // Insert sample spare requests one by one to get IDs
    const timestamp = Date.now();

    const insertRequest1 = `
      INSERT INTO SpareRequests (ServiceCenterId, TechnicianId, RequestNumber, Status, CreatedAt, UpdatedAt)
      OUTPUT INSERTED.Id
      VALUES (2, 1, 'REQ-SAMPLE-` + timestamp + `-001', 'Pending', GETDATE(), GETDATE())
    `;

    const result1 = await pool.request().query(insertRequest1);
    const requestId1 = result1.recordset[0].Id;
    console.log("Inserted request 1 with ID:", requestId1);

    const insertRequest2 = `
      INSERT INTO SpareRequests (ServiceCenterId, TechnicianId, RequestNumber, Status, CreatedAt, UpdatedAt)
      OUTPUT INSERTED.Id
      VALUES (2, 2, 'REQ-SAMPLE-` + timestamp + `-002', 'Approved', GETDATE(), GETDATE())
    `;

    const result2 = await pool.request().query(insertRequest2);
    const requestId2 = result2.recordset[0].Id;
    console.log("Inserted request 2 with ID:", requestId2);

    const insertRequest3 = `
      INSERT INTO SpareRequests (ServiceCenterId, TechnicianId, RequestNumber, Status, CreatedAt, UpdatedAt)
      OUTPUT INSERTED.Id
      VALUES (2, 1, 'REQ-SAMPLE-` + timestamp + `-003', 'Rejected', GETDATE(), GETDATE())
    `;

    const result3 = await pool.request().query(insertRequest3);
    const requestId3 = result3.recordset[0].Id;
    console.log("Inserted request 3 with ID:", requestId3);

    console.log("Sample requests inserted successfully");

    // Insert sample request items
    const insertItemsQuery = `
      INSERT INTO SpareRequestItems (RequestId, Sku, SpareName, RequestedQty, ApprovedQty, CreatedAt, UpdatedAt)
      VALUES
      (${requestId1}, 'SAMPLE-SKU-001', 'Sample Spare Part 1', 5, 0, GETDATE(), GETDATE()),
      (${requestId2}, 'SAMPLE-SKU-002', 'Sample Spare Part 2', 3, 3, GETDATE(), GETDATE()),
      (${requestId3}, 'SAMPLE-SKU-003', 'Sample Spare Part 3', 2, 0, GETDATE(), GETDATE())
    `;

    await pool.request().query(insertItemsQuery);
    console.log("Sample request items inserted successfully");

    await pool.close();
  } catch (err) {
    console.error("Error inserting sample data:", err);
  }
}

insertSampleRequests();