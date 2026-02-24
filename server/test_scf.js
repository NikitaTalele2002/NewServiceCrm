import { sequelize } from './db.js';

try {
  await sequelize.query('DROP TABLE IF EXISTS [service_center_financial]', { raw: true });
  console.log('Dropped if exists');
  
  // Try version 1: With NO ACTION instead of CASCADE
  console.log('\nTrying with NO ACTION...');
  let sql = `IF OBJECT_ID('[service_center_financial]', 'U') IS NULL 
    CREATE TABLE [service_center_financial] (
      [id] INT IDENTITY(1,1) PRIMARY KEY,
      [asc_id] INT NOT NULL UNIQUE,
      [security_amount] DECIMAL(15,2) DEFAULT 0,
      [credit_limit] DECIMAL(15,2),
      [current_outstanding] DECIMAL(15,2) DEFAULT 0,
      [last_updated_at] DATETIMEOFFSET DEFAULT GETDATE(),
      [last_updated_by] INT,
      [created_at] DATETIMEOFFSET DEFAULT GETDATE(),
      [updated_at] DATETIMEOFFSET DEFAULT GETDATE(),
      CONSTRAINT [FK_scf_asc] FOREIGN KEY ([asc_id]) REFERENCES [service_centers] ([asc_id]) ON DELETE NO ACTION,
      CONSTRAINT [FK_scf_user] FOREIGN KEY ([last_updated_by]) REFERENCES [users] ([user_id]) ON DELETE SET NULL
    );`;
  
  try {
    await sequelize.query(sql, { raw: true });
    console.log('✅ SUCCESS with NO ACTION!');
    process.exit(0);
  } catch (err) {
    console.log('❌ Failed with NO ACTION:', err.original?.message || err.message || '(silent error)');
  }

  // Try version 2: Without UNIQUE constraint on asc_id
  await sequelize.query('DROP TABLE IF EXISTS [service_center_financial]', { raw: true });
  console.log('\nTrying without UNIQUE constraint...');
  
  sql = `IF OBJECT_ID('[service_center_financial]', 'U') IS NULL 
    CREATE TABLE [service_center_financial] (
      [id] INT IDENTITY(1,1) PRIMARY KEY,
      [asc_id] INT NOT NULL,
      [security_amount] DECIMAL(15,2) DEFAULT 0,
      [credit_limit] DECIMAL(15,2),
      [current_outstanding] DECIMAL(15,2) DEFAULT 0,
      [last_updated_at] DATETIMEOFFSET DEFAULT GETDATE(),
      [last_updated_by] INT,
      [created_at] DATETIMEOFFSET DEFAULT GETDATE(),
      [updated_at] DATETIMEOFFSET DEFAULT GETDATE(),
      CONSTRAINT [FK_scf_asc] FOREIGN KEY ([asc_id]) REFERENCES [service_centers] ([asc_id]) ON DELETE CASCADE,
      CONSTRAINT [FK_scf_user] FOREIGN KEY ([last_updated_by]) REFERENCES [users] ([user_id]) ON DELETE SET NULL
    );`;
  
  try {
    await sequelize.query(sql, { raw: true });
    console.log('✅ SUCCESS without UNIQUE!');
    // Now add a unique constraint separately
    await sequelize.query('ALTER TABLE [service_center_financial] ADD CONSTRAINT [UQ_scf_asc] UNIQUE ([asc_id])');
    console.log('✅ Added UNIQUE constraint via ALTER');
    process.exit(0);
  } catch (err) {
    console.log('❌ Failed without UNIQUE:', err.original?.message || err.message || '(silent error)');
  }

  process.exit(1);
} catch (err) {
  console.log('❌ Script error:', err.message);
  process.exit(1);
}
