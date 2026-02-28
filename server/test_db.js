import 'dotenv/config.js';
import { sequelize, connectDB } from './db.js';

await connectDB();

try {
  // Check if technician_spare_returns table exists
  const [result] = await sequelize.query(`
    SELECT COUNT(*) as cnt 
    FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_NAME='technician_spare_returns'
  `);
  
  console.log('technician_spare_returns table exists:', result[0].cnt > 0);

  if (result[0].cnt > 0) {
    // Get columns
    const columns = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME='technician_spare_returns'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('Columns:', columns[0].map(c => c.COLUMN_NAME).join(', '));
    
    // Get sample data
    const sample = await sequelize.query('SELECT TOP 1 * FROM technician_spare_returns');
    console.log('Sample row exists:', sample[0]?.length > 0);
  }
} catch (err) {
  console.error('Error:', err.message);
}

await sequelize.close();
process.exit(0);
