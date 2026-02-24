import { sequelize } from './db.js';

const tests = [
  {
    name: 'ActionLog - just basic table',
    sql: `DROP TABLE IF EXISTS [action_log_test1];
    CREATE TABLE [action_log_test1] (
      [log_id] INTEGER IDENTITY(1,1) PRIMARY KEY,
      [user_id] INTEGER NOT NULL,
      CONSTRAINT [FK_user] FOREIGN KEY ([user_id]) REFERENCES [users] ([user_id]) ON DELETE CASCADE
    );`
  },
  {
    name: 'ActionLog - add sub_status columns',
    sql: `DROP TABLE IF EXISTS [action_log_test2];
    CREATE TABLE [action_log_test2] (
      [log_id] INTEGER IDENTITY(1,1) PRIMARY KEY,
      [user_id] INTEGER NOT NULL,
      [old_substatus_id] INTEGER NULL,
      [new_substatus_id] INTEGER NULL,
      CONSTRAINT [FK_user] FOREIGN KEY ([user_id]) REFERENCES [users] ([user_id]) ON DELETE CASCADE
    );`
  },
  {
    name: 'ActionLog - add sub_status FK only old',
    sql: `DROP TABLE IF EXISTS [action_log_test3];
    CREATE TABLE [action_log_test3] (
      [log_id] INTEGER IDENTITY(1,1) PRIMARY KEY,
      [user_id] INTEGER NOT NULL,
      [old_substatus_id] INTEGER NULL,
      [new_substatus_id] INTEGER NULL,
      CONSTRAINT [FK_user] FOREIGN KEY ([user_id]) REFERENCES [users] ([user_id]) ON DELETE CASCADE,
      CONSTRAINT [FK_old_substatus] FOREIGN KEY ([old_substatus_id]) REFERENCES [sub_status] ([sub_status_id]) ON DELETE SET NULL
    );`
  },
  {
    name: 'ActionLog - add sub_status FKs both',
    sql: `DROP TABLE IF EXISTS [action_log_test4];
    CREATE TABLE [action_log_test4] (
      [log_id] INTEGER IDENTITY(1,1) PRIMARY KEY,
      [user_id] INTEGER NOT NULL,
      [old_substatus_id] INTEGER NULL,
      [new_substatus_id] INTEGER NULL,
      CONSTRAINT [FK_user] FOREIGN KEY ([user_id]) REFERENCES [users] ([user_id]) ON DELETE CASCADE,
      CONSTRAINT [FK_old_substatus] FOREIGN KEY ([old_substatus_id]) REFERENCES [sub_status] ([sub_status_id]) ON DELETE SET NULL,
      CONSTRAINT [FK_new_substatus] FOREIGN KEY ([new_substatus_id]) REFERENCES [sub_status] ([sub_status_id]) ON DELETE SET NULL
    );`
  },
  {
    name: 'ActionLog - with other FKs (status)',
    sql: `DROP TABLE IF EXISTS [action_log_test5];
    CREATE TABLE [action_log_test5] (
      [log_id] INTEGER IDENTITY(1,1) PRIMARY KEY,
      [user_id] INTEGER NOT NULL,
      [old_status_id] INTEGER NULL,
      [new_status_id] INTEGER NULL,
      CONSTRAINT [FK_user] FOREIGN KEY ([user_id]) REFERENCES [users] ([user_id]) ON DELETE CASCADE,
      CONSTRAINT [FK_old_status] FOREIGN KEY ([old_status_id]) REFERENCES [status] ([status_id]) ON DELETE SET NULL,
      CONSTRAINT [FK_new_status] FOREIGN KEY ([new_status_id]) REFERENCES [status] ([status_id]) ON DELETE SET NULL
    );`
  }
];

async function main() {
  try {
    await sequelize.authenticate();
    console.log('Testing ActionLog variations\n');

    for (const test of tests) {
      try {
        await sequelize.query(test.sql, { raw: true });
        console.log(`✅ ${test.name}`);
      } catch (err) {
        console.log(`❌ ${test.name}`);
      }
    }

    const result = await sequelize.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_NAME LIKE 'action_log_test%' AND TABLE_SCHEMA='dbo' ORDER BY TABLE_NAME`,
      { raw: true }
    );
    
    console.log(`\nCreated: ${result[0].length} tables`);
    result[0].forEach(t => console.log(`  ${t.TABLE_NAME}`));

    await sequelize.close();
  } catch (err) {
    console.error('Fatal:', err.message);
  }
}

main();
