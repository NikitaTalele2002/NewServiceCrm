/**
 * Admin Upload Service
 * Contains all business logic for master data uploads
 * Extracted from admin.js to keep routes clean
 */

import xlsx from "xlsx";
import { Op } from "sequelize";
import {
  sequelize,
  State,
  City,
  Pincode,
  ProductGroup,
  ProductModel,
  SparePart,
  Product,
  ProductMaster
} from "../models/index.js";

/* ==================== HELPERS ==================== */

export function normalizeRow(raw) {
  const out = {};
  for (const k of Object.keys(raw || {})) {
    out[k.trim().toLowerCase()] = raw[k];
  }
  return out;
}

export function pickFirst(...vals) {
  for (const v of vals) {
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return null;
}

export function excelSerialToJSDate(serial) {
  const n = Number(serial);
  if (isNaN(n)) return null;
  return new Date((n - 25569) * 86400 * 1000);
}

export function parsePossibleId(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === "number" && !isNaN(v)) return Number.isInteger(v) ? v : Math.trunc(v);
  const s = String(v).trim();
  if (s === "") return null;
  const clean = s.replace(/\.0+$/, "");
  const n = Number(clean);
  if (!isNaN(n)) return Number.isInteger(n) ? n : Math.trunc(n);
  return null;
}

/* ==================== UPLOAD FUNCTIONS ==================== */

export async function uploadProductModels(rowsToProcess, mode, sequelize) {
  let uploadedCount = 0;
  let deletedCount = 0;
  const errors = [];
  const CHUNK = 500;

  console.log(`\n📦 ProductModels Upload: Mode=${mode}, Rows=${rowsToProcess.length}`);

  if (mode === "replace") {
    try {
      await sequelize.query(`TRUNCATE TABLE ${ProductModel.getTableName()}`);
      console.log('✓ Table truncated');
    } catch (e) {
      try {
        const cnt = await ProductModel.destroy({ where: {}, force: true });
        deletedCount = typeof cnt === "number" ? cnt : 0;
        console.log(`✓ Destroyed ${deletedCount} records`);
      } catch (e2) {
        console.error('✗ Failed to clear:', e2 && e2.message);
      }
    }

    // Reset identity seed to 0 so next insert starts from ID=1
    try {
      await sequelize.query(`DBCC CHECKIDENT ('[${ProductModel.getTableName()}]', RESEED, 0)`);
      console.log('✓ Identity reset to start from 1');
    } catch (e) {
      console.warn('⚠ Failed to reset identity:', e && e.message);
    }
  }

  for (let i = 0; i < rowsToProcess.length; i += CHUNK) {
    const chunk = rowsToProcess.slice(i, i + CHUNK);
    const t = await sequelize.transaction();
    let committed = false;
    let hasExplicitIds = false;
    
    try {
      // Check if any rows have explicit IDs in the Excel
      if (mode === "replace" && chunk.length > 0) {
        const firstRow = chunk[0];
        const rowId = parsePossibleId(pickFirst(
          firstRow.norm["id"], firstRow.norm["modelid"], firstRow.norm["model_id"],
          firstRow.raw && firstRow.raw.Id, firstRow.raw && firstRow.raw.ID, firstRow.raw && firstRow.raw.id
        ));
        hasExplicitIds = rowId !== null;
        
        if (hasExplicitIds) {
          // Only enable IDENTITY_INSERT if Excel actually has ID values
          try {
            await sequelize.query(`SET IDENTITY_INSERT dbo.${ProductModel.getTableName()} ON`, { transaction: t });
            console.log('ℹ️ IDENTITY_INSERT enabled (using Excel IDs)');
          } catch (ieErr) {
            console.warn('Failed to enable IDENTITY_INSERT:', ieErr && ieErr.message);
          }
        }
      }

      for (let j = 0; j < chunk.length; j++) {
        const idx = i + j;
        const { raw, norm } = chunk[j];

        // Log first 5 rows to debug extraction
        if (idx < 5) {
          console.log(`\n📋 ProductModel Row ${idx + 2} DEBUG:`);
          console.log(`   Raw keys: ${Object.keys(raw || {}).slice(0, 15).join(', ')}`);
          console.log(`   Norm keys: ${Object.keys(norm || {}).slice(0, 15).join(', ')}`);
          console.log(`   raw.MODEL_CODE: ${raw?.MODEL_CODE}`);
          console.log(`   norm['model_code']: ${norm?.["model_code"]}`);
        }

        // Extract ProductID value from Excel (plain column, no FK resolution)
        const productId = parsePossibleId(pickFirst(
          norm["productid"], norm["product_id"],
          raw && raw.ProductID
        ));
        // Extract explicit Id from Excel (for replace mode)
        const rowId = parsePossibleId(pickFirst(
          norm["id"], norm["modelid"], norm["model_id"],
          raw && raw.Id, raw && raw.ID, raw && raw.id
        ));

        const brand = pickFirst(
          norm["brand"],
          raw && raw.BRAND, raw && raw.Brand
        );
        const product = pickFirst(
          norm["product"], norm["product_name"], norm["product "],
          raw && raw.PRODUCT, raw && raw.Product, raw && raw["PRODUCT "]
        );
        const modelCode = pickFirst(
          norm["model_code"], norm["modelcode"], norm["model code"],
          norm["model"], norm["model_name"], norm["model_description"],
          raw && raw.MODEL_CODE, raw && raw.Model_Code, raw && raw.modelCode, raw && raw["Model Code"],
          raw && raw["MODEL_CODE "], raw && raw.Code
        );

        // Log extracted modelCode for debug
        if (idx < 5) {
          console.log(`   modelCode (extracted): "${modelCode}"`);
        }
        const modelDesc = pickFirst(
          norm["model_description"], norm["modeldescription"], norm["model_desc"],
          norm["model_descript"], norm["description"],
          raw && raw.MODEL_DESCRIPTION, raw && raw["Model Description"]
        );
        const priceRaw = pickFirst(
          norm["price"], norm["cost"], norm["rate"],
          raw && raw.PRICE, raw && raw.Price
        );
        const price = priceRaw !== null ? (priceRaw === "" ? null : Number(priceRaw)) : null;
        const serializedFlag = pickFirst(
          norm["serialized_flag"], norm["serialized"], norm["serialized_flag "], norm["serializable"],
          raw && raw.SERIALIZED_FLAG, raw && raw["Serialized Flag"]
        );
        const warrantyRaw = pickFirst(
          norm["warranty_in_months"], norm["warranty"], norm["warranty_in_month"], norm["warranty_months"],
          raw && raw.WARRANTY_IN_MONTHS, raw && raw["Warranty In Months"]
        );
        const warranty = warrantyRaw !== null && warrantyRaw !== undefined && warrantyRaw !== "" ? Number(warrantyRaw) : null;
        let validFromRaw = pickFirst(
          norm["valid_from"], norm["validfrom"], norm["valid from"], norm["date"],
          raw && raw.VALID_FROM, raw && raw["Valid From"]
        );
        let validFrom = null;
        if (validFromRaw) {
          if (validFromRaw instanceof Date) validFrom = validFromRaw;
          else {
            if (!isNaN(Number(validFromRaw)) && String(validFromRaw).length < 8) {
              validFrom = excelSerialToJSDate(validFromRaw);
            } else {
              const d = new Date(validFromRaw);
              if (!isNaN(d.getTime())) validFrom = d;
              else validFrom = null;
            }
          }
        }

        if (!modelCode) {
          // Log first 10 missing to understand structure
          if (idx < 10) {
            console.warn(`  ❌ Row ${idx + 2}: Missing MODEL_CODE. Available keys: ${Object.keys(norm).slice(0, 10).join(", ")}${Object.keys(norm).length > 10 ? "..." : ""}`);
            console.warn(`     Full norm keys: ${Object.keys(norm).join(", ")}`);
          }
          errors.push({ row: idx + 2, reason: "Missing MODEL_CODE", availableKeys: Object.keys(norm).slice(0, 5) });
          continue;
        }

        try {
          const existing = await ProductModel.findOne({ where: { MODEL_CODE: String(modelCode).trim() }, transaction: t });
          
          // DEBUG: Log extracted values for first 5 rows
          if (idx < 5) {
            console.log(`\n️[DEBUG row ${idx + 2}] Extracted values:`);
            console.log(`  productId: ${productId} (type: ${typeof productId})`);
            console.log(`  product: ${product} (type: ${typeof product})`);
            console.log(`  brand: ${brand} (type: ${typeof brand})`);
            console.log(`  modelCode: ${modelCode}`);
            console.log(`  Normalized keys available: ${Object.keys(norm).slice(0, 15).join(", ")}`);
          }
          
          const payload = {
            ProductID: productId || null,
            BRAND: brand ? String(brand).trim() : null,
            PRODUCT: product ? String(product).trim() : null,
            MODEL_CODE: String(modelCode).trim(),
            MODEL_DESCRIPTION: modelDesc ? String(modelDesc).trim() : null,
            PRICE: price !== null && !isNaN(price) ? price : null,
            SERIALIZED_FLAG: serializedFlag ? String(serializedFlag).trim() : null,
            WARRANTY_IN_MONTHS: warranty !== null && !isNaN(warranty) ? warranty : null,
            VALID_FROM: validFrom || null
          };

          // When in replace mode and an explicit Id is provided in the Excel, include it so
          // SQL Server inserts the exact identity value (IDENTITY_INSERT must be ON)
          if (mode === "replace" && rowId !== null) {
            payload.Id = rowId;
          }

          if (existing) {
            await existing.update(payload, { transaction: t });
          } else {
            await ProductModel.create(payload, { transaction: t });
          }
          uploadedCount++;
        } catch (upErr) {
          const msg = upErr && upErr.message ? upErr.message : String(upErr);
          const fullErr = upErr && upErr.sql ? `${msg} | SQL: ${upErr.sql}` : msg;
          errors.push({ row: idx + 2, reason: fullErr, modelCode });
          if (idx < 5 || Math.random() < 0.01) { // Log first 5 rows + 1% sample
            console.error(`  Row ${idx + 2} [${modelCode}]: ${fullErr}`);
          }
        }
      }

      // If we enabled IDENTITY_INSERT (when Excel has explicit IDs), turn it off BEFORE committing
      if (hasExplicitIds) {
        try {
          await sequelize.query(`SET IDENTITY_INSERT dbo.${ProductModel.getTableName()} OFF`, { transaction: t });
        } catch (ieErr) {
          console.warn('Failed to disable IDENTITY_INSERT:', ieErr && ieErr.message);
        }
      }

      await t.commit();
      committed = true;
      console.log(`✓ Chunk ${Math.floor(i / CHUNK) + 1}: Uploaded ${uploadedCount} rows`);
    } catch (chunkErr) {
      try { if (!committed) await t.rollback(); } catch (rbErr) { console.error("Rollback failed:", rbErr && rbErr.message); }
      // Ensure IDENTITY_INSERT is disabled if an error occurred
      if (hasExplicitIds) {
        try {
          await sequelize.query(`SET IDENTITY_INSERT dbo.${ProductModel.getTableName()} OFF`);
        } catch (ieErr) {
          console.warn('Failed to disable IDENTITY_INSERT after error:', ieErr && ieErr.message);
        }
      }
      const msg = chunkErr && chunkErr.message ? chunkErr.message : String(chunkErr);
      errors.push({ row: `chunk ${Math.floor(i / CHUNK) + 1}`, reason: msg });
      console.error(`✗ Chunk ${Math.floor(i / CHUNK) + 1}: ${msg}`);
    }
  }

  console.log(`📊 Result: ${uploadedCount}/${rowsToProcess.length} uploaded, ${errors.length} errors\n`);
  return { uploadedCount, deletedCount, errors };
}

