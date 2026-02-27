import sql from "mssql";
const pool = new sql.ConnectionPool({
  server: "localhost\\SQLEXPRESS",
  database: "NewCRM",
  authentication: { type: "default", options: { userName: "crm_user", password: "StrongPassword123!" }},
  options: { encrypt: false, trustServerCertificate: true }
});

await pool.connect();

// Get spare_parts columns
const cols = await pool.request().query(`
  SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='spare_parts' ORDER BY ORDINAL_POSITION
`);
console.log("spare_parts columns:");
cols.recordset.forEach(c => console.log(`  - ${c.COLUMN_NAME}`));

// Get some sample data
const data = await pool.request().query(`SELECT TOP 3 * FROM spare_parts`);
console.log("\nSample spare_parts data:");
if (data.recordset.length > 0) {
  console.log(data.recordset[0]);
}

pool.close();
