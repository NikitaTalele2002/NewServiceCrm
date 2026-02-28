/**
 * Safe transaction helper to prevent "no corresponding BEGIN TRANSACTION" errors
 * Handles transaction state checking before commit/rollback
 */

/**
 * Safely rollback a transaction
 * @param {Sequelize.Transaction} transaction - The transaction object
 * @param {Error} error - Optional error for logging
 * @returns {Promise<void>}
 */
export async function safeRollback(transaction, error = null) {
  try {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
      if (error) {
        console.error('Transaction rolled back due to error:', error.message);
      }
    }
  } catch (rollbackError) {
    console.error('Error during transaction rollback:', rollbackError.message);
  }
}

/**
 * Safely commit a transaction
 * @param {Sequelize.Transaction} transaction - The transaction object
 * @returns {Promise<void>}
 */
export async function safeCommit(transaction) {
  try {
    if (transaction && !transaction.finished) {
      await transaction.commit();
    }
  } catch (commitError) {
    console.error('Error during transaction commit:', commitError.message);
    // Try to rollback if commit failed
    try {
      if (transaction && !transaction.finished) {
        await transaction.rollback();
      }
    } catch (rollbackError) {
      console.error('Error during rollback after failed commit:', rollbackError.message);
    }
    throw commitError;
  }
}

/**
 * Check if a transaction is still active
 * @param {Sequelize.Transaction} transaction - The transaction object
 * @returns {boolean}
 */
export function isTransactionActive(transaction) {
  return transaction && !transaction.finished;
}