export async function uploadSpareParts(rowsToProcess, mode, sequelize) {
  let uploadedCount = 0;
  let deletedCount = 0;
  const errors = [];
  const CHUNK = 500;

  // Log the mode being used
  console.log(`\n🚀 uploadSpareParts starting with mode="${mode}" for ${rowsToProcess.length} rows`);
  if (mode === "replace") {
    console.log(`   In REPLACE mode: Duplicates (same BRAND+PART) will be CREATED as new rows, not merged`);
  } else {
    console.log(`   In APPEND mode: If BRAND+PART exists, it will be UPDATED, not created anew`);
  }

  if (mode === "replace") {
    // Count existing rows before delete
    try {
      const countBefore = await SparePart.count();
      console.log(`📊 Existing rows before truncate: ${countBefore}`);
    } catch (e) {
      console.warn('Could not count existing rows');
    }

    try {
      await sequelize.query(`TRUNCATE TABLE ${SparePart.getTableName()}`);
      console.log('✓ Table truncated');
    } catch (e) {
      try {
        const cnt = await SparePart.destroy({ where: {}, force: true });
        deletedCount = typeof cnt === "number" ? cnt : 0;
        console.log(`✓ Destroyed ${deletedCount} records`);
      } catch (e2) {
        console.error('✗ Failed to clear:', e2 && e2.message);
      }
    }

    // Reset identity seed to 0 so next insert starts from ID=1
    try {
      await sequelize.query(`DBCC CHECKIDENT ('${SparePart.getTableName()}', RESEED, 0)`);
      console.log('✓ Identity reset to start from 1');
    } catch (e) {
      console.warn('⚠ Failed to reset identity:', e && e.message);
    }
  } else {
    console.log(`ℹ️ Mode is "${mode}" - NOT truncating table, will append/update`);
  }

  for (let i = 0; i < rowsToProcess.length; i += CHUNK) {
    const chunk = rowsToProcess.slice(i, i + CHUNK);
    const t = await sequelize.transaction();
    let committed = false;
    let hasExplicitIds = false;
    let identityEnabled = false;
    try {
      // Detect if Excel provided explicit IDs in this chunk
      hasExplicitIds = chunk.some(({ raw, norm }) => {
        const maybeId = parsePossibleId(pickFirst(
          norm["id"], norm["sparepartid"], norm["spare_part_id"],
          raw && raw.Id, raw && raw.ID, raw && raw.id
        ));
        return maybeId !== null;
      });
      
      // Only enable IDENTITY_INSERT if Excel actually has ID values
      if (hasExplicitIds) {
        try {
          await sequelize.query(`SET IDENTITY_INSERT dbo.${SparePart.getTableName()} ON`, { transaction: t });
          identityEnabled = true;
          console.log('ℹ️ IDENTITY_INSERT enabled for SpareParts (using Excel IDs)');
        } catch (ieErr) {
          console.warn('Failed to enable IDENTITY_INSERT for SpareParts:', ieErr && ieErr.message);
        }
      }

      for (let j = 0; j < chunk.length; j++) {
        const idx = i + j;
        const { raw, norm } = chunk[j];

        // DEBUG: Log Excel columns on first 5 rows
        if (idx < 5) {
          console.log(`\n📋 Row ${idx + 2} Excel columns: ${Object.keys(norm).join(", ")}`);
        }

        // Extract explicit Id from Excel (for replace mode)
        const rowId = parsePossibleId(pickFirst(
          norm["id"], norm["sparepartid"], norm["spare_part_id"],
          raw && raw.Id, raw && raw.ID, raw && raw.id
        ));

        // Extract fields from Excel with flexible column name matching
        const brand = pickFirst(
          norm["brand"], norm["brand_name"], 
          raw && raw.BRAND, raw && raw["Brand Name"]
        );
        const part = pickFirst(
          norm["part"], norm["part_name"], norm["part_no"], norm["partno"], norm["part number"],
          norm["spare"], norm["spare_name"],
          raw && raw.PART, raw && raw["Part Name"], raw && raw.PART_NO, raw && raw.part_no
        );
        const description = pickFirst(
          norm["description"], norm["descr"], norm["desc"], norm["part_description"],
          raw && raw.DESCRIPTION, raw && raw.Description, raw && raw.PART_DESCRIPTION
        );
        // Extract ModelID (this should be the ProductModel ID from the excel)
        const modelId = parsePossibleId(pickFirst(
          norm["modelid"], norm["model_id"], norm["productmodelid"], norm["product_model_id"],
          raw && raw.ModelID, raw && raw["Model ID"], raw && raw.ProductModelId, raw && raw["Product Model ID"]
        ));
        const mappedModel = pickFirst(
          norm["mapped_model"], norm["mapped model"], norm["model_code"],
          raw && raw.MAPPED_MODEL, raw && raw["Mapped Model"]
        );
        const modelDescription = pickFirst(
          norm["model_description"], norm["model description"],
          raw && raw.MODEL_DESCRIPTION, raw && raw["Model Description"]
        );
        const maxUsedQtyRaw = pickFirst(
          norm["max_used_qty"], norm["max used qty"], norm["qty"], norm["std_qty"],
          raw && raw.MAX_USED_QTY, raw && raw["Max Used Qty"], raw && raw.STD_QTY
        );
        const maxUsedQty = maxUsedQtyRaw !== null && maxUsedQtyRaw !== undefined && maxUsedQtyRaw !== "" ? Number(maxUsedQtyRaw) : null;
        const serviceLevel = pickFirst(
          norm["service_level"], norm["service level"], norm["part_category"],
          raw && raw.SERVICE_LEVEL, raw && raw["Service Level"], raw && raw.PART_CATEGORY
        );
        const partLocation = pickFirst(
          norm["part_location"], norm["part location"],
          raw && raw.PART_LOCATION, raw && raw["Part Location"]
        );
        const status = pickFirst(
          norm["status"],
          raw && raw.STATUS, raw && raw.Status
        );
        const lastUpdatedDateRaw = pickFirst(
          norm["last_updated_date"], norm["last updated date"],
          raw && raw.LAST_UPDATED_DATE, raw && raw["Last Updated Date"]
        );
        const lastUpdatedDate = lastUpdatedDateRaw ? excelSerialToJSDate(lastUpdatedDateRaw) : null;

        // Validate required fields
        if (!brand) {
          if (idx < 10) {
            console.warn(`  Row ${idx + 2}: Missing BRAND. Available keys: ${Object.keys(norm).slice(0, 10).join(", ")}${Object.keys(norm).length > 10 ? "..." : ""}`);
          }
          errors.push({ row: idx + 2, reason: "Missing BRAND", availableKeys: Object.keys(norm).slice(0, 5) });
          continue;
        }

        if (!part) {
          if (idx < 10) {
            console.warn(`  Row ${idx + 2}: Missing PART. Available keys: ${Object.keys(norm).slice(0, 10).join(", ")}${Object.keys(norm).length > 10 ? "..." : ""}`);
          }
          errors.push({ row: idx + 2, reason: "Missing PART", availableKeys: Object.keys(norm).slice(0, 5) });
          continue;
        }

        try {
          // DEBUG: First 5 rows show extracted values
          if (idx < 5) {
            console.log(`  Extracted: brand="${brand}", part="${part}", modelId=${modelId}, mappedModel="${mappedModel}"`);
          }

          // In replace mode: always create new rows (table was truncated)
          // In append mode: check if existing and update if found
          let existing = null;
          if (mode !== "replace") {
            existing = await SparePart.findOne({
              where: {
                BRAND: String(brand).trim(),
                PART: String(part).trim()
              },
              transaction: t
            });
          }

          // Resolve ModelID: First try explicit ID, then try mapped_model as MODEL_CODE
          let resolvedModelId = null;
          
          if (modelId !== null) {
            // If explicit ModelID provided, validate it exists in ProductModel table
            try {
              const model = await ProductModel.findOne({ where: { Id: modelId }, transaction: t });
              if (model) {
                resolvedModelId = modelId;
                if (idx < 5) console.log(`  Row ${idx + 2}: Using explicit ModelID ${modelId}`);
              } else {
                console.warn(`  Row ${idx + 2}: ProductModel ID ${modelId} not found`);
              }
            } catch (lookupErr) {
              console.warn(`  Row ${idx + 2}: Error looking up ProductModel ID ${modelId}: ${lookupErr && lookupErr.message}`);
            }
          }
          
          // If not resolved yet, try to use MAPPED_MODEL as a ProductModel MODEL_CODE
          if (resolvedModelId === null && mappedModel) {
            try {
              const model = await ProductModel.findOne({
                where: { MODEL_CODE: String(mappedModel).trim() },
                transaction: t
              });
              if (model) {
                resolvedModelId = model.Id;
                if (idx < 5) console.log(`  Row ${idx + 2}: Found ProductModel by MODEL_CODE="${mappedModel}" → ModelID=${model.Id}`);
              }
            } catch (lookupErr) {
              console.warn(`  Row ${idx + 2}: Error looking up ProductModel by MODEL_CODE "${mappedModel}": ${lookupErr && lookupErr.message}`);
            }
          }

          const payload = {
            BRAND: String(brand).trim(),
            PART: String(part).trim(),
            ModelID: resolvedModelId || null,
            DESCRIPTION: description ? String(description).trim() : null,
            MAPPED_MODEL: mappedModel ? String(mappedModel).trim() : null,
            MODEL_DESCRIPTION: modelDescription ? String(modelDescription).trim() : null,
            MAX_USED_QTY: maxUsedQty,
            SERVICE_LEVEL: serviceLevel ? String(serviceLevel).trim() : null,
            PART_LOCATION: partLocation ? String(partLocation).trim() : null,
            STATUS: status ? String(status).trim() : null,
            LAST_UPDATED_DATE: lastUpdatedDate
          };

          // When in replace mode and an explicit Id is provided in the Excel, include it so
          // SQL Server inserts the exact identity value (IDENTITY_INSERT must be ON)
          if (mode === "replace" && rowId !== null) {
            payload.Id = rowId;
          }

          if (existing) {
            await existing.update(payload, { transaction: t });
            if (idx < 5) console.log(`  Row ${idx + 2}: UPDATED existing (BRAND="${brand}", PART="${part}") ModelID=${resolvedModelId || "NULL"}`);
          } else {
            // Only delete Id if it wasn't explicitly set
            if (payload.Id === undefined) delete payload.Id;
            await SparePart.create(payload, { transaction: t });
            if (idx < 5) {
              const action = mode === "replace" ? "CREATED (replace mode)" : "CREATED (no existing found)";
              console.log(`  Row ${idx + 2}: ${action} ModelID=${resolvedModelId || "NULL"}`);
            }
          }
          uploadedCount++;
        } catch (upErr) {
          const msg = upErr && upErr.message ? upErr.message : String(upErr);
          errors.push({ row: idx + 2, reason: msg, brand, part, mappedModel });
          console.warn(`  Row ${idx + 2} (BRAND: ${brand}, PART: ${part}, MAPPED_MODEL: ${mappedModel}): ${msg}`);
        }
      }

      // If IDENTITY_INSERT was enabled, turn it OFF before committing
      if (identityEnabled) {
        try {
          await sequelize.query(`SET IDENTITY_INSERT dbo.${SparePart.getTableName()} OFF`, { transaction: t });
        } catch (ieErr) {
          console.warn('Failed to disable IDENTITY_INSERT for SpareParts:', ieErr && ieErr.message);
        }
      }

      await t.commit();
      committed = true;
    } catch (chunkErr) {
      try { if (!committed) await t.rollback(); } catch (rbErr) { console.error("Rollback failed:", rbErr && rbErr.message); }
      // Ensure IDENTITY_INSERT is disabled if an error occurred
      if (identityEnabled) {
        try {
          await sequelize.query(`SET IDENTITY_INSERT dbo.${SparePart.getTableName()} OFF`);
        } catch (ieErr) {
          console.warn('Failed to disable IDENTITY_INSERT after error for SpareParts:', ieErr && ieErr.message);
        }
      }
      errors.push({ row: `chunk ${i / CHUNK + 1}`, reason: chunkErr && chunkErr.message ? chunkErr.message : String(chunkErr) });
    }
  }

  console.log(`\n📊 SpareParts Result: ${uploadedCount}/${rowsToProcess.length} uploaded, ${deletedCount} deleted. Errors: ${errors.length}`);
  
  // Verify actual rows in database
  try {
    const actualCount = await SparePart.count();
    console.log(`✅ Verification: ${actualCount} rows now in SpareParts table`);
    if (actualCount !== uploadedCount && mode === "replace") {
      console.warn(`⚠️  WARNING: uploadedCount (${uploadedCount}) doesn't match actual rows (${actualCount})`);
    }
  } catch (e) {
    console.warn('Could not verify row count:', e && e.message);
  }

  if (errors.length > 0) {
    console.log(`\n⚠️  First 10 errors:`);
    errors.slice(0, 10).forEach((err, i) => {
      console.log(`  ${i + 1}. Row ${err.row}: ${err.reason}`);
    });
  }
  return { uploadedCount, deletedCount, errors };
}

