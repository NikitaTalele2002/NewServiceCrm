const sql = require("mssql/msnodesqlv8");
// if we select sql authentication then only we requires the username and password otherwise if you choose windows authentication you don't require any username and password 
// this code is for testing connectivity of frontend and backend
// if the frontend is connected with backend then 
// database name, username, password is also for testing purpose
const config = {
  server: 'localhost\\SQLEXPRESS',
  database: 'Crm',
  driver: 'msnodesqlv8',
  options: {
    trustedConnection: true, // Windows Authentication
    encrypt: false,
    trustServerCertificate: true,
    instanceName: 'SQLEXPRESS'
  }
};

const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then((pool) => {
    console.log("Connected to MSSQL Database using Windows Authentication");
    return pool;
  })
  .catch((err) => {
    console.error("Database Connection Failed! Error:", err.message);
    console.error("Full error:", err);
    throw err;
  });

module.exports = { sql, poolPromise };
