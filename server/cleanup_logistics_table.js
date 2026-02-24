/**
 * Alternative approach: Recreate the table without line_status
 */

import { sequelize } from './db.js';

async function cleanupTable() {
  const transaction = await sequelize.transaction();

  try {
    console.log('Creating backup of logistics_document_items data...');
    
    // Create backup data
    const backupData = await sequelize.query(
      `SELECT * FROM logistics_document_items`,
      { transaction }
    );

    console.log(`✅ Backed up ${backupData[0].length} rows`);

    // Drop the old table
    console.log('Dropping old table...');
    await sequelize.query('DROP TABLE logistics_document_items', { transaction });
    console.log('✅ Old table dropped');

    // Create new table without the problematic column
    console.log('Creating new table with correct schema...');
    await sequelize.query(`
      CREATE TABLE logistics_document_items (
        id INT PRIMARY KEY IDENTITY(1,1),
        document_id INT NOT NULL,
        spare_part_id INT,
        qty INT NOT NULL DEFAULT 0,
        uom VARCHAR(20),
        hsn VARCHAR(50),
        FOREIGN KEY (document_id) REFERENCES logistics_documents(id) ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY (spare_part_id) REFERENCES spare_part(spare_id)
      )
    `, { transaction });
    console.log('✅ New table created');

    // Restore data if there was any
    if (backupData[0].length > 0) {
      console.log('Restoring data...');
      for (const row of backupData[0]) {
        await sequelize.query(`
          INSERT INTO logistics_document_items (id, document_id, spare_part_id, qty, uom, hsn)
          VALUES (:id, :document_id, :spare_part_id, :qty, :uom, :hsn)
        `, {
          replacements: {
            id: row.id,
            document_id: row.document_id,
            spare_part_id: row.spare_part_id,
            qty: row.qty || 0,
            uom: row.uom,
            hsn: row.hsn
          },
          transaction
        });
      }
      console.log(`✅ Restored ${backupData[0].length} rows`);
    }

    // Create indexes
    console.log('Creating indexes...');
    await sequelize.query(
      `CREATE INDEX idx_ldi_document_id ON logistics_document_items(document_id)`,
      { transaction }
    );
    await sequelize.query(
      `CREATE INDEX idx_ldi_spare_part_id ON logistics_document_items(spare_part_id)`,
      { transaction }
    );
    console.log('✅ Indexes created');

    await transaction.commit();

    // Verify
    const result = await sequelize.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'logistics_document_items' ORDER BY ORDINAL_POSITION`
    );

    console.log('\n✅ Final table structure:');
    result[0].forEach(row => {
      console.log(`  - ${row.COLUMN_NAME}`);
    });

    console.log('\n✅ Migration completed successfully!');
    process.exit(0);

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

cleanupTable();
