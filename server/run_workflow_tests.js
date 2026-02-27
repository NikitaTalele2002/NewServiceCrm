#!/usr/bin/env node
/**
 * WORKFLOW TESTER - Runs Parts 1 & 2 sequentially
 */

import { execSync } from 'child_process';
import path from 'path';

const tests = [
  { name: 'Part 1: Tech Requests Spare (ASC Approval & Stock Movement)', file: 'part1_tech_request_spare.js' },
  { name: 'Part 2: Tech Uses & Returns Spare', file: 'part2_tech_uses_return_spare.js' }
];

async function runTests() {
  console.log('\n' + '='.repeat(80));
  console.log('SPARE PARTS WORKFLOW - BREAKING DOWN THE TEST');
  console.log('='.repeat(80));

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    console.log(`\n\n${'#'.repeat(80)}`);
    console.log(`RUNNING: ${test.name}`);
    console.log('#'.repeat(80));

    try {
      const output = execSync(`node ${test.file}`, {
        cwd: 'c:\\Crm_dashboard\\server',
        encoding: 'utf-8',
        stdio: 'pipe'
      });

      console.log(output);
      passed++;
    } catch (error) {
      console.error(`\n❌ TEST FAILED: ${test.name}`);
      console.error(error.stdout || error.message);
      failed++;
    }
  }

  // Summary
  console.log('\n\n' + '='.repeat(80));
  console.log('TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`✅ Passed: ${passed}/${tests.length}`);
  console.log(`❌ Failed: ${failed}/${tests.length}`);
  console.log('='.repeat(80) + '\n');

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Test runner error:', err.message);
  process.exit(1);
});
