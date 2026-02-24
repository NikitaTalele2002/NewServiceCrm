import { sequelize } from './db.js';
import * as modelsModule from './models/index.js';

async function testFailingModels() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database\n');

    const failingModels = ['Calls', 'SpareRequest', 'SpareRequestItem'];

    for (const modelName of failingModels) {
      const model = sequelize.models[modelName];
      if (!model) {
        console.log(`❌ ${modelName} - Model not found in sequelize.models`);
        continue;
      }

      try {
        console.log(`\n🔍 Testing ${modelName}...`);
        await model.sync({ force: false, alter: false });
        console.log(`✅ ${modelName} - SYNCED SUCCESSFULLY!`);
      } catch (err) {
        console.log(`\n❌ ${modelName} FAILED:`);
        console.log(`   Error Message: ${err.message}`);
        console.log(`   Original Error: ${err.original?.message || 'N/A'}`);
        console.log(`   Stack: ${err.stack?.substring(0, 200)}`);
      }
    }

  } catch (error) {
    console.error('Fatal error:', error.message);
  } finally {
    await sequelize.close();
  }
}

testFailingModels();
