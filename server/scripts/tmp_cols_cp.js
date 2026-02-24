import { CustomersProducts } from './models/index.js';

const cols = await CustomersProducts.sequelize.query(`SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'customers_products'`, { type: CustomersProducts.sequelize.QueryTypes.SELECT });
console.log(JSON.stringify(cols, null, 2));
process.exit(0);
