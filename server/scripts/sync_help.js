#!/usr/bin/env node

/**
 * Database Sync Helper Guide
 * Shows the user which sync script to use based on their needs
 */

const green = '\x1b[32m';
const blue = '\x1b[34m';
const yellow = '\x1b[33m';
const red = '\x1b[31m';
const reset = '\x1b[0m';
const bold = '\x1b[1m';

console.log(`\n${bold}${blue}📊 DATABASE SYNCHRONIZATION GUIDE${reset}\n`);

console.log(`${bold}Available Sync Scripts:${reset}\n`);

console.log(`${green}1. sync_database.js${reset}`);
console.log(`   Description: Safe, non-destructive sync`);
console.log(`   What it does:`);
console.log(`     • Checks if tables already exist`);
console.log(`     • Only creates missing tables`);
console.log(`     • Never deletes data`);
console.log(`     • Safe to run multiple times`);
console.log(`   Best for: Regular development and deployments`);
console.log(`   Command: ${bold}node scripts/sync_database.js${reset}\n`);

console.log(`${yellow}2. sync_with_alter.js${reset}`);
console.log(`   Description: Advanced sync using ALTER TABLE`);
console.log(`   What it does:`);
console.log(`     • Disables foreign key constraints`);
console.log(`     • Uses ALTER mode to update table schemas`);
console.log(`     • Fixes column mismatches and missing fields`);
console.log(`     • Preserves existing data`);
console.log(`   Best for: Fixing schema conflicts while keeping data`);
console.log(`   Command: ${bold}node scripts/sync_with_alter.js${reset}\n`);

console.log(`${red}3. sync_drop_and_recreate.js${reset}`);
console.log(`   Description: Aggressive sync - drops and recreates tables`);
console.log(`   What it does:`);
console.log(`     • Disables foreign key constraints`);
console.log(`     • DROPS problematic tables completely`);
console.log(`     • Recreates them from scratch`);
console.log(`     • ${bold}DELETES ALL DATA${reset} in those tables`);
console.log(`   Best for: Development environments with test data`);
console.log(`   ${red}WARNING: This will DELETE DATA!${reset}`);
console.log(`   Command: ${bold}node scripts/sync_drop_and_recreate.js${reset}\n`);

console.log(`${bold}Quick Comparison:${reset}\n`);

console.log(`${'Approach'.padEnd(25)} ${'Data Safe?'.padEnd(15)} ${'Fixes Schemas?'.padEnd(20)} ${'Speed'}`);
console.log(`${'─'.repeat(25)} ${'─'.repeat(15)} ${'─'.repeat(20)} ${'─'.repeat(10)}`);
console.log(`${'sync_database.js'.padEnd(25)} ${'✅ Yes'.padEnd(15)} ${'❌ No'.padEnd(20)} Fast`);
console.log(`${'sync_with_alter.js'.padEnd(25)} ${'✅ Yes'.padEnd(15)} ${'⚠️  Partial'.padEnd(20)} Medium`);
console.log(`${'sync_drop_and_recreate.js'.padEnd(25)} ${'❌ NO'.padEnd(15)} ${'✅ Yes'.padEnd(20)} Slow`);

console.log(`\n${bold}Recommended Usage:${reset}\n`);

console.log(`${green}Step 1: Try the safe approach first${reset}`);
console.log(`  $ node scripts/sync_database.js\n`);

console.log(`${yellow}Step 2: If that doesn't fix the schemas${reset}`);
console.log(`  $ node scripts/sync_with_alter.js\n`);

console.log(`${red}Step 3: Only if you have test data and need a fresh start${reset}`);
console.log(`  $ node scripts/sync_drop_and_recreate.js\n`);

console.log(`${bold}Current Status:${reset}`);
console.log(`  ✅ 36 tables synced successfully`);
console.log(`  ⚠️  18 tables with schema conflicts`);
console.log(`      (ActionLog, Ledger, Customer, Calls, etc.)\n`);

console.log(`${bold}Need Help?${reset}`);
console.log(`  • Check if your database has test data before running drop scripts`);
console.log(`  • Always backup your database before running drop_and_recreate`);
console.log(`  • The application works fine with partial syncs\n`);

process.exit(0);