export async function uploadPincodes(rowsToProcess, mode, sequelize) {
  let uploadedCount = 0;
  let deletedCount = 0;
  const errors = [];
  const CHUNK = 500;

  if (mode === "replace") {
    try {
      await sequelize.query(`TRUNCATE TABLE ${Pincode.getTableName()}`);
    } catch (e) {
      // Fallback to batched deletes to avoid long-running single DELETE causing timeouts
      const table = Pincode.getTableName();
      try {
        let batchDeleted = 0;
        while (true) {
          const res = await sequelize.query(`DELETE TOP (5000) FROM ${table}; SELECT @@ROWCOUNT AS AFFECTEDROWS;`);
          let affected = 0;
          if (Array.isArray(res) && res.length) {
            const first = res[0];
            if (Array.isArray(first) && first.length && first[0] && first[0].AFFECTEDROWS !== undefined) {
              affected = Number(first[0].AFFECTEDROWS);
            } else if (res[1] && res[1].rowsAffected) {
              // tedious returns rowsAffected in metadata
              affected = Array.isArray(res[1].rowsAffected) ? (res[1].rowsAffected[0] || 0) : (res[1].rowsAffected || 0);
            }
          }
          if (!affected) break;
          batchDeleted += affected;
          if (affected < 5000) break; // last batch
        }
        deletedCount = batchDeleted;
      } catch (delErr) {
        // Last resort fallback
        const cnt = await Pincode.destroy({ where: {} });
        deletedCount = typeof cnt === "number" ? cnt : deletedCount;
      }
    }

    // Reset identity seed to 0 so next insert starts from ID=1
    try {
      await sequelize.query(`DBCC CHECKIDENT ('${Pincode.getTableName()}', RESEED, 0)`);
      console.log('✓ Identity reset to start from 1');
    } catch (e) {
      console.warn('⚠ Failed to reset identity:', e && e.message);
    }
  }

  for (let i = 0; i < rowsToProcess.length; i += CHUNK) {
    const chunk = rowsToProcess.slice(i, i + CHUNK);
    const t = await sequelize.transaction();
    let committed = false;
    let identityEnabled = false;
    try {
      if (mode === "replace") {
        try {
          await sequelize.query(`SET IDENTITY_INSERT dbo.${Pincode.getTableName()} ON`, { transaction: t });
          identityEnabled = true;
        } catch (ieErr) {
          console.warn('Failed to enable IDENTITY_INSERT for Pincodes:', ieErr && ieErr.message);
        }
      }

      for (let j = 0; j < chunk.length; j++) {
        const idx = i + j;
        const { raw, norm } = chunk[j];

        const excelId = parsePossibleId(pickFirst(norm["id"], norm["excelid"], norm["Id"], norm["ID"], raw && raw.Id));
        const pincode = pickFirst(
          norm["pincode"], norm["pin_code"], norm["value"],
          norm["pin"], norm["codes"],
          raw && raw.PINCODE, raw && raw.Pincode, raw && raw["Pin Code"]
        );
        const cityId = parsePossibleId(pickFirst(
          norm["city_id"], norm["city id"], norm["cityid"], norm["city"],
          raw && raw.City_ID, raw && raw.CityId, raw && raw["City ID"]
        ));
        const description = pickFirst(
          norm["description"], norm["descr"], norm["desc"],
          raw && raw.DESCRIPTION, raw && raw.Description
        );
        const state = pickFirst(
          norm["state"], norm["state_name"], norm["statename"],
          norm["parent_description"], norm["parent"],
          raw && raw.PARENT_DESCRIPTION, raw && raw["Parent Description"]
        );

        if (!pincode) {
          if (idx < 10) {
            console.warn(`  Row ${idx + 2}: Missing PINCODE. Available keys: ${Object.keys(norm).slice(0, 10).join(", ")}${Object.keys(norm).length > 10 ? "..." : ""}`);
          }
          errors.push({ row: idx + 2, reason: "Missing PINCODE", availableKeys: Object.keys(norm).slice(0, 5) });
          continue;
        }

        try {
          let resolvedCityId = null;
          if (cityId !== null) {
            const c = await City.findOne({ where: { Id: cityId }, transaction: t });
            if (c) resolvedCityId = c.Id;
            else {
              errors.push({ row: idx + 2, reason: `City Id ${cityId} not found`, raw });
              continue;
            }
          } else if (state) {
            // Try to resolve state by VALUE or DESCRIPTION
            const s = await State.findOne({ where: { VALUE: String(state).trim() }, transaction: t });
            let stateRec = s;
            if (!stateRec) stateRec = await State.findOne({ where: { DESCRIPTION: String(state).trim() }, transaction: t });
            if (stateRec) {
              const c = await City.findOne({ where: { StateId: stateRec.Id }, transaction: t });
              if (c) resolvedCityId = c.Id;
            }
          } else if (raw && raw.City) {
            // try matching by City.Value raw column
            const c = await City.findOne({ where: { Value: String(raw.City).trim() }, transaction: t });
            if (c) resolvedCityId = c.Id;
          }

          // Use model attribute names: VALUE, DESCRIPTION, City_ID
          const where = { VALUE: String(pincode).trim() };
          const existing = await Pincode.findOne({ where, transaction: t });
          const payload = {
            VALUE: String(pincode).trim(),
            DESCRIPTION: description ? String(description).trim() : null,
            City_ID: resolvedCityId || null
          };

          // If replace mode and Excel provided an explicit Id, include it so SQL Server
          // inserts the exact identity value (requires IDENTITY_INSERT ON)
          if (mode === "replace" && excelId !== null) payload.Id = excelId;

          if (existing) {
            await existing.update(payload, { transaction: t });
          } else {
            await Pincode.create(payload, { transaction: t });
          }
          uploadedCount++;
        } catch (upErr) {
          errors.push({ row: idx + 2, reason: upErr && upErr.message ? upErr.message : String(upErr), raw });
        }
      }

      // If we enabled IDENTITY_INSERT, turn it off before committing the transaction
      if (identityEnabled) {
        try {
          await sequelize.query(`SET IDENTITY_INSERT dbo.${Pincode.getTableName()} OFF`, { transaction: t });
        } catch (ieErr) {
          console.warn('Failed to disable IDENTITY_INSERT for Pincodes:', ieErr && ieErr.message);
        }
      }

      await t.commit();
      committed = true;
    } catch (chunkErr) {
      try { if (!committed) await t.rollback(); } catch (rbErr) { console.error("Rollback failed:", rbErr && rbErr.message); }
      // Ensure IDENTITY_INSERT is off if we enabled it and an error occurred
      if (identityEnabled) {
        try { await sequelize.query(`SET IDENTITY_INSERT dbo.${Pincode.getTableName()} OFF`); } catch (ieErr) { console.warn('Failed to disable IDENTITY_INSERT after error for Pincodes:', ieErr && ieErr.message); }
      }
      errors.push({ row: `chunk ${i / CHUNK + 1}`, reason: chunkErr && chunkErr.message ? chunkErr.message : String(chunkErr) });
    }
  }

  return { uploadedCount, deletedCount, errors };
}

