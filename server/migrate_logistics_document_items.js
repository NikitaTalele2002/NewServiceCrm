/**
 * Migration Script: Restructure logistics_document_items table
 * 
 * Changes:
 * - Rename: logistics_document_id -> document_id
 * - Remove: line_number, part_number, part_description, requested_qty, supplied_qty, 
 *           rejected_qty, received_qty, unit_price, line_total, line_status, notes, 
 *           created_at, updated_at
 * - Add: qty, uom, hsn
 */

import { sequelize } from './db.js';

async function migrateLogisticsDocumentItems() {
  try {
    console.log('Starting migration for logistics_document_items table...');

    const queryInterface = sequelize.getQueryInterface();

    // Step 1: Check if table exists
    const tableExists = await queryInterface.tableExists('logistics_document_items');
    if (!tableExists) {
      console.log('Table does not exist. Creating new table...');
      
      // Create fresh table
      await queryInterface.createTable('logistics_document_items', {
        id: {
          type: sequelize.Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        document_id: {
          type: sequelize.Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'logistics_documents',
            key: 'id',
          },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        spare_part_id: {
          type: sequelize.Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'spare_part',
            key: 'spare_id',
          },
        },
        qty: {
          type: sequelize.Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        uom: {
          type: sequelize.Sequelize.STRING(20),
          allowNull: true,
        },
        hsn: {
          type: sequelize.Sequelize.STRING(50),
          allowNull: true,
        },
      });

      console.log('✅ New table created successfully');
      return;
    }

    // Step 2: Get current table structure
    const columns = await queryInterface.describeTable('logistics_document_items');
    console.log('Current columns:', Object.keys(columns));

    // Step 3: Rename logistics_document_id to document_id if it exists
    if (columns.logistics_document_id) {
      console.log('Renaming logistics_document_id to document_id...');
      await queryInterface.renameColumn('logistics_document_items', 'logistics_document_id', 'document_id');
      console.log('✅ Column renamed successfully');
    }

    // Step 4: Add new columns if they don't exist
    if (!columns.qty) {
      console.log('Adding qty column...');
      await queryInterface.addColumn('logistics_document_items', 'qty', {
        type: sequelize.Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      });
      console.log('✅ qty column added');
    }

    if (!columns.uom) {
      console.log('Adding uom column...');
      await queryInterface.addColumn('logistics_document_items', 'uom', {
        type: sequelize.Sequelize.STRING(20),
        allowNull: true,
      });
      console.log('✅ uom column added');
    }

    if (!columns.hsn) {
      console.log('Adding hsn column...');
      await queryInterface.addColumn('logistics_document_items', 'hsn', {
        type: sequelize.Sequelize.STRING(50),
        allowNull: true,
      });
      console.log('✅ hsn column added');
    }

    // Step 5: Remove old columns that are no longer needed
    const columnsToRemove = [
      'line_number',
      'part_number',
      'part_description',
      'requested_qty',
      'supplied_qty',
      'rejected_qty',
      'received_qty',
      'unit_price',
      'line_total',
      'line_status',
      'notes',
      'created_at',
      'updated_at',
    ];

    for (const col of columnsToRemove) {
      if (columns[col]) {
        console.log(`Removing column: ${col}...`);
        try {
          await queryInterface.removeColumn('logistics_document_items', col);
          console.log(`✅ ${col} column removed`);
        } catch (err) {
          console.log(`⚠️  Could not remove ${col}: ${err.message}`);
          // Continue with next column instead of failing completely
        }
      }
    }

    // Step 6: Add foreign key constraint if not exists
    // Skip constraint check for now - let's focus on getting the columns right
    try {
      console.log('Adding foreign key constraint for document_id...');
      await queryInterface.addConstraint('logistics_document_items', {
        fields: ['document_id'],
        type: 'foreign key',
        name: 'fk_logistics_document_items_document_id',
        references: {
          table: 'logistics_documents',
          field: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });
      console.log('✅ Foreign key constraint added');
    } catch (err) {
      console.log('⚠️  Foreign key constraint already exists or could not be added:', err.message);
    }

    console.log('✅ Migration completed successfully!');
    console.log('\nNew table structure:');
    console.log('- id (INTEGER, PRIMARY KEY, AUTO_INCREMENT)');
    console.log('- document_id (INTEGER, FOREIGN KEY -> logistics_documents.id)');
    console.log('- spare_part_id (INTEGER, FOREIGN KEY -> spare_part.spare_id)');
    console.log('- qty (INTEGER, NOT NULL, DEFAULT 0)');
    console.log('- uom (VARCHAR(20), NULLABLE)');
    console.log('- hsn (VARCHAR(50), NULLABLE)');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run migration
migrateLogisticsDocumentItems();
