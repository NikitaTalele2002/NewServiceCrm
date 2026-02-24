import sql from "mssql";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "..", ".env") });

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

async function checkUsers() {
  try {
    const pool = await sql.connect(config);
    console.log("Connected to MSSQL");

    // Get service centers for branchId = 5
    const scResult = await pool.request().query(`
      SELECT Id FROM ServiceCenters WHERE BranchId = 5
    `);
    const scIds = scResult.recordset.map(row => row.Id);
    console.log("Service Center IDs:", scIds);

    if (scIds.length === 0) {
      console.log("No service centers found for branch 5");
      await pool.close();
      return;
    }

    // Get users for these centerIds
    const userResult = await pool.request().query(`
      SELECT UserID, Username FROM Users WHERE CenterId IN (${scIds.join(',')})
    `);
    console.log("Users:");
    userResult.recordset.forEach(row => {
      console.log(`UserID: ${row.UserID}, Username: ${row.Username}`);
    });

    const userIds = userResult.recordset.map(row => row.UserID).filter(id => id != null);
    console.log("Filtered UserIDs:", userIds);

    await pool.close();
  } catch (err) {
    console.error("Error:", err);
  }
}

checkUsers();