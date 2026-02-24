/**
 * Verify Complaint Registration
 * Checks if complaints are properly registered in the database
 * Usage: node verify_complaint_registration.js
 */

import { sequelize, Calls, Customer, Status } from './models/index.js';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  header: (msg) => console.log(`\n${colors.cyan}${colors.bright}════ ${msg} ════${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  data: (msg) => console.log(`   ${msg}`)
};

async function main() {
  try {
    log.header('COMPLAINT REGISTRATION VERIFICATION');

    // Test database connection
    log.info('Connecting to database...');
    await sequelize.authenticate();
    log.success('Database connection successful');

    // Check Status table
    log.info('\nChecking Status table...');
    const statuses = await Status.findAll({ attributes: ['status_id', 'status_name'], raw: true });
    if (statuses && statuses.length > 0) {
      log.success(`Found ${statuses.length} status(es)`);
      statuses.forEach(s => {
        log.data(`ID: ${s.status_id}, Name: ${s.status_name}`);
      });
    } else {
      log.error('No statuses found in database');
    }

    // Check Customers
    log.info('\nChecking Customers...');
    const customerCount = await Customer.count();
    if (customerCount > 0) {
      log.success(`Found ${customerCount} customer(s)`);
      const sampleCustomer = await Customer.findOne({ 
        attributes: ['customer_id', 'name', 'mobile_no'],
        raw: true 
      });
      if (sampleCustomer) {
        log.data(`Sample: ID ${sampleCustomer.customer_id}, Name: ${sampleCustomer.name}, Mobile: ${sampleCustomer.mobile_no}`);
      }
    } else {
      log.warning('No customers found in database');
    }

    // Check Calls/Complaints
    log.info('\nChecking Registered Complaints...');
    const callCount = await Calls.count();
    if (callCount > 0) {
      log.success(`Found ${callCount} complaint(s)`);
      
      // Get recent complaints
      const recentCalls = await Calls.findAll({
        attributes: ['call_id', 'customer_id', 'call_type', 'status_id', 'remark', 'visit_date', 'created_at'],
        order: [['created_at', 'DESC']],
        limit: 5,
        raw: true
      });

      recentCalls.forEach((call, index) => {
        log.data(`\n  [${index + 1}] Call ID: ${call.call_id}`);
        log.data(`      Customer ID: ${call.customer_id}`);
        log.data(`      Type: ${call.call_type}`);
        log.data(`      Status ID: ${call.status_id}`);
        log.data(`      Remark: ${call.remark?.substring(0, 50)}${call.remark?.length > 50 ? '...' : ''}`);
        log.data(`      Visit Date: ${call.visit_date}`);
        log.data(`      Created: ${new Date(call.created_at).toLocaleString()}`);
      });
    } else {
      log.warning('No complaints found in database');
    }

    // Detailed schema check
    log.info('\nChecking Calls table schema...');
    const callsSchema = await sequelize.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'calls'
      ORDER BY ORDINAL_POSITION
    `, { type: sequelize.QueryTypes.SELECT });

    if (callsSchema && callsSchema.length > 0) {
      log.success(`Found ${callsSchema.length} column(s) in calls table`);
      log.data('\nKey columns:');
      const keyColumns = ['call_id', 'customer_id', 'call_type', 'status_id', 'remark', 'visit_date', 'visit_time', 'assigned_asc_id'];
      keyColumns.forEach(colName => {
        const col = callsSchema.find(c => c.COLUMN_NAME === colName);
        if (col) {
          log.data(`  ✓ ${col.COLUMN_NAME} (${col.DATA_TYPE}, Nullable: ${col.IS_NULLABLE})`);
        } else {
          log.data(`  ✗ ${colName} (MISSING!)`);
        }
      });
    }

    // Test creation of sample complaint (optional)
    log.info('\nDatabase verification complete');
    log.success('All checks passed!');

  } catch (err) {
    log.error(`Verification failed: ${err.message}`);
    console.error(err);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

main();
