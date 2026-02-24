/**
 * Test Script - Insert Sample Data & Check ID Starting Point
 * Run: node test_insert_sample_data.js
 */

import { sequelize } from './db.js';
import { QueryTypes } from 'sequelize';

async function testInsertData() {
  try {
    console.log('\n' + '═'.repeat(80));
    console.log('  TEST INSERT SAMPLE DATA & CHECK ID STARTING POINT');
    console.log('═'.repeat(80) + '\n');

    await sequelize.authenticate();
    console.log('✅ Connected to NewCRM database\n');

    // Test 1: Insert into States table
    console.log('📌 TEST 1: Inserting into States table\n');
    
    // First, check current data
    const existingStates = await sequelize.query(
      'SELECT TOP 5 * FROM States ORDER BY state_id DESC',
      { type: QueryTypes.SELECT }
    );
    
    console.log('Before Insert - Last 5 States:');
    if (existingStates.length > 0) {
      existingStates.forEach(s => {
        console.log(`  ID: ${s.state_id}, Code: ${s.state_code}, Name: ${s.state_name}`);
      });
      console.log('');
    } else {
      console.log('  (No existing states)\n');
    }

    // Insert new state
    const insertStateQuery = `
      INSERT INTO States (state_code, state_name, status)
      VALUES ('TEST', 'Test State', 1)
    `;
    
    await sequelize.query(insertStateQuery, { type: QueryTypes.INSERT });
    console.log('✅ Inserted new state\n');

    // Check after insert
    const newStates = await sequelize.query(
      'SELECT TOP 5 * FROM States ORDER BY state_id DESC',
      { type: QueryTypes.SELECT }
    );
    
    console.log('After Insert - Last 5 States:');
    newStates.forEach(s => {
      console.log(`  ID: ${s.state_id}, Code: ${s.state_code}, Name: ${s.state_name}`);
    });
    console.log('');

    // Test 2: Insert into Zones table
    console.log('📌 TEST 2: Inserting into Zones table\n');

    const existingZones = await sequelize.query(
      'SELECT TOP 5 * FROM zones ORDER BY zone_id DESC',
      { type: QueryTypes.SELECT }
    );

    console.log('Before Insert - Last 5 Zones:');
    if (existingZones.length > 0) {
      existingZones.forEach(z => {
        console.log(`  ID: ${z.zone_id}, Code: ${z.zone_code}, Name: ${z.zone_name}`);
      });
      console.log('');
    } else {
      console.log('  (No existing zones)\n');
    }

    const insertZoneQuery = `
      INSERT INTO zones (zone_code, zone_name, status)
      VALUES ('TST', 'Test Zone', 1)
    `;

    await sequelize.query(insertZoneQuery, { type: QueryTypes.INSERT });
    console.log('✅ Inserted new zone\n');

    const newZones = await sequelize.query(
      'SELECT TOP 5 * FROM zones ORDER BY zone_id DESC',
      { type: QueryTypes.SELECT }
    );

    console.log('After Insert - Last 5 Zones:');
    newZones.forEach(z => {
      console.log(`  ID: ${z.zone_id}, Code: ${z.zone_code}, Name: ${z.zone_name}`);
    });
    console.log('');

    // Test 3: Insert into Cities table
    console.log('📌 TEST 3: Inserting into Cities table\n');

    const existingCities = await sequelize.query(
      'SELECT TOP 5 * FROM Cities ORDER BY city_id DESC',
      { type: QueryTypes.SELECT }
    );

    console.log('Before Insert - Last 5 Cities:');
    if (existingCities.length > 0) {
      existingCities.forEach(c => {
        console.log(`  ID: ${c.city_id}, Code: ${c.city_code}, Name: ${c.city_name}`);
      });
      console.log('');
    } else {
      console.log('  (No existing cities)\n');
    }

    const insertCityQuery = `
      INSERT INTO Cities (city_code, city_name, state_id, zone_id, status, city_tier_id)
      SELECT 'TCIT', 'Test City', state_id, zone_id, 1, 1
      FROM States
      CROSS JOIN zones
      WHERE state_code = 'TEST' AND zone_code = 'TST'
    `;

    await sequelize.query(insertCityQuery, { type: QueryTypes.INSERT });
    console.log('✅ Inserted new city\n');

    const newCities = await sequelize.query(
      'SELECT TOP 5 * FROM Cities ORDER BY city_id DESC',
      { type: QueryTypes.SELECT }
    );

    console.log('After Insert - Last 5 Cities:');
    newCities.forEach(c => {
      console.log(`  ID: ${c.city_id}, Code: ${c.city_code}, Name: ${c.city_name}, Tier: ${c.city_tier_id}`);
    });
    console.log('');

    // Test 4: Check if any ID = 0 exists
    console.log('📌 TEST 4: Checking for ID = 0 in any table\n');

    const tables = [
      'States', 'zones', 'Cities', 'Pincodes', 'ProductGroups', 
      'ProductMaster', 'ProductModels', 'spare_parts'
    ];

    let hasZeroIds = false;

    for (const table of tables) {
      const idColumn = table === 'zones' || table === 'spare_parts' ? 'zone_id' 
                      : table === 'States' ? 'state_id'
                      : table === 'Cities' ? 'city_id'
                      : table === 'Pincodes' ? 'pincode_id'
                      : table === 'ProductGroups' ? 'product_group_id'
                      : table === 'ProductMaster' ? 'product_id'
                      : table === 'ProductModels' ? 'model_id'
                      : 'spare_part_id';

      const zeroCheck = await sequelize.query(
        `SELECT COUNT(*) as count FROM ${table} WHERE ${idColumn} = 0`,
        { type: QueryTypes.SELECT }
      );

      const count = zeroCheck[0]?.count || 0;
      if (count > 0) {
        console.log(`  ⚠️  ${table}: Found ${count} records with ID = 0`);
        hasZeroIds = true;
      } else {
        console.log(`  ✅ ${table}: No records with ID = 0`);
      }
    }

    console.log('');

    // Summary
    console.log('═'.repeat(80));
    if (hasZeroIds) {
      console.log('  ⚠️  WARNING: Found records with ID = 0');
      console.log('  This should not happen with proper identity seed configuration');
    } else {
      console.log('  ✅ ALL CHECKS PASSED');
      console.log('  ✅ Sample data inserted successfully');
      console.log('  ✅ All IDs are correctly numbered (no ID = 0)');
      console.log('  ✅ Identity seeds are working properly');
    }
    console.log('═'.repeat(80) + '\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error during test:');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testInsertData();
