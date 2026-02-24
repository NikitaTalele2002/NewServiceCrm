// backend/testConnection.js
import { getConnection } from "./db.js";

async function test() {
  try {
    const pool = await getConnection();
    const result = await pool.request().query("SELECT GETDATE() GETTIME() AS currentTime");
    console.log(" DB Connected:", result.recordset);
  } catch (err) {
    console.error("Connection error details:", err);
  }
}

test();

// this code is only for testing to check the database connectivity
// is that database connect with the frontend and the backend or not 


// testConnection.js
const sql = require("mssql/msnodesqlv8");

const dbConfig = {
  server: "localhost\\SQLEXPRESS", // your SQL Server instance
  database: "Crm",                 // your database
  driver: "msnodesqlv8",
  options: {
    trustedConnection: true        // use your Windows login
  }
};

sql.connect(dbConfig)
  .then(() => {
    console.log("DB Connected successfully!");
  })
  .catch((err) => {
    console.error(" DB Connection Error:", JSON.stringify(err, null, 2));
  });


  sql.connect(dbConfig)
    .then(()=>{
      console.log("databse is not connected")
    })