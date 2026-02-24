import { sequelize } from './db.js';

async function main() {
  try {
    await sequelize.authenticate();
    
    const tables = await sequelize.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_TYPE='BASE TABLE' AND TABLE_SCHEMA='dbo'
       ORDER BY TABLE_NAME`, 
      { raw: true }
    );
    
    console.log('\n=== EXISTING TABLES IN DATABASE ===\n');
    tables[0].forEach((t, i) => {
      console.log(`${i+1}. ${t.TABLE_NAME}`);
    });
    console.log(`\n📊 Total: ${tables[0].length} tables`);
    
    await sequelize.close();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

main();
