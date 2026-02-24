import { sequelize } from '../db.js';
import ProductMasterFactory from '../models/ProductMaster.js';
import { DataTypes } from 'sequelize';

(async () => {
  try {
    const ProductMaster = ProductMasterFactory(sequelize, DataTypes);
    console.log('ProductMaster table name:', ProductMaster.getTableName());
    console.log('ProductMaster attributes:', Object.keys(ProductMaster.rawAttributes));
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
