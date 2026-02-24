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

async function checkTable() {
  try {
    const pool = await sql.connect(config);
    console.log("Connected to MSSQL");

    // Check if table exists
    const tableResult = await pool.request().query(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_NAME = 'Technicians'
    `);

    if (tableResult.recordset.length === 0) {
      console.log("Technicians table does not exist");
      await pool.close();
      return;
    }

    console.log("Technicians table exists");

    const result = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'Technicians'
      ORDER BY ORDINAL_POSITION
    `);

    console.log("Columns in Technicians table:");
    result.recordset.forEach(row => {
      console.log(`${row.COLUMN_NAME} - ${row.DATA_TYPE} - ${row.IS_NULLABLE}`);
    });

    await pool.close();
  } catch (err) {
    console.error("Error:", err);
  }
}

checkTable();