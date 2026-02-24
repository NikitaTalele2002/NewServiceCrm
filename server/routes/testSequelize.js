const sequelize = require("../database/connection");

(async () => {
  try {
    await sequelize.authenticate();
    console.log("✔ Sequelize connected to MSSQL successfully!");
  } catch (err) {
    // console.error(" Sequelize connection failed:", err.message);
    console.log("this is the new database error that should be printed after the sequelize connection failed if failed");
    console.error("Sequelize connection failed: ",err.message);
  }
})();

module.exports = sequelize;
