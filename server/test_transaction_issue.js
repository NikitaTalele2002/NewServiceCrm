/**
 * Test file to diagnose the transaction error
 * This will help identify where the transaction commit/rollback issue occurs
 */

import { sequelize } from './db.js';
import { safeRollback, safeCommit } from './utils/transactionHelper.js';

async function testTransactionBehavior() {
  console.log('========================================');
  console.log('TRANSACTION BEHAVIOR TEST');
  console.log('========================================\n');

  // Test 1: Double rollback issue
  console.log('TEST 1: Double rollback scenario (the current problem)');
  console.log('-------');
  
  let transaction1;
  try {
    transaction1 = await sequelize.transaction();
    console.log('✓ Transaction created');
    
    // Simulate validation failure with manual rollback
    const validationFailed = true;
    if (validationFailed) {
      console.log('⚠ Validation check failed, rolling back...');
      await transaction1.rollback();  // Direct rollback
      console.log('✓ Manual rollback done');
      console.log(`  Transaction.finished: ${transaction1.finished}`);
      
      // Now simulate another error occurring BEFORE catch block
      throw new Error('Some error after rollback');
    }
  } catch (err) {
    console.log(`❌ Error caught: ${err.message}`);
    console.log(`  Transaction.finished: ${transaction1?.finished}`);
    try {
      if (transaction1 && !transaction1.finished) {
        await transaction1.rollback();
        console.log('✓ Safe rollback succeeded');
      } else {
        console.log('⚠ Transaction already finished, skipping rollback');
      }
    } catch (rollbackErr) {
      console.log(`❌ Rollback failed: ${rollbackErr.message}`);
    }
  }

  console.log('\n');

  // Test 2: Correct pattern - use safeRollback
  console.log('TEST 2: Correct pattern using safeRollback');
  console.log('-------');
  
  let transaction2;
  try {
    transaction2 = await sequelize.transaction();
    console.log('✓ Transaction created');
    
    const validationFailed = true;
    if (validationFailed) {
      console.log('⚠ Validation check failed, rolling back...');
      await safeRollback(transaction2);
      console.log('✓ Safe rollback done');
      console.log(`  Transaction.finished: ${transaction2.finished}`);
      return res.status(400).json({ error: 'Validation failed' });
    }
  } catch (err) {
    console.log(`❌ Error caught: ${err.message}`);
    await safeRollback(transaction2, err);
    console.log('✓ Catch block rollback succeeded');
  }

  console.log('\n');

  // Test 3: BEST PATTERN - Validate BEFORE transaction
  console.log('TEST 3: BEST PATTERN - Validate before creating transaction');
  console.log('-------');
  
  // Validate inputs FIRST
  const request = null; // Simulating not found
  if (!request) {
    console.log('⚠ Validation failed: request not found');
    console.log('✓ No transaction created yet, so no cleanup needed');
    return;
  }
  
  let transaction3;
  try {
    transaction3 = await sequelize.transaction();
    console.log('✓ Transaction created AFTER validation passed');
    
    // Do work
    console.log('✓ Doing work with transaction...');
    
    await safeCommit(transaction3);
    console.log('✓ Transaction committed successfully');
  } catch (err) {
    console.log(`❌ Error during work: ${err.message}`);
    await safeRollback(transaction3, err);
  }

  console.log('\n========================================');
  console.log('DIAGNOSIS COMPLETE');
  console.log('========================================');
  console.log('\nFINDINGS:');
  console.log('- The current code creates transaction BEFORE validation');
  console.log('- Multiple validation failures call transaction.rollback() directly');
  console.log('- This marks transaction as finished, causing issues');
  console.log('- If any error occurs after these rollbacks, the catch block');
  console.log('  tries to rollback an already-finished transaction');
  console.log('\nSOLUTION:');
  console.log('- Move ALL validations BEFORE transaction creation');
  console.log('- Only create transaction after all validations pass');
  console.log('- Use safeRollback/safeCommit for all transaction operations');
  
  await sequelize.close();
  process.exit(0);
}

testTransactionBehavior().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
