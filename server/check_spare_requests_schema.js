import { sequelize } from './db.js';

/**
 * Script to check and update spare_requests table
 */

async function checkAndUpdateSpareRequests() {
  try {
    console.log('🔍 Checking spare_requests table structure...\n');

    // Check schema
    const schema = await sequelize.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'spare_requests'
      ORDER BY ORDINAL_POSITION
    `, { type: sequelize.QueryTypes.SELECT });

    console.log('📋 Columns:');
    schema.forEach(col => {
      console.log(`   ${col.COLUMN_NAME}: ${col.DATA_TYPE} (NULL: ${col.IS_NULLABLE})`);
    });

    // Check if requested_to_type exists
    const hasRequestedToType = schema.find(col => col.COLUMN_NAME === 'requested_to_type');
    
    if (!hasRequestedToType) {
      console.log('\n❌ Column "requested_to_type" not found. Adding it...');
      try {
        await sequelize.query(`
          ALTER TABLE spare_requests
          ADD requested_to_type VARCHAR(50) NULL
        `);
        console.log('✅ Column added successfully');
      } catch (e) {
        console.log('⚠️ Column might already exist:', e.message.substring(0, 100));
      }
    } else {
      console.log('\n✅ Column "requested_to_type" already exists');
    }

    // Update all null requested_to_type to 'service_center'
    console.log('\n📝 Updating null requested_to_type values...');
    const result = await sequelize.query(`
      UPDATE spare_requests
      SET requested_to_type = 'service_center'
      WHERE requested_to_type IS NULL
    `);
    console.log(`✅ Updated ${result?.[1]?.rowsAffected || 0} records`);

    // Show some sample data
    console.log('\n📊 Sample spare_requests data:');
    const samples = await sequelize.query(`
      SELECT TOP 5 
        request_id, 
        requested_source_type, 
        requested_to_type,
        request_type,
        status_id,
        created_at
      FROM spare_requests
      ORDER BY request_id DESC
    `, { type: sequelize.QueryTypes.SELECT });

    samples.forEach(row => {
      console.log(`   REQ-${row.request_id}: from ${row.requested_source_type} → ${row.requested_to_type} | ${row.request_type} | Status: ${row.status_id}`);
    });

    console.log('\n✅ All done!');

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

checkAndUpdateSpareRequests();
