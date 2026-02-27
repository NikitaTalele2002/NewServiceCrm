import sql from "mssql";
const pool = new sql.ConnectionPool({
  server: "localhost\\SQLEXPRESS",
  database: "NewCRM",
  authentication: { type: "default", options: { userName: "crm_user", password: "StrongPassword123!" }},
  options: { encrypt: false, trustServerCertificate: true }
});
await pool.connect();

const res = await pool.request().query(`SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME`);
console.log("Available tables:");
res.recordset.forEach(r => console.log(`  - ${r.TABLE_NAME}`));
pool.close();
