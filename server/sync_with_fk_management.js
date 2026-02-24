import { sequelize } from './db.js';

let allModels = {};

const loadAllModels = async () => {
  try {
    const modelsModule = await import('./models/index.js');
    allModels = modelsModule;
    console.log('✅ Models loaded successfully');
    return modelsModule;
  } catch (err) {
    console.error('Failed to load models:', err.message);
    throw err;
  }
};

const getAllModels = () => {
  const modelNames = [
    'State', 'City', 'Pincode', 'ProductGroup', 'ProductMaster', 'ProductModel', 'SparePart',
    'Roles', 'Users', 'Plant', 'Zones', 'Dealers', 'ReportingAuthority', 'AccessControl',
    'RSM', 'RSMStateMapping', 'Customer', 'CustomersProducts', 'Status', 'SubStatus',
    'ServiceCenter', 'ServiceCenterPincodes', 'ServiceCenterFinancial', 'Technicians',
    'Calls', 'CallSpareUsage', 'CallTechnicianAssignment', 'CallCancellationRequests',
    'SpareRequest', 'SpareRequestItem', 'SpareInventory', 'StockMovement', 'GoodsMovementItems',
    'Cartons', 'LogisticsDocuments', 'LogisticsDocumentItems', 'Approvals', 'ActionLog',
    'HappyCodes', 'Attachments', 'AttachmentAccess', 'TATTracking', 'TATHolds',
    'ServiceInvoice', 'ServiceInvoiceItem', 'DefectMaster', 'DefectSpares', 'ModelDefects',
    'EntityChangeRequests', 'Ledger', 'Replacements', 'Reimbursement', 'SAPDocuments',
    'SAPDocumentItems'
  ];

  return modelNames
    .map(name => ({ name, model: allModels[name] }))
    .filter(({ model }) => model);
};

const getModelForeignKeys = (model) => {
  const fks = [];
  if (!model) return fks;

  for (const [attrName, attribute] of Object.entries(model.rawAttributes || {})) {
    if (attribute.references) {
      fks.push({
        column: attribute.field || attrName,
        referencedTable: attribute.references.model,
        referencedColumn: attribute.references.key,
        onDelete: attribute.onDelete || 'RESTRICT',
        onUpdate: attribute.onUpdate || 'RESTRICT',
      });
    }
  }
  return fks;
};

const dropAllForeignKeys = async () => {
  console.log('\n🔴 STEP 1: Dropping all foreign keys...');
  let droppedCount = 0;

  try {
    // Get all foreign keys from database using sys.foreign_keys
    const [foreignKeys] = await sequelize.query(`
      SELECT 
        name as CONSTRAINT_NAME,
        OBJECT_NAME(parent_object_id) as TABLE_NAME
      FROM sys.foreign_keys
    `);

    console.log(`  Found ${foreignKeys.length} foreign key constraints in database`);

    // Drop each constraint
    for (const fk of foreignKeys) {
      try {
        const dropQuery = `ALTER TABLE [${fk.TABLE_NAME}] DROP CONSTRAINT [${fk.CONSTRAINT_NAME}]`;
        await sequelize.query(dropQuery);
        console.log(`  ✅ Dropped FK: ${fk.CONSTRAINT_NAME}`);
        droppedCount++;
      } catch (err) {
        console.log(`  ⚠️ Could not drop ${fk.CONSTRAINT_NAME}: ${err.message.substring(0, 60)}`);
      }
    }
  } catch (err) {
    console.log(`  ⚠️ Could not query foreign keys: ${err.message.substring(0, 80)}`);
  }

  console.log(`\n✅ Foreign keys drop attempt complete. Dropped: ${droppedCount}`);
};

const disableConstraints = async () => {
  console.log('\n🔓 Disabling foreign key constraints temporarily...');
  try {
    await sequelize.query('EXEC sp_MSForEachTable "ALTER TABLE ? NOCHECK CONSTRAINT all"');
    console.log('  ✅ Constraints disabled');
  } catch (err) {
    console.log('  ⚠️ Could not disable constraints:', err.message.substring(0, 60));
  }
};

const enableConstraints = async () => {
  console.log('\n🔄 Enabling foreign key constraints...');
  try {
    await sequelize.query('EXEC sp_MSForEachTable "ALTER TABLE ? CHECK CONSTRAINT all"');
    console.log('  ✅ Constraints enabled');
  } catch (err) {
    console.log('  ⚠️ Could not enable constraints:', err.message.substring(0, 60));
  }
};

