import { Sequelize } from "sequelize";

const sequelize = new Sequelize("NewCRM", "crm_user", "StrongPassword123!", {
  host: "localhost\\SQLEXPRESS",
  dialect: "mssql",
  dialectOptions: {
    options: {
      encrypt: false,
      trustServerCertificate: true,
      instanceName: "SQLEXPRESS"
    }
  },
  logging: false
});

export default sequelize;