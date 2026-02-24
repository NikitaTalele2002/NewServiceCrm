require('dotenv').config();
const sql = require('mssql');

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
    const result = await sql.query`SELECT TOP 1 * FROM Technicians`;
    if (result.recordset.length > 0) {
      console.log('Technicians table columns:', Object.keys(result.recordset[0]));
      console.log('Sample data:', result.recordset[0]);
    } else {
      console.log('No data in Technicians table');
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    sql.close();
  }
}

checkColumns();