import { sequelize } from "./models/index.js";

const run = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected');
    
    const result = await sequelize.query(`
      SELECT name FROM sysobjects 
      WHERE xtype='U' AND name IN (
        'goods_movement_items', 'service_invoices', 'service_invoice_items', 
        'cartons', 'stock_movement', 'calls', 'users', 'technicians', 'customers'
      )
      ORDER BY name
    `);
    
    console.log('\n📊 Existing Tables:');
    result[0].forEach(r => console.log(`  ✅ ${r.name}`));
    
    // Check for failed tables
    const failedTables = [
      'goods_movement_items', 'service_invoices', 'service_invoice_items'
    ];
    
    const existing = result[0].map(r => r.name);
    const missing = failedTables.filter(t => !existing.includes(t));
    
    if (missing.length > 0) {
      console.log('\n❌ Still missing:', missing);
    } else {
      console.log('\n✅ All previously failing tables now exist!');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
};

run();
