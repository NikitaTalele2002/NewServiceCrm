/**
 * Check Plants Table Schema
 */

import { sequelize } from './db.js';
import { QueryTypes } from 'sequelize';

async function checkPlantsSchema() {
  try {
    console.log('Checking plants table schema...\n');

    const columns = await sequelize.query(`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'plants'
      ORDER BY ORDINAL_POSITION
    `, { type: QueryTypes.SELECT });

    console.log('✅ Plants Table Columns:');
    columns.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
    });

    // Show sample plants
    console.log('\n📋 Sample Plants:');
    const plants = await sequelize.query(`
      SELECT TOP 5 * FROM plants
    `, { type: QueryTypes.SELECT });

    plants.forEach(p => {
      console.log(`  - ID: ${p.plant_id}, Description: ${p.plant_description}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message || error);
  } finally {
    process.exit(0);
  }
}

checkPlantsSchema();
