import { Sequelize } from 'sequelize';
import { sequelize } from './db.js';

const EXPECTED_TABLES = ['calls', 'spare_requests', 'spare_request_items'];

async function checkTables() {
  try {
    console.log('\n=== CHECKING FOR MISSING TABLES ===\n');
    
    for (const tableName of EXPECTED_TABLES) {
      const query = `
        SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = ?
      `;
      
      const result = await sequelize.query(query, {
        replacements: [tableName],
        type: 'SELECT'
      });
      
      console.log(`Table "${tableName}": ${result.length > 0 ? 'EXISTS' : 'MISSING'}`);
      if (result.length > 0) {
        console.log(`  Details: `, result[0]);
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkTables();
