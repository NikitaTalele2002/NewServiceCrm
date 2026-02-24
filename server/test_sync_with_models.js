import { sequelize } from './db.js';

const main = async () => {
  try {
    console.log('Testing sync with loaded models...\n');
    await sequelize.authenticate();
    console.log('✅ Connected\n');

    // Load models first
    console.log('Loading models...');
    await import('./models/index.js');
    console.log('✅ Models loaded\n');

    // Try a simple sync without force or alter
    console.log('Attempting to sync with force: false, alter: false...');
    await sequelize.sync({ force: false, alter: false });
    console.log('✅ Sync successful');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:');
    console.error('Type:', err.name);
    console.error('Message:', err.message);
    console.error('SQL:', err.sql || 'N/A');
    if (err.original) {
      console.error('Original message:', err.original.message);
      console.error('Line:', err.original.lineNumber);
    }
    process.exit(1);
  }
};

main();
