import { poolPromise } from '../db.js';

/**
 * Idempotent script to update foreign key constraints that reference the
 * legacy `products` table so they instead reference `ProductMaster(ID)`.
 *
 * Usage: `node server/scripts/update_product_fks.js`
 */
async function run() {
  try {
    const pool = await poolPromise;

    // Drop any FK on customers_products that references the legacy products table
    const dropCustomersProductsFk = `
DECLARE @fk nvarchar(128);
SELECT @fk = fk.name
FROM sys.foreign_keys fk
JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
JOIN sys.tables t ON fk.referenced_object_id = t.object_id
WHERE t.name = 'products' AND fk.parent_object_id = OBJECT_ID('customers_products');
IF @fk IS NOT NULL
  EXEC('ALTER TABLE customers_products DROP CONSTRAINT [' + @fk + ']');
`;

    // Add FK customers_products.product_id -> ProductMaster(ID)
    const addCustomersProductsFk = `
IF NOT EXISTS (
  SELECT 1 FROM sys.foreign_keys fk
  WHERE fk.parent_object_id = OBJECT_ID('customers_products')
    AND fk.referenced_object_id = OBJECT_ID('ProductMaster')
)
BEGIN
  ALTER TABLE customers_products
    ADD CONSTRAINT FK_customers_products_productmaster_product_id
      FOREIGN KEY (product_id) REFERENCES ProductMaster(ID)
      ON DELETE CASCADE ON UPDATE CASCADE;
END
`;

    // Drop any FK on ProductModels that references the legacy products table
    const dropProductModelsFk = `
DECLARE @fk2 nvarchar(128);
SELECT @fk2 = fk.name
FROM sys.foreign_keys fk
JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
JOIN sys.tables t ON fk.referenced_object_id = t.object_id
WHERE t.name = 'products' AND fk.parent_object_id = OBJECT_ID('ProductModels');
IF @fk2 IS NOT NULL
  EXEC('ALTER TABLE ProductModels DROP CONSTRAINT [' + @fk2 + ']');
`;

    // Add FK ProductModels.Product -> ProductMaster(ID)
    const addProductModelsFk = `
IF NOT EXISTS (
  SELECT 1 FROM sys.foreign_keys fk
  WHERE fk.parent_object_id = OBJECT_ID('ProductModels')
    AND fk.referenced_object_id = OBJECT_ID('ProductMaster')
)
BEGIN
  ALTER TABLE ProductModels
    ADD CONSTRAINT FK_ProductModels_ProductMaster_Product
      FOREIGN KEY (Product) REFERENCES ProductMaster(ID)
      ON DELETE SET NULL ON UPDATE CASCADE;
END
`;

    console.log('Dropping legacy FKs (if any)...');
    await pool.request().batch(dropCustomersProductsFk);
    await pool.request().batch(dropProductModelsFk);

    console.log('Adding new FKs to ProductMaster (if missing)...');
    await pool.request().batch(addCustomersProductsFk);
    await pool.request().batch(addProductModelsFk);

    console.log('FK update complete.');
    process.exit(0);
  } catch (err) {
    console.error('Error updating product FKs:', err && err.message ? err.message : err);
    process.exit(1);
  }
}

run();