export async function uploadStates(rowsToProcess, mode, sequelize) {
  let uploadedCount = 0;
  let deletedCount = 0;
  const errors = [];
  const CHUNK = 500;

  if (mode === "replace") {
    try {
      await sequelize.query(`TRUNCATE TABLE ${State.getTableName()}`);
    } catch (e) {
      const cnt = await State.destroy({ where: {} });
      deletedCount = typeof cnt === "number" ? cnt : deletedCount;
    }

    // Reset identity seed to 0 so next insert starts from ID=1
    try {
      await sequelize.query(`DBCC CHECKIDENT ('${State.getTableName()}', RESEED, 0)`);
    } catch (e) {
      console.warn('Failed to reset identity for States:', e && e.message);
    }
  }

  for (let i = 0; i < rowsToProcess.length; i += CHUNK) {
    const chunk = rowsToProcess.slice(i, i + CHUNK);
    const t = await sequelize.transaction();
    let committed = false;
    let hasExplicitIds = false;
    let identityEnabled = false;
    try {
      // Detect if Excel provided explicit IDs in this chunk
      hasExplicitIds = chunk.some(({ raw, norm }) => {
        const maybeId = parsePossibleId(pickFirst(
          norm["id"], norm["state_id"],
          raw && raw.Id, raw && raw.ID, raw && raw.id
        ));
        return maybeId !== null;
      });
      
      if (hasExplicitIds) {
        try {
          await sequelize.query(`SET IDENTITY_INSERT dbo.${State.getTableName()} ON`, { transaction: t });
          identityEnabled = true;
          console.log('ℹ️ IDENTITY_INSERT enabled for States (using Excel IDs)');
        } catch (ieErr) {
          console.warn('Failed to enable IDENTITY_INSERT for States:', ieErr && ieErr.message);
        }
      }

      for (let j = 0; j < chunk.length; j++) {
        const idx = i + j;
        const { raw, norm } = chunk[j];

        const excelId = parsePossibleId(pickFirst(
          norm["id"], norm["state_id"],
          raw && raw.Id, raw && raw.ID, raw && raw.id
        ));

        const name = pickFirst(
          norm["name"], norm["state_name"], norm["statename"], norm["value"],
          norm["state"], norm["st"],
          raw && raw.name, raw && raw["State Name"], raw && raw.State
        );
        const code = pickFirst(
          norm["code"], norm["state_code"], norm["statecode"],
          norm["state_code"], norm["st_code"],
          raw && raw.code, raw && raw["State Code"]
        );
        const description = pickFirst(
          norm["description"], norm["descr"], norm["desc"],
          raw && raw.description, raw && raw.Description
        );

        if (!name) {
          if (idx < 10) {
            console.warn(`  Row ${idx + 2}: Missing STATE_NAME. Available keys: ${Object.keys(norm).slice(0, 10).join(", ")}${Object.keys(norm).length > 10 ? "..." : ""}`);
          }
          errors.push({ row: idx + 2, reason: "Missing STATE_NAME", availableKeys: Object.keys(norm).slice(0, 5) });
          continue;
        }

        try {
          const where = { VALUE: String(name).trim() };
          const existing = await State.findOne({ where, transaction: t });
          const payload = {
            VALUE: String(name).trim(),
            DESCRIPTION: code ? String(code).trim() : description ? String(description).trim() : null
          };

          // If an explicit ID was provided, include it
          if (excelId !== null) {
            payload.Id = excelId;
          }

          if (existing) {
            await existing.update(payload, { transaction: t });
          } else {
            if (payload.Id === undefined) delete payload.Id;
            await State.create(payload, { transaction: t });
          }
          uploadedCount++;
        } catch (upErr) {
          errors.push({ row: idx + 2, reason: upErr && upErr.message ? upErr.message : String(upErr), raw });
        }
      }

      if (identityEnabled) {
        try {
          await sequelize.query(`SET IDENTITY_INSERT dbo.${State.getTableName()} OFF`, { transaction: t });
        } catch (ieErr) {
          console.warn('Failed to disable IDENTITY_INSERT for States:', ieErr && ieErr.message);
        }
      }

      await t.commit();
      committed = true;
    } catch (chunkErr) {
      try { if (!committed) await t.rollback(); } catch (rbErr) { console.error("Rollback failed:", rbErr && rbErr.message); }
      errors.push({ row: `chunk ${i / CHUNK + 1}`, reason: chunkErr && chunkErr.message ? chunkErr.message : String(chunkErr) });
    }
  }

  return { uploadedCount, deletedCount, errors };
}

