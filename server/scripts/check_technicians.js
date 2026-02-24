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

async function checkTechnicians() {
  try {
    const pool = await sql.connect(config);
    console.log("Connected to MSSQL");

    // Check columns
    const result = await pool.request().query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'Technicians'
      ORDER BY ORDINAL_POSITION
    `);
    console.log("Technicians columns:");
    result.recordset.forEach(row => {
      console.log(row.COLUMN_NAME);
    });

    // Check data
    const dataResult = await pool.request().query(`
      SELECT TOP 5 Id, ServiceCenterId, Name FROM Technicians
    `);
    console.log("Technicians data:");
    dataResult.recordset.forEach(row => {
      console.log(`Id: ${row.Id}, ServiceCenterId: ${row.Id}, Name: ${row.Name}`);
    });

    await pool.close();
  } catch (err) {
    console.error("Error:", err);
  }
}

checkTechnicians();