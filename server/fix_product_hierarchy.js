/**
 * Migration script to fix ProductGroup → ProductMaster → ProductModel → SparePart hierarchy
 * This script corrects foreign key values to ensure proper data relationships
 */

import { poolPromise } from './db.js';
import sql from 'mssql';

async function fixProductHierarchy() {
  const pool = await poolPromise;
  
  try {
    console.log('🔧 Starting ProductGroup → ProductMaster → ProductModel → SparePart hierarchy fix...\n');

    // Step 1: List current ProductGroups
    console.log('📋 Step 1: Fetching ProductGroups...');
    const pgResult = await pool.request().query('SELECT Id, VALUE, DESCRIPTION FROM ProductGroups ORDER BY Id');
    console.log(`Found ${pgResult.recordset.length} ProductGroup(s):`);
    pgResult.recordset.forEach(pg => {
      console.log(`  - Id: ${pg.Id}, VALUE: ${pg.VALUE}, DESCRIPTION: ${pg.DESCRIPTION}`);
    });

    // Step 2: List current ProductMasters and fix ProductGroupID
    console.log('\n📋 Step 2: Fetching ProductMaster records...');
    const pmResult = await pool.request().query(`
      SELECT ID, VALUE, DESCRIPTION, Product_group_ID 
      FROM ProductMaster 
      ORDER BY ID
    `);
    console.log(`Found ${pmResult.recordset.length} ProductMaster record(s):`);
    pmResult.recordset.forEach(pm => {
      console.log(`  - ID: ${pm.ID}, VALUE: ${pm.VALUE}, GroupID: ${pm.Product_group_ID}`);
    });

    // Step 3: List current ProductModels and their foreign keys
    console.log('\n📋 Step 3: Fetching ProductModel records...');
    const prodModResult = await pool.request().query(`
      SELECT Id, MODEL_CODE, MODEL_DESCRIPTION, ProductID 
      FROM ProductModels 
      ORDER BY Id
    `);
    console.log(`Found ${prodModResult.recordset.length} ProductModel record(s):`);
    prodModResult.recordset.forEach(pm => {
      console.log(`  - Id: ${pm.Id}, MODEL_CODE: ${pm.MODEL_CODE}, ProductID: ${pm.ProductID}`);
    });

    // Step 4: List current SpareParts and their foreign keys
    console.log('\n📋 Step 4: Fetching SparePart records...');
    const spResult = await pool.request().query(`
      SELECT Id, PART, ModelID, ProductModelId 
      FROM spare_parts 
      ORDER BY Id
    `);
    console.log(`Found ${spResult.recordset.length} SparePart record(s):`);
    spResult.recordset.forEach(sp => {
      console.log(`  - Id: ${sp.Id}, PART: ${sp.PART}, ModelID: ${sp.ModelID}, ProductModelId: ${sp.ProductModelId}`);
    });

    // Step 5: Fix relationships
    console.log('\n🔨 Step 5: Fixing relationships...');

    // Ensure ProductMaster records have valid ProductGroupID
    for (const pm of pmResult.recordset) {
      if (!pm.Product_group_ID || pm.Product_group_ID === null) {
        // Assign to first ProductGroup (usually ID=1)
        const defaultGroupId = pgResult.recordset.length > 0 ? pgResult.recordset[0].Id : 1;
        console.log(`  ⚠️  ProductMaster ID ${pm.ID} has no ProductGroupID, assigning to ${defaultGroupId}`);
        await pool.request()
          .input('ID', sql.Int, pm.ID)
          .input('GroupID', sql.Int, defaultGroupId)
          .query('UPDATE ProductMaster SET Product_group_ID = @GroupID WHERE ID = @ID');
      }
    }

    // Fix ProductModel → ProductMaster references
    for (const prodMod of prodModResult.recordset) {
      if (!prodMod.ProductID || prodMod.ProductID === null) {
        // Assign to first ProductMaster (usually ID=1)
        const defaultMasterId = pmResult.recordset.length > 0 ? pmResult.recordset[0].ID : 1;
        console.log(`  ⚠️  ProductModel Id ${prodMod.Id} has no ProductID, assigning to ${defaultMasterId}`);
        await pool.request()
          .input('Id', sql.Int, prodMod.Id)
          .input('ProductID', sql.Int, defaultMasterId)
          .query('UPDATE ProductModels SET ProductID = @ProductID WHERE Id = @Id');
      } else if (!pmResult.recordset.some(pm => pm.ID === prodMod.ProductID)) {
        // ProductID references non-existent ProductMaster
        const defaultMasterId = pmResult.recordset.length > 0 ? pmResult.recordset[0].ID : 1;
        console.log(`  ⚠️  ProductModel Id ${prodMod.Id} references non-existent ProductID ${prodMod.ProductID}, fixing to ${defaultMasterId}`);
        await pool.request()
          .input('Id', sql.Int, prodMod.Id)
          .input('ProductID', sql.Int, defaultMasterId)
          .query('UPDATE ProductModels SET ProductID = @ProductID WHERE Id = @Id');
      }
    }

    // Fix SparePart → ProductModel references
    for (const sp of spResult.recordset) {
      if (!sp.ProductModelId || sp.ProductModelId === null) {
        // Assign to first ProductModel (usually Id=1)
        const defaultModelId = prodModResult.recordset.length > 0 ? prodModResult.recordset[0].Id : 1;
        console.log(`  ⚠️  SparePart Id ${sp.Id} has no ProductModelId, assigning to ${defaultModelId}`);
        await pool.request()
          .input('Id', sql.Int, sp.Id)
          .input('ProductModelId', sql.Int, defaultModelId)
          .query('UPDATE spare_parts SET ProductModelId = @ProductModelId WHERE Id = @Id');
      } else if (!prodModResult.recordset.some(pm => pm.Id === sp.ProductModelId)) {
        // ProductModelId references non-existent ProductModel
        const defaultModelId = prodModResult.recordset.length > 0 ? prodModResult.recordset[0].Id : 1;
        console.log(`  ⚠️  SparePart Id ${sp.Id} references non-existent ProductModelId ${sp.ProductModelId}, fixing to ${defaultModelId}`);
        await pool.request()
          .input('Id', sql.Int, sp.Id)
          .input('ProductModelId', sql.Int, defaultModelId)
          .query('UPDATE spare_parts SET ProductModelId = @ProductModelId WHERE Id = @Id');
      }
    }

    // Step 6: Verify after fix
    console.log('\n✅ Step 6: Verifying relationships after fix...');
    
    const verifyQuery = `
      SELECT 
        pg.Id as GroupId,
        pg.VALUE as GroupName,
        pm.ID as MasterId,
        pm.VALUE as MasterName,
        prodm.Id as ModelId,
        prodm.MODEL_CODE as ModelCode,
        sp.Id as SpartPartId,
        sp.PART as PartName
      FROM ProductGroups pg
      LEFT JOIN ProductMaster pm ON pm.Product_group_ID = pg.Id
      LEFT JOIN ProductModels prodm ON prodm.ProductID = pm.ID
      LEFT JOIN spare_parts sp ON sp.ProductModelId = prodm.Id
      ORDER BY pg.Id, pm.ID, prodm.Id, sp.Id
    `;
    
    const verifyResult = await pool.request().query(verifyQuery);
    
    if (verifyResult.recordset.length === 0) {
      console.log('⚠️  Warning: No complete hierarchy found. Check if data exists.');
    } else {
      console.log('📊 Product Hierarchy after fix:');
      verifyResult.recordset.forEach(row => {
        const hierarchy = [];
        if (row.GroupId) hierarchy.push(`GroupId: ${row.GroupId} (${row.GroupName})`);
        if (row.MasterId) hierarchy.push(`MasterId: ${row.MasterId} (${row.MasterName})`);
        if (row.ModelId) hierarchy.push(`ModelId: ${row.ModelId} (${row.ModelCode})`);
        if (row.SpartPartId) hierarchy.push(`PartId: ${row.SpartPartId} (${row.PartName})`);
        console.log(`  ${hierarchy.join(' → ') || '(No linked data)'}`);
      });
    }

    console.log('\n✅ Product hierarchy fix completed successfully!');

  } catch (err) {
    console.error('❌ Error fixing product hierarchy:', err);
    process.exit(1);
  }
}

fixProductHierarchy().then(() => process.exit(0));
