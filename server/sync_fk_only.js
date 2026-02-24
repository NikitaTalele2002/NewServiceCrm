/**
 * DATABASE FOREIGN KEY SYNCHRONIZATION TOOL
 * ===========================================================
 * This script:
 * 1. Drops all foreign keys from all tables
 * 2. Re-adds all foreign keys based on model definitions
 * 
 * Perfect for:
 * - Fixing FK constraint issues
 * - Resyncing constraint relationships
 * - Ensuring all FKs are properly defined
 */

import { sequelize } from './db.js';

const dropAllForeignKeys = async () => {
  console.log('\n🔴 STEP 1: Dropping all foreign keys...\n');
  
  try {
    const [foreignKeys] = await sequelize.query(`
      SELECT 
        name as CONSTRAINT_NAME,
        OBJECT_NAME(parent_object_id) as TABLE_NAME
      FROM sys.foreign_keys
      ORDER BY OBJECT_NAME(parent_object_id)
    `);

    console.log(`  Found ${foreignKeys.length} foreign key constraints in database\n`);

    let droppedCount = 0;
    for (const fk of foreignKeys) {
      try {
        const dropQuery = `ALTER TABLE [${fk.TABLE_NAME}] DROP CONSTRAINT [${fk.CONSTRAINT_NAME}]`;
        await sequelize.query(dropQuery);
        console.log(`  ✅ Dropped: ${fk.CONSTRAINT_NAME} (from ${fk.TABLE_NAME})`);
        droppedCount++;
      } catch (err) {
        console.log(`  ⚠️ Could not drop ${fk.CONSTRAINT_NAME}: ${err.message.substring(0, 50)}`);
      }
    }
    
    console.log(`\n  📊 Total Dropped: ${droppedCount}/${foreignKeys.length}`);
    return droppedCount;
  } catch (err) {
    console.log(`  ⚠️ Error querying foreign keys: ${err.message.substring(0, 80)}`);
    return 0;
  }
};

const addForeignKeysFromModels = async () => {
  console.log('\n🔐 STEP 2: Adding foreign keys from model definitions...\n');
  
  try {
    // Load models
    const modelsModule = await import('./models/index.js');
    
    const modelNames = [
      'Customer', 'ProductMaster', 'Users', 'State', 'City', 'Pincode', 'ProductGroup',
      'ProductModel', 'SparePart', 'SpareRequest', 'SpareRequestItem', 'Roles',
      'AccessControl', 'Dealers', 'ReportingAuthority', 'Zones', 'Plant', 'RSM',
      'CustomersProducts', 'Status', 'SubStatus', 'Calls', 'CallSpareUsage', 'Attachments',
      'AttachmentAccess', 'HappyCodes', 'TATTracking', 'TATHolds', 'ActionLog', 'Approvals',
      'SpareInventory', 'StockMovement', 'Cartons', 'GoodsMovementItems', 'ServiceCenter',
      'Technicians', 'CallTechnicianAssignment', 'CallCancellationRequests', 'LogisticsDocuments',
      'LogisticsDocumentItems', 'ServiceInvoice', 'ServiceInvoiceItem', 'DefectMaster',
      'DefectSpares', 'ModelDefects', 'EntityChangeRequests', 'Ledger', 'Replacements',
      'Reimbursement', 'RSMStateMapping', 'SAPDocuments', 'SAPDocumentItems',
      'ServiceCenterFinancial', 'ServiceCenterPincodes'
    ];

    let addedCount = 0;
    let failedCount = 0;

    for (const modelName of modelNames) {
      const model = modelsModule[modelName];
      if (!model) continue;

      const tableName = model.getTableName();
      const rawAttributes = model.rawAttributes || {};

      // Find all foreign key columns
      for (const [attrName, attribute] of Object.entries(rawAttributes)) {
        if (attribute.references) {
          const columnName = attribute.field || attrName;
          const refTable = attribute.references.model;
          const refColumn = attribute.references.key;
          const onDelete = attribute.onDelete || 'RESTRICT';
          const onUpdate = attribute.onUpdate || 'RESTRICT';

          try {
            // Generate a unique FK name
            const fkName = `FK_${tableName}_${columnName}_${Date.now()}`.substring(0, 128);
            
            const addQuery = `ALTER TABLE [${tableName}] 
              ADD CONSTRAINT [${fkName}] 
              FOREIGN KEY ([${columnName}]) 
              REFERENCES [${refTable}]([${refColumn}]) 
              ON DELETE ${onDelete} 
              ON UPDATE ${onUpdate}`;

            await sequelize.query(addQuery);
            console.log(`  ✅ Added: ${tableName}.${columnName} → ${refTable}.${refColumn}`);
            addedCount++;
          } catch (err) {
            // These are expected for polymorphic and self-referencing FKs
            console.log(`  ⚠️  Could not add FK for ${tableName}.${columnName}: ${err.message.split('\n')[0].substring(0, 50)}`);
            failedCount++;
          }
        }
      }
    }

    console.log(`\n  📊 Total Added: ${addedCount}, Failed: ${failedCount}`);
    return { added: addedCount, failed: failedCount };
  } catch (err) {
    console.error(`  ❌ Error: ${err.message}`);
    throw err;
  }
};

