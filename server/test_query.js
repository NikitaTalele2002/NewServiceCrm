import { sequelize } from './db.js';

async function test() {
  try {
    // Now try the query with correct join on Sku = PART
    const [results] = await sequelize.query(`
      SELECT sci.Sku as sku, sp.DESCRIPTION as spareName, (COALESCE(sci.GoodQty, 0) + COALESCE(sci.DefectiveQty, 0)) as remainingQty
      FROM ServiceCenterInventory sci
      INNER JOIN SpareParts sp ON sci.Sku = sp.PART
      WHERE sp.ModelID = 178 AND sci.ServiceCenterId = 2 AND (COALESCE(sci.GoodQty, 0) + COALESCE(sci.DefectiveQty, 0) > 0)
    `);
    console.log('Results:', results);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    sequelize.close();
  }
}

test();