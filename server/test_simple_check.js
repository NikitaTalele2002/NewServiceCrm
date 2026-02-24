/**
 * Simple test: Check database structure and data
 */

import { sequelize } from './db.js';

async function check() {
  try {
    console.log('Checking database...\n');

    // Check table columns
    console.log('1️⃣ Checking spare_requests columns...');
    const cols = await sequelize.query(`
      SELECT COLUMN_NAME, DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'spare_requests'
      ORDER BY ORDINAL_POSITION
    `, { type: sequelize.QueryTypes.SELECT });

    console.log('Columns found:');
    cols.forEach(c => console.log(`  - ${c.COLUMN_NAME} (${c.DATA_TYPE})`));

    // Check data
    console.log('\n2️⃣ Checking allocated requests (status_id = 3)...');
    const data = await sequelize.query(`
      SELECT TOP 5 request_id, request_number, status_id, technician_id, service_center_id
      FROM spare_requests
      WHERE status_id = 3
      ORDER BY request_id DESC
    `, { type: sequelize.QueryTypes.SELECT });

    if (data.length > 0) {
      console.log(`Found ${data.length} records:`);
      data.forEach(r => {
        console.log(`  - ID: ${r.request_id}, Num: ${r.request_number}, TechID: ${r.technician_id}, SC: ${r.service_center_id}`);
      });
    } else {
      console.log('❌ No allocated requests found!');
    }

    // Check technician data
    console.log('\n3️⃣ Checking technician data...');
    const techs = await sequelize.query(`
      SELECT TOP 3 technician_id, name, service_center_id
      FROM technicians
      ORDER BY technician_id
    `, { type: sequelize.QueryTypes.SELECT });

    console.log(`Found ${techs.length} technicians:`);
    techs.forEach(t => {
      console.log(`  - ID: ${t.technician_id}, Name: ${t.name}, SC: ${t.service_center_id}`);
    });

    // Check what the API route SHOULD be using
    console.log('\n4️⃣ Testing simple query (what route should use)...');
    const test = await sequelize.query(`
      SELECT 
        sr.request_id,
        sr.request_number, 
        sr.status_id,
        t.name as tech_name
      FROM spare_requests sr
      LEFT JOIN technicians t ON sr.technician_id = t.technician_id
      WHERE sr.status_id = 3
      ORDER BY sr.request_id DESC
    `, { type: sequelize.QueryTypes.SELECT });

    console.log(`Query returned ${test.length} records`);
    if (test.length > 0) {
      console.log('Sample:', test[0]);
    }

  } catch (error) {
    console.error('ERROR:', error.message);
    if (error.errors) {
      console.error('SQL Errors:');
      error.errors.forEach(e => console.log('  -', e.message));
    }
  } finally {
    await sequelize.close();
  }
}

check();