export async function uploadCities(rowsToProcess, mode, sequelize) {
  let uploadedCount = 0;
  let deletedCount = 0;
  const errors = [];
  const CHUNK = 500;
  let hasExplicitIds = false;

  if (rowsToProcess.length > 0) {
    const firstRow = rowsToProcess[0];
    const rowId = parsePossibleId(pickFirst(
      firstRow.raw && firstRow.raw.ID,
      firstRow.raw && firstRow.raw.Id,
      firstRow.norm["id"]
    ));
    hasExplicitIds = rowId !== null;
  }

  if (mode === "replace") {
    try {
      await sequelize.query(`TRUNCATE TABLE ${City.getTableName()}`);
    } catch (e) {
      const cnt = await City.destroy({ where: {} });
      deletedCount = typeof cnt === "number" ? cnt : deletedCount;
    }

    if (!hasExplicitIds) {
      try {
        await sequelize.query(`DBCC CHECKIDENT ('${City.getTableName()}', RESEED, 0)`);
      } catch (e) {
        console.warn('Failed to reset identity for Cities:', e && e.message);
      }
    }
  }

  for (let i = 0; i < rowsToProcess.length; i += CHUNK) {
    const chunk = rowsToProcess.slice(i, i + CHUNK);
    const t = await sequelize.transaction();
    let committed = false;
    let identityEnabled = false;
    try {
      if (mode === "replace" && hasExplicitIds) {
        try {
          await sequelize.query(`SET IDENTITY_INSERT dbo.${City.getTableName()} ON`, { transaction: t });
          identityEnabled = true;
        } catch (ieErr) {
          console.warn('Failed to enable IDENTITY_INSERT for Cities:', ieErr && ieErr.message);
        }
      }

      for (let j = 0; j < chunk.length; j++) {
        const idx = i + j;
        const { raw, norm } = chunk[j];

        const rowId = parsePossibleId(pickFirst(raw && raw.ID, raw && raw.Id, norm["id"]));
        const value = pickFirst(raw && raw.VALUE, raw && raw.Value, norm["value"], norm["city_name"], norm["city"]);
        const description = pickFirst(raw && raw.DESCRIPTION, raw && raw.Description, norm["description"]);
        const parentI = parsePossibleId(pickFirst(raw && raw.PARENT_I, raw && raw.Parent_I, norm["parent_i"], norm["parent_id"], norm["state_id"]));
        const parentDescription = pickFirst(raw && raw.PARENT_DESCRIPTION, raw && raw.Parent_Description, norm["parent_description"], norm["state_name"]);

        if (!value) {
          if (idx < 10) {
            console.warn(`  Row ${idx + 2}: Missing VALUE. Available keys: ${Object.keys(norm).slice(0, 10).join(", ")}${Object.keys(norm).length > 10 ? "..." : ""}`);
          }
          errors.push({ row: idx + 2, reason: "Missing VALUE", availableKeys: Object.keys(norm).slice(0, 5) });
          continue;
        }

        try {
          const payload = {
            Value: String(value).trim(),
            Description: description ? String(description).trim() : null
          };

          if (parentI !== null) payload.StateId = parentI;
          if (parentDescription !== null && parentDescription !== undefined) {
            payload.StateName = String(parentDescription).trim();
          }
          if (mode === "replace" && rowId !== null) {
            payload.Id = rowId;
          }

          let existing = null;
          if (rowId !== null) {
            existing = await City.findOne({ where: { Id: rowId }, transaction: t });
          }

          if (existing) {
            await existing.update(payload, { transaction: t });
          } else {
            await City.create(payload, { transaction: t });
          }
          uploadedCount++;
        } catch (upErr) {
          errors.push({ row: idx + 2, reason: upErr && upErr.message ? upErr.message : String(upErr), raw });
        }
      }

      if (identityEnabled) {
        try {
          await sequelize.query(`SET IDENTITY_INSERT dbo.${City.getTableName()} OFF`, { transaction: t });
        } catch (ieErr) {
          console.warn('Failed to disable IDENTITY_INSERT for Cities:', ieErr && ieErr.message);
        }
      }

      await t.commit();
      committed = true;
    } catch (chunkErr) {
      try { if (!committed) await t.rollback(); } catch (rbErr) { console.error("Rollback failed:", rbErr && rbErr.message); }
      if (identityEnabled) {
        try {
          await sequelize.query(`SET IDENTITY_INSERT dbo.${City.getTableName()} OFF`);
        } catch (ieErr) {
          console.warn('Failed to disable IDENTITY_INSERT after error for Cities:', ieErr && ieErr.message);
        }
      }
      errors.push({ row: `chunk ${i / CHUNK + 1}`, reason: chunkErr && chunkErr.message ? chunkErr.message : String(chunkErr) });
    }
  }

  return { uploadedCount, deletedCount, errors };
}

