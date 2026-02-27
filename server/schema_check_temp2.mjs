import sql from "mssql";
const pool = new sql.ConnectionPool({
  server: "localhost\\SQLEXPRESS",
  database: "NewCRM",
  authentication: { type: "default", options: { userName: "crm_user", password: "StrongPassword123!" }},
  options: { encrypt: false, trustServerCertificate: true }
});
await pool.connect();

const res = await pool.request().query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'technician_spare_return_items' ORDER BY ORDINAL_POSITION`);
console.log("technician_spare_return_items:");
res.recordset.forEach(r => console.log(`  - ${r.COLUMN_NAME}`));
pool.close();
