import { sequelize } from './db.js';
import { Calls, SpareRequest, SpareRequestItem } from './models/index.js';

async function testSync() {
  try {
    console.log('\n=== TESTING INDIVIDUAL TABLE CREATION WITH SQL LOGGING ===\n');
    
    // Enable SQL logging for this test
    sequelize.options.logging = (msg) => {
      console.log('[SQL]', msg);
    };
    
    console.log('\n--- Testing Calls Table ---');
    try {
      const result = await Calls.sync({ force: false, alter: false });
      console.log('✓ Calls synced successfully');
    } catch (error) {
      console.error('✗ Calls sync failed');
      console.error('  Error Message:', error.message);
      console.error('  Error Code:', error.code);
      console.error('  Error Errno:', error.errno);
      console.error('  Original Error:', error.original);
      if (error.original) {
        console.error('  Original Message:', error.original.message);
        console.error('  Original Code:', error.original.code);
      }
    }
    
    console.log('\n--- Testing SpareRequest Table ---');
    try {
      const result = await SpareRequest.sync({ force: false, alter: false });
      console.log('✓ SpareRequest synced successfully');
    } catch (error) {
      console.error('✗ SpareRequest sync failed');
      console.error('  Error Message:', error.message);
      console.error('  Error Code:', error.code);
      console.error('  Error Errno:', error.errno);
      if (error.original) {
        console.error('  Original Message:', error.original.message);
        console.error('  Original Code:', error.original.code);
      }
    }
    
    console.log('\n--- Testing SpareRequestItem Table ---');
    try {
      const result = await SpareRequestItem.sync({ force: false, alter: false });
      console.log('✓ SpareRequestItem synced successfully');
    } catch (error) {
      console.error('✗ SpareRequestItem sync failed');
      console.error('  Error Message:', error.message);
      console.error('  Error Code:', error.code);
      console.error('  Error Errno:', error.errno);
      if (error.original) {
        console.error('  Original Message:', error.original.message);
        console.error('  Original Code:', error.original.code);
      }
    }
    
  } catch (error) {
    console.error('Setup error:', error.message);
  } finally {
    await sequelize.close();
  }
}

testSync();