export async function uploadProducts(rowsToProcess, mode, sequelize) {
  let uploadedCount = 0;
  let deletedCount = 0;
  const errors = [];
  const CHUNK = 500;
  let hasExplicitIds = false;

  // Check first row to see if it has explicit IDs
  if (rowsToProcess.length > 0) {
    const firstRow = rowsToProcess[0];
    const { raw, norm } = firstRow;
    console.log(`\n📋 First row analysis for ID detection:`);
    console.log(`   Raw keys: ${Object.keys(raw || {}).join(', ')}`);
    console.log(`   Norm keys: ${Object.keys(norm || {}).join(', ')}`);
    
    const firstRowId = parsePossibleId(pickFirst(
      norm["id"], norm["product_id"], norm["product id"], raw && raw.Id, raw && raw.ID, raw && raw.id, raw && raw.product_id
    ));
    console.log(`   Detected ID from first row: ${firstRowId}`);
    
    if (firstRowId !== null) {
      hasExplicitIds = true;
      console.log('✓ Detected explicit IDs in Excel - will preserve each row\'s ID');
    } else {
      console.log('ℹ No explicit IDs detected - will auto-increment from 1');
    }
  }

  if (mode === "replace") {
    try {
      await sequelize.query(`TRUNCATE TABLE ${ProductMaster.getTableName()}`);
      console.log('✓ Table truncated');
    } catch (e) {
      try {
        const cnt = await ProductMaster.destroy({ where: {}, force: true });
        deletedCount = typeof cnt === "number" ? cnt : 0;
        console.log(`✓ Destroyed ${deletedCount} records`);
      } catch (e2) {
        console.error('✗ Failed to clear:', e2 && e2.message);
      }
    }

    // Reset identity seed to 0 so next insert starts from ID=1 (only if no explicit IDs)
    if (!hasExplicitIds) {
      try {
        await sequelize.query(`DBCC CHECKIDENT ('${ProductMaster.getTableName()}', RESEED, 0)`);
        console.log('✓ Identity reset to start from 1');
      } catch (e) {
        console.warn('⚠ Failed to reset identity:', e && e.message);
      }
    }
  }

  // Prepare all rows first (resolve product groups)
  const preparedRows = [];
  for (let i = 0; i < rowsToProcess.length; i++) {
    const { raw, norm } = rowsToProcess[i];
    
    const productName = pickFirst(
      norm["value"], norm["product_name"], norm["productname"], norm["product name"],
      norm["name"], norm["product"],
      raw && raw.VALUE, raw && raw["Product Name"], raw && raw.product_name
    );
    const rowId = parsePossibleId(pickFirst(
      norm["id"], norm["product_id"], norm["product id"], raw && raw.Id, raw && raw.ID, raw && raw.id, raw && raw.product_id
    ));
    const description = pickFirst(
      norm["description"], norm["descr"], norm["desc"],
      raw && raw.description, raw && raw.Description
    );
    const productGroupId = parsePossibleId(pickFirst(
      norm["product_group_id"], norm["product group id"], norm["productgroupid"],
      norm["product_group"], norm["group_id"], norm["group id"], norm["groupid"],
      raw && raw.Product_group_ID, raw && raw["Product Group ID"]
    ));

    if (!productName) {
      errors.push({ row: i + 2, reason: "Missing VALUE", availableKeys: Object.keys(norm).slice(0, 5) });
      continue;
    }

    // Resolve ProductGroup
    let resolvedGroupId = null;
    if (productGroupId !== null) {
      let productGroup = await ProductGroup.findOne({ where: { Id: productGroupId } });
      if (!productGroup) {
        const groupName = pickFirst(norm["product_group_name"], norm["product_group"], norm["group_name"]);
        if (groupName) {
          productGroup = await ProductGroup.findOne({ where: { VALUE: String(groupName).trim() } });
        }
      }
      if (productGroup) {
        resolvedGroupId = productGroup.Id;
      }
    }

    preparedRows.push({
      id: rowId,
      value: String(productName).trim(),
      groupId: resolvedGroupId,
      description: description ? String(description).trim() : null
    });
  }

  // For rows with explicit IDs, build batch SQL and execute
  if (hasExplicitIds && preparedRows.length > 0) {
    try {
      const tableName = ProductMaster.getTableName();
      let batchSql = `SET IDENTITY_INSERT dbo.${tableName} ON;\n`;
      
      for (const row of preparedRows) {
        const valValue = row.value.replace(/'/g, "''");
        const valDesc = row.description ? row.description.replace(/'/g, "''") : 'NULL';
        const valGroupId = row.groupId || 'NULL';
        
        batchSql += `INSERT INTO [${tableName}] (Id, [VALUE], Product_group_ID, DESCRIPTION, CreatedAt, UpdatedAt) 
                    VALUES (${row.id}, N'${valValue}', ${valGroupId}, N'${valDesc}', GETUTCDATE(), GETUTCDATE());\n`;
      }
      
      batchSql += `SET IDENTITY_INSERT dbo.${tableName} OFF;\n`;
      
      // Execute entire batch on single connection
      await sequelize.query(batchSql);
      uploadedCount = preparedRows.length;
      console.log(`✓ Batch executed: ${preparedRows.length} rows inserted with -Identity IDs`);
    } catch (batchErr) {
      errors.push({ reason: `Batch insert failed: ${batchErr && batchErr.message}` });
      console.error('Batch insert error:', batchErr);
    }
  } else if (preparedRows.length > 0) {
    // Normal inserts without explicit IDs
    for (let i = 0; i < preparedRows.length; i += CHUNK) {
      const chunk = preparedRows.slice(i, i + CHUNK);
      const t = await sequelize.transaction();
      let committed = false;

      try {
        for (const row of chunk) {
          try {
            let existing = await ProductMaster.findOne({ where: { VALUE: row.value }, transaction: t });
            
            const payload = {
              VALUE: row.value,
              ProductGroupID: row.groupId,
              DESCRIPTION: row.description
            };

            if (existing) {
              await existing.update(payload, { transaction: t });
            } else {
              await ProductMaster.create(payload, { transaction: t });
            }
            uploadedCount++;
          } catch (rowErr) {
            errors.push({ reason: `Row ${row.value} failed: ${rowErr && rowErr.message}` });
          }
        }

        await t.commit();
        committed = true;
      } catch (chunkErr) {
        try { if (!committed) await t.rollback(); } catch (rbErr) { }
        errors.push({ reason: `Chunk error: ${chunkErr && chunkErr.message}` });
      }
    }
  }

  console.log(`📊 Result: ${uploadedCount}/${rowsToProcess.length} uploaded, ${deletedCount} deleted. Errors: ${errors.length}`);
  return { uploadedCount, deletedCount, errors };
}


export async function uploadProductGroups(rowsToProcess, mode, sequelize) {
  let uploadedCount = 0;
  let deletedCount = 0;
  const errors = [];
  const CHUNK = 500;
  let identityEnabled = false;
  let hasExplicitIds = false;

  if (mode === "replace") {
    try {
      await sequelize.query(`TRUNCATE TABLE ${ProductGroup.getTableName()}`);
    } catch (e) {
      const cnt = await ProductGroup.destroy({ where: {} });
      deletedCount = typeof cnt === "number" ? cnt : deletedCount;
    }

    // Reset identity seed to 0 so next insert starts from ID=1
    try {
      await sequelize.query(`DBCC CHECKIDENT ('${ProductGroup.getTableName()}', RESEED, 0)`);
    } catch (e) {
      console.warn('Failed to reset identity for ProductGroups:', e && e.message);
    }
  }

  for (let i = 0; i < rowsToProcess.length; i += CHUNK) {
    const chunk = rowsToProcess.slice(i, i + CHUNK);
    const t = await sequelize.transaction();
    let committed = false;
    try {
      // Detect if chunk has explicit IDs; if so, enable IDENTITY_INSERT
      if (mode === "replace" && chunk.length > 0) {
        const firstRow = chunk[0];
        const maybeId = parsePossibleId(pickFirst(
          firstRow.norm && firstRow.norm["id"], 
          firstRow.raw && firstRow.raw.Id, 
          firstRow.raw && firstRow.raw.ID, 
          firstRow.raw && firstRow.raw.id
        ));
        hasExplicitIds = maybeId !== null;
        if (hasExplicitIds) {
          try {
            await sequelize.query(`SET IDENTITY_INSERT dbo.${ProductGroup.getTableName()} ON`, { transaction: t });
            identityEnabled = true;
            console.log('ℹ️ IDENTITY_INSERT enabled for ProductGroup (using Excel IDs)');
          } catch (ieErr) {
            console.warn('Failed to enable IDENTITY_INSERT for ProductGroup:', ieErr && ieErr.message);
          }
        }
      }

      for (let j = 0; j < chunk.length; j++) {
        const idx = i + j;
        const { raw, norm } = chunk[j];

        const rowId = parsePossibleId(pickFirst(
          norm["id"], 
          raw && raw.Id, 
          raw && raw.ID, 
          raw && raw.id
        ));

        const name = pickFirst(
          norm["name"], norm["group_name"], norm["groupname"],
          norm["value"], norm["group"],
          raw && raw.name, raw && raw["Group Name"]
        );
        const description = pickFirst(
          norm["description"], norm["descr"], norm["desc"],
          raw && raw.description, raw && raw.Description
        );

        if (!name) {
          if (idx < 10) {
            console.warn(`  Row ${idx + 2}: Missing GROUP_NAME. Available keys: ${Object.keys(norm).slice(0, 10).join(", ")}${Object.keys(norm).length > 10 ? "..." : ""}`);
          }
          errors.push({ row: idx + 2, reason: "Missing GROUP_NAME", availableKeys: Object.keys(norm).slice(0, 5) });
          continue;
        }

        try {
          const where = { VALUE: String(name).trim() };
          const existing = await ProductGroup.findOne({ where, transaction: t });
          const payload = {
            VALUE: String(name).trim(),
            DESCRIPTION: description ? String(description).trim() : null
          };

          // If Excel provided explicit Id and IDENTITY_INSERT is enabled, preserve it
          if (identityEnabled && rowId !== null) {
            payload.Id = rowId;
          }

          if (existing) {
            await existing.update(payload, { transaction: t });
          } else {
            await ProductGroup.create(payload, { transaction: t });
          }
          uploadedCount++;
        } catch (upErr) {
          errors.push({ row: idx + 2, reason: upErr && upErr.message ? upErr.message : String(upErr), raw });
        }
      }

      // Disable IDENTITY_INSERT before committing if it was enabled
      if (identityEnabled) {
        try {
          await sequelize.query(`SET IDENTITY_INSERT dbo.${ProductGroup.getTableName()} OFF`, { transaction: t });
        } catch (ieErr) {
          console.warn('Failed to disable IDENTITY_INSERT for ProductGroup:', ieErr && ieErr.message);
        }
      }

      await t.commit();
      committed = true;
    } catch (chunkErr) {
      try { if (!committed) await t.rollback(); } catch (rbErr) { console.error("Rollback failed:", rbErr && rbErr.message); }
      // Ensure IDENTITY_INSERT is disabled if an error occurred
      if (identityEnabled) {
        try {
          await sequelize.query(`SET IDENTITY_INSERT dbo.${ProductGroup.getTableName()} OFF`);
        } catch (ieErr) {
          console.warn('Failed to disable IDENTITY_INSERT after error for ProductGroup:', ieErr && ieErr.message);
        }
      }
      errors.push({ row: `chunk ${i / CHUNK + 1}`, reason: chunkErr && chunkErr.message ? chunkErr.message : String(chunkErr) });
    }
  }

  console.log(`📊 Result: ${uploadedCount}/${rowsToProcess.length} uploaded, ${deletedCount} deleted. Errors: ${errors.length}`);
  return { uploadedCount, deletedCount, errors };
}

export const typeMap = {
  model: "model",
  models: "model",
  productmodel: "model",
  productmodels: "model",
  sparepart: "sparepart",
  spareparts: "sparepart",
  "spare_part": "sparepart",
  "spare-parts": "sparepart",
  cities: "city",
  citys: "city",
  product: "product",
  productmaster: "product",
  productmasters: "product",
  productgroups: "productgroup",
  "product-groups": "productgroup",
  "product-group": "productgroup",
  "product_groups": "productgroup",
  "product_group": "productgroup",
  group: "productgroup",
  groups: "productgroup",
  pincode: "pincode",
  city: "city",
  state: "state",
  productgroup: "productgroup"
};