const verifyForeignKeys = async () => {
  console.log('\n📊 STEP 3: Verifying foreign keys...\n');
  
  try {
    const [foreignKeys] = await sequelize.query(`
      SELECT 
        name as CONSTRAINT_NAME,
        OBJECT_NAME(parent_object_id) as TABLE_NAME,
        COL_NAME(parent_object_id, parent_column_id) as COLUMN_NAME,
        OBJECT_NAME(referenced_object_id) as REFERENCED_TABLE,
        COL_NAME(referenced_object_id, referenced_column_id) as REFERENCED_COLUMN
      FROM sys.foreign_keys
      ORDER BY OBJECT_NAME(parent_object_id)
    `);

    console.log(`  Total Foreign Keys: ${foreignKeys.length}\n`);
    
    let byTable = {};
    for (const fk of foreignKeys) {
      if (!byTable[fk.TABLE_NAME]) byTable[fk.TABLE_NAME] = [];
      byTable[fk.TABLE_NAME].push(fk);
    }

    for (const [tableName, fks] of Object.entries(byTable)) {
      console.log(`  📋 ${tableName}: ${fks.length} FK(s)`);
      for (const fk of fks) {
        console.log(`      → ${fk.COLUMN_NAME} → ${fk.REFERENCED_TABLE}(${fk.REFERENCED_COLUMN})`);
      }
    }

    return foreignKeys.length;
  } catch (err) {
    console.log(`  ⚠️ Error verifying FKs: ${err.message.substring(0, 80)}`);
    return 0;
  }
};

const main = async () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║       DATABASE FOREIGN KEY SYNCHRONIZATION TOOL              ║
║  Drops all FKs → Re-adds FKs from Model Definitions        ║
╚══════════════════════════════════════════════════════════════╝
  `);

  try {
    // Connect to database
    console.log('🔗 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connected!\n');

    // Step 1: Drop all FKs
    const droppedCount = await dropAllForeignKeys();

    // Step 2: Add FKs back
    const { added, failed } = await addForeignKeysFromModels();

    // Step 3: Verify
    const totalFKs = await verifyForeignKeys();

    // Summary
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    ✅ SYNC COMPLETE                          ║
├──────────────────────────────────────────────────────────────┤
║  Dropped:  ${droppedCount.toString().padEnd(6)}                           
║  Added:    ${added.toString().padEnd(6)}                           
║  Failed:   ${failed.toString().padEnd(6)}                           
║  Final FK Count: ${totalFKs.toString().padEnd(6)}                     
╚══════════════════════════════════════════════════════════════╝
    `);

    process.exit(0);
  } catch (err) {
    console.error(`
╔══════════════════════════════════════════════════════════════╗
║                  ❌ SYNC FAILED                              ║
╚══════════════════════════════════════════════════════════════╝
    `);
    console.error('Error:', err.message);
    if (err.original) {
      console.error('Details:', err.original.message);
    }
    process.exit(1);
  }
};

main();
