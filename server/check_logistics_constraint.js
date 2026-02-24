import { sequelize } from './db.js';

// Check the logistics_documents status column definition
const result = await sequelize.query(`
  SELECT COLUMN_NAME, DATA_TYPE 
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'logistics_documents' AND COLUMN_NAME = 'status'
`, { type: sequelize.QueryTypes.SELECT });

console.log('Status column:', result);

// Get CHECK constraint definition
const constraintResult = await sequelize.query(`
  SELECT CONSTRAINT_NAME, definition
  FROM INFORMATION_SCHEMA.CHECK_CONSTRAINTS
  WHERE CONSTRAINT_NAME LIKE 'CK__logistics%status%'
`, { type: sequelize.QueryTypes.SELECT });

console.log('CHECK constraints:', constraintResult);

await sequelize.close();
