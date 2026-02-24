import { sequelize } from './db.js';

async function main() {
  try {
    await sequelize.authenticate();
    console.log('Testing direct SQL creation...\n');
    
    // Try the exact SQL that works in previous test
    const test1 = `DROP TABLE IF EXISTS [action_log_testx];
    CREATE TABLE [action_log_testx] (
      [log_id] INTEGER IDENTITY(1,1) PRIMARY KEY,
      [user_id] INTEGER NOT NULL,
      [old_substatus_id] INTEGER NULL,
      CONSTRAINT [FK_user_x] FOREIGN KEY ([user_id]) REFERENCES [users] ([user_id]) ON DELETE CASCADE
    );`;
    
    try {
      await sequelize.query(test1, { raw: true });
      console.log('✅ Test 1 passed - basic columns with FK');
    } catch (e) {
      console.log('❌ Test 1 failed:', e.message || 'empty error');
    }
    
    // NOW try with FK to sub_status
    const test2 = `DROP TABLE IF EXISTS [action_log_testx];
    CREATE TABLE [action_log_testx] (
      [log_id] INTEGER IDENTITY(1,1) PRIMARY KEY,
      [user_id] INTEGER NOT NULL,
      [old_substatus_id] INTEGER NULL,
      CONSTRAINT [FK_user_x] FOREIGN KEY ([user_id]) REFERENCES [users] ([user_id]) ON DELETE CASCADE,
      CONSTRAINT [FK_substatus_x] FOREIGN KEY ([old_substatus_id]) REFERENCES [sub_status] ([sub_status_id])
    );`;
    
    try {
      await sequelize.query(test2, { raw: true });
      console.log('✅ Test 2 passed - with sub_status FK');
    } catch (e) {
      console.log('❌ Test 2 failed:', e.message || 'empty error');
      // Check if sub_status table exists and is accessible
      const check = await sequelize.query(
        `SELECT COUNT(*) as cnt FROM sub_status`,
        { raw: true, type: sequelize.QueryTypes.SELECT }
      );
      console.log('   sub_status table exists and has', check[0].cnt, 'rows');
    }

    // Try with explicit ON DELETE/UPDATE
    const test3 = `DROP TABLE IF EXISTS [action_log_testx];
    CREATE TABLE [action_log_testx] (
      [log_id] INTEGER IDENTITY(1,1) PRIMARY KEY,
      [user_id] INTEGER NOT NULL,
      [old_substatus_id] INTEGER NULL,
      CONSTRAINT [FK_user_x] FOREIGN KEY ([user_id]) REFERENCES [users] ([user_id]) ON DELETE CASCADE,
      CONSTRAINT [FK_substatus_x] FOREIGN KEY ([old_substatus_id]) REFERENCES [sub_status] ([sub_status_id]) ON DELETE SET NULL
    );`;
    
    try {
      await sequelize.query(test3, { raw: true });
      console.log('✅ Test 3 passed - with sub_status FK and ON DELETE SET NULL');
    } catch (e) {
      console.log('❌ Test 3 failed:', e.message || 'empty error');
    }

    await sequelize.close();
  } catch (err) {
    console.error('Fatal:', err.message);
  }
}

main();
