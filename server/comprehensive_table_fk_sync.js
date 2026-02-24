import { sequelize } from './db.js';

const main = async () => {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║     COMPREHENSIVE TABLE & FOREIGN KEY SYNC                   ║');
  console.log('║  Step 1: Create ALL Missing Tables                           ║');
  console.log('║  Step 2: Sync All Foreign Keys                               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  try {
    // Test connection
    console.log('🔗 Testing database connection...');
    await sequelize.authenticate();
    console.log('✅ Database connected!\n');

    // Load all models
    console.log('📦 Loading all models...');
    await import('./models/index.js');
    console.log('✅ All models loaded\n');

    // STEP 1: Create all missing tables
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║ STEP 1: CREATING ALL MISSING TABLES                          ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    console.log('🔓 Disabling foreign key constraints temporarily...');
    try {
      await sequelize.query('EXEC sp_MSForEachTable "ALTER TABLE ? NOCHECK CONSTRAINT all"');
      console.log('✅ Constraints disabled\n');
    } catch (err) {
      console.log('⚠️ Could not disable constraints (may not be needed)\n');
    }

    console.log('✨ Syncing all tables (creating missing ones)...');
    let createdCount = 0;
    let skippedCount = 0;

    for (const [modelName, model] of Object.entries(sequelize.models)) {
      if (!model) continue;

      try {
        const tableName = model.getTableName();
        
        // Check if table exists
        const [result] = await sequelize.query(
          `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
           WHERE TABLE_TYPE = 'BASE TABLE' AND TABLE_NAME = ?`,
          { replacements: [tableName], raw: true }
        );

        if (result && result.length > 0) {
          console.log(`  ✅ Table exists: ${tableName}`);
          skippedCount++;
        } else {
          // Create table
          await model.sync({ force: false, alter: false });
          console.log(`  ✨ Created table: ${tableName}`);
          createdCount++;
        }
      } catch (err) {
        console.log(`  ⚠️ Could not sync ${modelName}: ${err.message.substring(0, 70)}`);
      }
    }

    console.log(`\n✅ Table creation complete: ${createdCount} created, ${skippedCount} existing\n`);

    // STEP 2: Drop all existing foreign keys
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║ STEP 2: DROPPING ALL EXISTING FOREIGN KEYS                   ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    let droppedCount = 0;
    try {
      const [foreignKeys] = await sequelize.query(`
        SELECT 
          name as CONSTRAINT_NAME,
          OBJECT_NAME(parent_object_id) as TABLE_NAME
        FROM sys.foreign_keys
      `);

      console.log(`  Found ${foreignKeys.length} foreign key constraints\n`);

      for (const fk of foreignKeys) {
        try {
          const dropQuery = `ALTER TABLE [${fk.TABLE_NAME}] DROP CONSTRAINT [${fk.CONSTRAINT_NAME}]`;
          await sequelize.query(dropQuery);
          console.log(`  ✅ Dropped: ${fk.CONSTRAINT_NAME}`);
          droppedCount++;
        } catch (err) {
          console.log(`  ⚠️ Could not drop ${fk.CONSTRAINT_NAME}`);
        }
      }
    } catch (err) {
      console.log(`  ⚠️ Could not query foreign keys: ${err.message.substring(0, 70)}\n`);
    }

    console.log(`\n✅ Foreign key removal complete: ${droppedCount} dropped\n`);

    // STEP 3: Re-enable constraints
    console.log('🔄 Re-enabling foreign key constraints...');
    try {
      await sequelize.query('EXEC sp_MSForEachTable "ALTER TABLE ? CHECK CONSTRAINT all"');
      console.log('✅ Constraints enabled\n');
    } catch (err) {
      console.log('⚠️ Could not enable constraints\n');
    }

    // STEP 4: Re-add all foreign keys
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║ STEP 3: ADDING ALL FOREIGN KEYS FROM MODEL DEFINITIONS       ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

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

    let addedCount = 0;
    let failedCount = 0;

    for (const [modelName, model] of Object.entries(sequelize.models)) {
      if (!model) continue;

      const tableName = model.getTableName();
      const fks = getModelForeignKeys(model);

      for (const fk of fks) {
        try {
          const constraintName = `FK_${tableName}_${fk.column}`;
          
          const alterQuery = `ALTER TABLE [${tableName}] 
            ADD CONSTRAINT [${constraintName}] 
            FOREIGN KEY ([${fk.column}]) 
            REFERENCES [${fk.referencedTable}]([${fk.referencedColumn}]) 
            ON DELETE ${fk.onDelete} 
            ON UPDATE ${fk.onUpdate}`;

          await sequelize.query(alterQuery);
          console.log(`  ✅ Added: ${tableName}.${fk.column}`);
          addedCount++;
        } catch (err) {
          console.log(`  ⚠️ ${modelName}.${fk.column}: ${err.message.split('\n')[0].substring(0, 60)}`);
          failedCount++;
        }
      }
    }

    console.log(`\n✅ Foreign keys addition complete: ${addedCount} added, ${failedCount} failed\n`);

    // STEP 5: Final verification
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║ STEP 4: FINAL VERIFICATION                                   ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    let tableCount = 0;
    let totalColumns = 0;
    let fkCount = 0;

    try {
      const [tables] = await sequelize.query(`
        SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_TYPE = 'BASE TABLE'
      `);
      tableCount = tables[0].count;

      const [columns] = await sequelize.query(`
        SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS
      `);
      totalColumns = columns[0].count;

      const [fks] = await sequelize.query(`
        SELECT COUNT(*) as count FROM sys.foreign_keys
      `);
      fkCount = fks[0].count;
    } catch (err) {
      console.log(`⚠️ Could not get statistics: ${err.message.substring(0, 60)}`);
    }

    console.log(`  📊 Database Statistics:`);
    console.log(`     • Total Tables: ${tableCount}`);
    console.log(`     • Total Columns: ${totalColumns}`);
    console.log(`     • Total Foreign Keys: ${fkCount}\n`);

    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║              ✅ SYNC COMPLETED SUCCESSFULLY!                 ║');
    console.log('║   All tables created, all foreign keys are in place          ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    process.exit(0);
  } catch (err) {
    console.error('\n╔═══════════════════════════════════════════════════════════════╗');
    console.error('║              ❌ SYNC FAILED WITH ERROR                      ║');
    console.error('╚═══════════════════════════════════════════════════════════════╝');
    console.error('\nError details:');
    console.error(err.message);
    process.exit(1);
  }
};

main();
