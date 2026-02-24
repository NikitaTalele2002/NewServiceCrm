import { sequelize } from './db.js';

/**
 * Test with ENUM CHECK constraints
 */

const tests = [
  {
    name: 'Ledger with ENUM checks',
    sql: `DROP TABLE IF EXISTS [ledger_enum_test];
    CREATE TABLE [ledger_enum_test] (
      [ledger_id] INTEGER IDENTITY(1,1) PRIMARY KEY,
      [asc_id] INTEGER NOT NULL,
      [transaction_type] VARCHAR(255) CHECK ([transaction_type] IN(N'debit', N'credit')),
      [reference_type] VARCHAR(255) CHECK ([reference_type] IN(N'spare_request', N'reimbursement', N'payment', N'adjustment', N'security_deposit')),
      [created_at] DATETIMEOFFSET NULL,
      FOREIGN KEY ([asc_id]) REFERENCES [service_centers] ([asc_id]) ON DELETE CASCADE
    );`
  },
  {
    name: 'ActionLog with ENUMs + sub_status ref',
    sql: `DROP TABLE IF EXISTS [action_log_test];
    CREATE TABLE [action_log_test] (
      [log_id] INTEGER IDENTITY(1,1) PRIMARY KEY,
      [user_id] INTEGER NOT NULL,
      [old_substatus_id] INTEGER NULL,
      [new_substatus_id] INTEGER NULL,
      [created_at] DATETIMEOFFSET NULL,
      CONSTRAINT [FK_old_substatus] FOREIGN KEY ([old_substatus_id]) REFERENCES [sub_status] ([sub_status_id]) ON DELETE SET NULL,
      CONSTRAINT [FK_new_substatus] FOREIGN KEY ([new_substatus_id]) REFERENCES [sub_status] ([sub_status_id]) ON DELETE SET NULL,
      CONSTRAINT [FK_user] FOREIGN KEY ([user_id]) REFERENCES [users] ([user_id]) ON DELETE CASCADE
    );`
  },
  {
    name: 'RSMStateMapping with rsms ref',
    sql: `DROP TABLE IF EXISTS [rsm_state_mapping_test];
    CREATE TABLE [rsm_state_mapping_test] (
      [id] INTEGER IDENTITY(1,1) PRIMARY KEY,
      [rsm_user_id] INTEGER NOT NULL,
      [state_id] INTEGER NOT NULL,
      [is_active] BIT DEFAULT 1,
      CONSTRAINT [UC_rsm_state] UNIQUE ([rsm_user_id], [state_id]),
      CONSTRAINT [FK_rsm_user] FOREIGN KEY ([rsm_user_id]) REFERENCES [rsms] ([rsm_id]) ON DELETE CASCADE,
      CONSTRAINT [FK_rsm_state] FOREIGN KEY ([state_id]) REFERENCES [States] ([Id]) ON DELETE CASCADE
    );`
  },
  {
    name: 'CallTechnicianAssignment with tech ref',
    sql: `DROP TABLE IF EXISTS [call_tech_assign_test];
    CREATE TABLE [call_tech_assign_test] (
      [id] INTEGER IDENTITY(1,1) PRIMARY KEY,
      [call_id] INTEGER NOT NULL,
      [technician_id] INTEGER NOT NULL,
      [assigned_reason] VARCHAR(255) CHECK ([assigned_reason] IN(N'ABSENT', N'OVERLOADED', N'CUSTOMER_REQUEST', N'PERFORMANCE', N'AVAILABILITY')),
      [assigned_at] DATETIMEOFFSET NULL,
      [is_active] BIT DEFAULT 1,
      CONSTRAINT [FK_call] FOREIGN KEY ([call_id]) REFERENCES [calls] ([call_id]) ON DELETE CASCADE,
      CONSTRAINT [FK_tech] FOREIGN KEY ([technician_id]) REFERENCES [technicians] ([technician_id]) ON DELETE CASCADE
    );`
  }
];

async function main() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected\n');

    for (const test of tests) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📝 ${test.name}`);
      console.log('='.repeat(60));
      try {
        await sequelize.query(test.sql, { raw: true });
        console.log('✅ SUCCESS');
      } catch (err) {
        console.log('❌ FAILED');
        console.log('Message:', err.message || '(empty)');
        console.log('Code:', err.code || '(none)');
        console.log('Number:', err.number || '(none)');
        if (err.parent) {
          console.log('Parent message:', err.parent.message || '(empty)');
          console.log('Parent code:', err.parent.code || '(none)');
        }
      }
    }

    // Check what tables exist
    const result = await sequelize.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_NAME LIKE '%test%' AND TABLE_SCHEMA='dbo'`,
      { raw: true }
    );
    
    console.log(`\n\n📊 Test tables created:`);
    result[0].forEach(t => console.log(`  - ${t.TABLE_NAME}`));

    await sequelize.close();
  } catch (err) {
    console.error('Fatal:', err.message);
  }
}

main();
