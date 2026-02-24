import { sequelize } from './db.js';

async function main() {
  try {
    await sequelize.authenticate();
    
    // Check all columns in existing service_invoice tables
    const invoiceCols = await sequelize.query(`
      SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME IN ('service_invoice', 'service_invoice_item')
      ORDER BY TABLE_NAME, ORDINAL_POSITION
    `, { raw: true });
    
    console.log('\n═══ service_invoice COLUMNS ═══');
    invoiceCols[0]
      .filter(c => c.TABLE_NAME === 'service_invoice')
      .forEach(c => console.log(`  ${c.COLUMN_NAME}: ${c.DATA_TYPE}`));
      
    console.log('\n═══ service_invoice_item COLUMNS ═══');
    invoiceCols[0]
      .filter(c => c.TABLE_NAME === 'service_invoice_item')
      .forEach(c => console.log(`  ${c.COLUMN_NAME}: ${c.DATA_TYPE}`));

    // Try to check the ServiceInvoice model definition
    console.log('\n\n═══ CHECKING ServiceInvoice MODEL ═══');
    const model = sequelize.models['ServiceInvoice'];
    if (model) {
      console.log('Model found:');
      console.log('Attributes:',Object.keys(model.rawAttributes).length);
      Object.entries(model.rawAttributes).forEach(([key, attr]) => {
        console.log(`  ${key}: ${attr.type.toString().substring(0, 30)}`);
      });
    } else {
      console.log('❌ ServiceInvoice model NOT found');
    }

    await sequelize.close();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

main();
