import { sequelize } from './db.js';

async function setupStatus() {
  try {
    console.log('🔍 Checking status table...');
    
    const result = await sequelize.query('SELECT * FROM [status]', {
      type: sequelize.QueryTypes.SELECT 
    });

    console.log('📋 Existing statuses:', result);

    const pendingExists = result?.find(s => s.status_name === 'pending');
    
    if (!pendingExists) {
      console.log('🆕 Creating pending status...');
      await sequelize.query(
        `INSERT INTO [status] (status_name, created_at, updated_at) 
         VALUES ('pending', GETDATE(), GETDATE())`
      );
      console.log('✅ Pending status created');
    } else {
      console.log('✅ Pending status already exists');
    }

    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

setupStatus();
