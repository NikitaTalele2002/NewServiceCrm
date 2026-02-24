import dotenv from 'dotenv';
import sql from 'mssql';

dotenv.config();

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
};

async function checkColumns() {
  try {
    await sql.connect(config);
    const result = await sql.query`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'TechnicianStatusRequests'`;
    console.log('TechnicianStatusRequests table columns:', result.recordset.map(r => r.COLUMN_NAME));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    sql.close();
  }
}

checkColumns();