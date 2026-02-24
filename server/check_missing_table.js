import { Sequelize } from 'sequelize';

const sequelize = new Sequelize('NewCRM', 'crm_user', 'StrongPassword123!', {
  host: 'localhost\\SQLEXPRESS',
  dialect: 'mssql',
  dialectOptions: {
    authentication: { type: 'default' },
  },
  trustedConnection: false,
  pool: { max: 5, min: 0 },
});

try {
  await sequelize.authenticate();
  
  const tables = await sequelize.query(
    "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE' AND TABLE_SCHEMA='dbo' ORDER BY TABLE_NAME",
    { type: sequelize.QueryTypes.SELECT }
  );

  const tableNames = tables.map(t => t.TABLE_NAME).sort();
  
  const expected = [
    'access_controls', 'action_logs', 'approvals', 'attachments', 'attachment_access',
    'call_cancellation_requests', 'call_spare_usage', 'call_technician_assignments', 'calls', 'cartons',
    'cities', 'customers_products', 'customers', 'defect_masters', 'defect_spares',
    'dealers', 'entity_change_requests', 'goods_movement_items', 'happy_codes', 'ledgers',
    'logistics_document_items', 'logistics_documents', 'model_defects', 'plants', 'pincodes',
    'product_groups', 'product_masters', 'product_models', 'reimbursements', 'reporting_authorities',
    'replacements', 'rsms', 'rsm_state_mappings', 'roles', 'sap_document_items',
    'sap_documents', 'service_center_financial', 'service_center_pincodes', 'service_centers', 'service_invoice_items',
    'service_invoices', 'spare_parts', 'spare_inventories', 'spare_requests', 'spare_request_items',
    'states', 'status', 'stock_movements', 'sub_status', 'tat_holds',
    'tat_trackings', 'users', 'zones'
  ].sort();

  console.log(`\nTotal tables in DB: ${tableNames.length}`);
  console.log(`Expected tables: ${expected.length}\n`);

  const missing = expected.filter(e => !tableNames.includes(e));
  const extra = tableNames.filter(t => !expected.includes(t));

  if (missing.length > 0) {
    console.log('❌ Missing tables:', missing);
  } else {
    console.log('✅ All expected tables found!');
  }

  if (extra.length > 0) {
    console.log('\n⚠️  Extra tables:', extra);
  }

  console.log('\nAll tables:', tableNames);
  
  process.exit(0);
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}
