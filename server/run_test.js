#!/usr/bin/env node
/**
 * Simple test runner - forces fresh import
 */
import('./test_complete_spare_workflow.js').then(() => {
  process.exit(0);
}).catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
