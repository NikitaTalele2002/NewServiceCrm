import sql from "mssql";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
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

async function runMigration(migrationFile) {
  try {
    const pool = await sql.connect(config);
    console.log("Connected to MSSQL");

    const migrationPath = path.join(__dirname, "..", "migrations", migrationFile);
    const sqlContent = fs.readFileSync(migrationPath, 'utf8');

    // Execute the entire migration as one statement
    console.log(`Executing migration: ${migrationFile}`);
    await pool.request().query(sqlContent);

    console.log("Migration completed successfully");
    await pool.close();
  } catch (err) {
    console.error("Migration failed:", err);
  }
}

// Run the specific migration
runMigration("create_technician_tables.sql");