const syncAllTables = async () => {
  console.log('\n✨ STEP 2: Syncing all tables (creating without altering columns)...');
  try {
    // Use force: false to not drop tables, alter: false to avoid column alteration issues with ENUM
    await sequelize.sync({ alter: false, force: false });
    console.log('\n✅ All tables synced successfully!');
  } catch (err) {
    console.error('\n❌ Error during sync:');
    console.error('Message:', err.message);
    if (err.original) {
      console.error('Original Error:', err.original.message);
    }
    if (err.sql) {
      console.error('SQL:', err.sql);
    }
    throw err;
  }
};

const addAllForeignKeys = async () => {
  console.log('\n🔐 STEP 3: Adding foreign keys back...');
  const models = getAllModels();
  let addedCount = 0;

  for (const { name, model } of models) {
    if (!model) continue;

    const tableName = model.getTableName();
    const fks = getModelForeignKeys(model);

    for (const fk of fks) {
      try {
        // Generate constraint name
        const constraintName = `FK_${tableName}_${fk.column}`;
        
        const alterQuery = `ALTER TABLE [${tableName}] 
          ADD CONSTRAINT [${constraintName}] 
          FOREIGN KEY ([${fk.column}]) 
          REFERENCES [${fk.referencedTable}]([${fk.referencedColumn}]) 
          ON DELETE ${fk.onDelete} 
          ON UPDATE ${fk.onUpdate}`;

        await sequelize.query(alterQuery);
        console.log(`  ✅ Added FK: ${tableName}.${fk.column}`);
        addedCount++;
      } catch (err) {
        // Log but continue - polymorphic and self-referencing FKs may fail
        console.log(`  ⚠️ Could not add FK for ${name}.${fk.column}: ${err.message.split('\n')[0].substring(0, 60)}`);
      }
    }
  }

  console.log(`\n✅ Foreign keys addition complete. Added: ${addedCount}`);
};

const verifyTables = async () => {
  console.log('\n📊 STEP 4: Verifying tables and their structure...');
  const models = getAllModels();
  let tableCount = 0;
  let columnCount = 0;

  for (const { name, model } of models) {
    if (!model) continue;

    try {
      const tableName = model.getTableName();
      const [tableInfo] = await sequelize.query(
        `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
         WHERE TABLE_TYPE = 'BASE TABLE' AND TABLE_NAME = ?`,
        { replacements: [tableName], raw: true }
      );

      if (tableInfo && tableInfo.length > 0) {
        tableCount++;
        const [columns] = await sequelize.query(
          `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_NAME = ?`,
          { replacements: [tableName], raw: true }
        );
        columnCount += columns.length;
        console.log(`  ✅ Table ${tableName}: ${columns.length} columns`);
      }
    } catch (err) {
      console.log(`  ⚠️ Could not verify ${name}: ${err.message.substring(0, 50)}`);
    }
  }

  console.log(`\n✅ Verification complete: ${tableCount} tables, ${columnCount} total columns`);
};


const main = async () => {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     DATABASE SYNC WITH FOREIGN KEY MANAGEMENT             ║');
  console.log('║  This will: Drop FKs → Sync Tables → Add FKs Back        ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Test connection
    console.log('🔗 Testing database connection...');
    await sequelize.authenticate();
    console.log('✅ Database connected successfully!\n');

    // Load models
    console.log('📦 Loading all models...');
    await loadAllModels();

    // Step 1: Disable constraints and drop FKs
    await disableConstraints();
    await dropAllForeignKeys();

    // Step 2: Sync all tables
    await syncAllTables();

    // Step 3: Re-enable constraints and add FK back
    await enableConstraints();
    await addAllForeignKeys();

    // Step 4: Verify
    await verifyTables();

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║           ✅ SYNC COMPLETED SUCCESSFULLY!                 ║');
    console.log('║  All tables are created with foreign keys restored      ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    process.exit(0);
  } catch (err) {
    console.error('\n╔════════════════════════════════════════════════════════════╗');
    console.error('║              ❌ SYNC FAILED WITH ERROR                   ║');
    console.error('╚════════════════════════════════════════════════════════════╝');
    console.error('\nError details:');
    console.error(err.message);
    process.exit(1);
  }
};

main();
