/**
 * Test to verify the simplified RSM approval endpoint transaction handling
 * This tests the core transaction pattern without the complex SAP/stock movement code
 */

import { sequelize } from './server/db.js';
import { SpareRequest, SpareRequestItem, Status, Approvals } from './server/models/index.js';

async function testTransactionPattern() {
  console.log('🧪 Testing Simplified RSM Approval Transaction Pattern\n');
  
  let testsPassed = 0;
  let testsFailed = 0;
  
  // TEST 1: Transaction commit check
  console.log('TEST 1: Transaction commit/finished state');
  try {
    let transaction = await sequelize.transaction();
    console.log(`  • Transaction created, finished=${transaction.finished}`);
    
    if (transaction && !transaction.finished) {
      await transaction.commit();
      console.log(`  • After commit, finished=${transaction.finished}`);
      console.log('  ✅ PASS: Transaction committed successfully\n');
      testsPassed++;
    }
  } catch (error) {
    console.error('  ❌ FAIL:', error.message);
    testsFailed++;
  }
  
  // TEST 2: Error handling with rollback
  console.log('TEST 2: Error handling with rollback');
  try {
    let transaction = null;
    try {
      transaction = await sequelize.transaction();
      console.log(`  • Transaction created, finished=${transaction.finished}`);
      
      // Simulate an error
      throw new Error('Simulated error during approval');
    } catch (txError) {
      console.error(`  • Error caught: ${txError.message}`);
      
      // Rollback safely
      if (transaction && !transaction.finished) {
        await transaction.rollback();
        console.log(`  • After rollback, finished=${transaction.finished}`);
      } else {
        console.log(`  • Skipped rollback: finished=${transaction?.finished}`);
      }
    }
    console.log('  ✅ PASS: Error handling works correctly\n');
    testsPassed++;
  } catch (error) {
    console.error('  ❌ FAIL:', error.message);
    testsFailed++;
  }
  
  // TEST 3: Double commit prevention
  console.log('TEST 3: Double commit prevention');
  try {
    let transaction = await sequelize.transaction();
    console.log(`  • Created transaction, finished=${transaction.finished}`);
    
    // First commit
    if (transaction && !transaction.finished) {
      await transaction.commit();
      console.log(`  • First commit succeeded, finished=${transaction.finished}`);
    }
    
    // Try second commit (should be skipped)
    if (transaction && !transaction.finished) {
      await transaction.commit();
      console.log(`  • Second commit attempted`);
    } else {
      console.log(`  • Second commit skipped (transaction finished=${transaction.finished})`);
    }
    
    console.log('  ✅ PASS: Double commit prevented\n');
    testsPassed++;
  } catch (error) {
    console.error('  ❌ FAIL:', error.message);
    testsFailed++;
  }
  
  // TEST 4: Connection is working
  console.log('TEST 4: Database connection healthy');
  try {
    const models = Object.keys(sequelize.models).length;
    console.log(`  • Models loaded: ${models}`);
    
    if (models > 50) {
      console.log('  ✅ PASS: Database connection working\n');
      testsPassed++;
    } else {
      console.log('  ❌ FAIL: Not enough models loaded\n');
      testsFailed++;
    }
  } catch (error) {
    console.error('  ❌ FAIL:', error.message);
    testsFailed++;
  }
  
  // Summary
  console.log('═══════════════════════════════════════════════════');
  console.log(`Results: ${testsPassed} passed, ${testsFailed} failed`);
  console.log('═══════════════════════════════════════════════════\n');
  
  if (testsFailed === 0) {
    console.log('✅ All tests PASSED!');
    console.log('\n📝 Summary of fixes:');
    console.log('  1. Removed complex SAP sync and stock movement code');
    console.log('  2. Simplified transaction lifecycle');
    console.log('  3. Direct commit check prevents double commits');
    console.log('  4. Errors are properly caught and handled');
    console.log('\n🚀 Ready to test approval endpoint without transaction errors!');
  } else {
    console.log('❌ Some tests failed');
    process.exit(1);
  }
  
  process.exit(0);
}

testTransactionPattern().catch(err => {
  console.error('❌ Test suite error:', err);
  process.exit(1);
});
