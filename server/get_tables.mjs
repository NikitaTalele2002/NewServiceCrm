import sql from "mssql";
const pool = new sql.ConnectionPool({
  server: "localhost\\SQLEXPRESS",
  database: "NewCRM",
  authentication: { type: "default", options: { userName: "crm_user", password: "StrongPassword123!" }},
  options: { encrypt: false, trustServerCertificate: true }
});

await pool.connect();

// List all tables
const res = await pool.request().query(`
  SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME
`);

console.log("Available Tables:");
res.recordset.forEach(r => console.log(`  - ${r.TABLE_NAME}`));

// Check spare_parts table
console.log("\nspare_parts table:");
const sp = await pool.request().query(`SELECT TOP 5 Id, PartCode, PartName FROM spare_parts`);
console.log(`  Found ${sp.recordset.length} rows`);
sp.recordset.forEach(r => console.log(`    ID: ${r.Id}, Code: ${r.PartCode}, Name: ${r.PartName}`));

pool.close();
