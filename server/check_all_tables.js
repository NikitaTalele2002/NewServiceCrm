import { sequelize } from './db.js';

const checkTables = async () => {
  try {
    await sequelize.authenticate();
    console.log('Connected to database\n');

    const expectedTables = [
      'Roles', 'Zones', 'Plant', 'DefectMaster', 'ProductGroup', 'SubStatus',
      'Users', 'Technicians', 'ServiceCenter', 'ActionLog', 'EntityChangeRequests',
      'Approvals', 'Ledger', 'Reimbursement', 'LogisticsDocuments', 'SAPDocuments',
      'Status', 'StockMovement', 'States', 'Cities', 'Pincodes', 'ProductMaster',
      'ReportingAuthority', 'RSM', 'ProductModels', 'RSMStateMapping',
      'ServiceCenterPincodes', 'SpareParts', 'Customers', 'CustomersProducts',
      'Calls', 'HappyCodes', 'TATTracking', 'TATHolds', 'CallTechnicianAssignment',
      'CallCancellationRequests', 'CallSpareUsage', 'Attachments', 'AttachmentAccess',
      'ServiceInvoices', 'ServiceInvoiceItems', 'Replacements', 'ServiceCenterFinancials',
      'SpareInventories', 'SpareRequests', 'SpareRequestItems', 'ModelDefects',
      'DefectSpares', 'Cartons', 'GoodsMovementItems', 'LogisticsDocumentItems',
      'SAPDocumentItems', 'AccessControls', 'Dealers'
    ];

    // Get all tables in database
    const [result] = await sequelize.query(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'dbo' AND TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `);

    const existingTables = result.map(r => r.TABLE_NAME);
    
    console.log('Existing tables in database:');
    existingTables.forEach(t => console.log(`  ✅ ${t}`));
    
    console.log('\n\nMissing tables:');
    const missingTables = expectedTables.filter(t => !existingTables.includes(t));
    if (missingTables.length === 0) {
      console.log('  (none - all tables exist!)');
    } else {
      missingTables.forEach(t => console.log(`  ⚠️ ${t}`));
    }
    
    console.log('\n\nExtra tables (not in expected list):');
    const extraTables = existingTables.filter(t => !expectedTables.includes(t));
    if (extraTables.length === 0) {
      console.log('  (none)');
    } else {
      extraTables.forEach(t => console.log(`  ${t}`));
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
};

checkTables();
