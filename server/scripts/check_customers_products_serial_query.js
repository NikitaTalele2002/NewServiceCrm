import { CustomersProducts } from '../models/index.js';

const serialNo = process.argv[2] || '213';

async function run() {
  try {
    console.log(`Checking customers_products query behavior for serial_no='${serialNo}'`);

    // 1) Reproduce current ORM behavior (this may fail if model != DB schema)
    try {
      const ormRow = await CustomersProducts.findOne({ where: { serial_no: serialNo } });
      console.log('ORM findOne status: OK');
      console.log('ORM row exists:', !!ormRow);
    } catch (err) {
      console.log('ORM findOne status: FAILED');
      console.log('ORM error:', err.message);
      console.log('ORM sql:', err.sql || null);
    }

    // 2) Safe raw SQL check (schema-tolerant)
    const cols = await CustomersProducts.sequelize.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'customers_products'`,
      { type: CustomersProducts.sequelize.QueryTypes.SELECT }
    );

    const existingCols = new Set((cols || []).map((c) => String(c.COLUMN_NAME).toLowerCase()));
    const preferred = ['customers_products_id', 'customer_id', 'product_id', 'model_id', 'serial_no', 'purchase_date', 'status', 'created_at', 'updated_at'];
    const selectCols = preferred.filter((col) => existingCols.has(col)).map((col) => `[${col}]`).join(', ');

    const rawRow = await CustomersProducts.sequelize.query(
      `SELECT TOP 1 ${selectCols}
       FROM [customers_products]
       WHERE [serial_no] = :serialNo
       ORDER BY [customers_products_id] DESC`,
      {
        replacements: { serialNo },
        type: CustomersProducts.sequelize.QueryTypes.SELECT,
      }
    );

    console.log('Raw SQL status: OK');
    console.log('Raw row exists:', Array.isArray(rawRow) && rawRow.length > 0);
    if (Array.isArray(rawRow) && rawRow.length > 0) {
      console.log('Raw row sample:', rawRow[0]);
    }

    process.exit(0);
  } catch (err) {
    console.error('Diagnostic failed:', err.message);
    process.exit(1);
  }
}

run();
