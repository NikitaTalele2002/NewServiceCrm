import { sequelize } from './db.js';

async function main() {
  try {
    await sequelize.authenticate();
    
    // Check users table structure
    const result = await sequelize.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMNPROPERTY(OBJECT_ID('users'), COLUMN_NAME, 'IsIdentity') as IsIdentity
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'users'
      ORDER BY ORDINAL_POSITION
    `, { raw: true });
    
    console.log('═══ USERS TABLE STRUCTURE ═══\n');
    result[0].forEach(c => {
      console.log(`${c.COLUMN_NAME.padEnd(20)} ${c.DATA_TYPE.padEnd(15)} NULL: ${c.IS_NULLABLE} ID: ${c.IsIdentity}`);
    });
    
    // Try the ForeignKey explicitly
    console.log('\n\nTesting FK creation...');
    try {
      await sequelize.query(`
        DROP TABLE IF EXISTS [test_fk];
        CREATE TABLE [test_fk] (
          [id] INT PRIMARY KEY,
          [user_ref] INT,
          CONSTRAINT [FK_users_ref] FOREIGN KEY ([user_ref]) REFERENCES [users] ([user_id]) ON DELETE SET NULL
        );
      `, { raw: true });
      console.log('✅ FK to users.user_id works');
    } catch (e) {
      console.log('❌ FK to users.user_id FAILED');
      console.log('Error:', e.message || 'empty');
    }

    await sequelize.close();
  } catch (err) {
    console.error('Fatal:', err.message);
  }
}

main();
