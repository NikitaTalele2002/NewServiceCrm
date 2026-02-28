import fs from 'fs';
import xlsx from 'xlsx';
import { sequelize, State, City, Pincode, ProductGroup, ProductModel, SparePart, ProductMaster, SpareRequest, SpareRequestItem, ComplaintRegistration, Customer } from '../models/index.js';
import { Op } from 'sequelize';

// Helper functions
export function normalizeRow(raw) {
  const out = {};
  for (const k of Object.keys(raw || {})) {
    out[k.trim().toLowerCase()] = raw[k];
  }
  return out;
}

function pickFirst(...vals) {
  for (const v of vals) {
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return null;
}

function excelSerialToJSDate(serial) {
  const n = Number(serial);
  if (isNaN(n)) return null;
  return new Date((n - 25569) * 86400 * 1000);
}

function parsePossibleId(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number' && !isNaN(v)) return Number.isInteger(v) ? v : Math.trunc(v);
  const s = String(v).trim();
  if (s === '') return null;
  const clean = s.replace(/\.0+$/, '');
  const n = Number(clean);
  if (!isNaN(n)) return Number.isInteger(n) ? n : Math.trunc(n);
  return null;
}

const typeMap = {
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

// Upload master data from Excel
export async function uploadMasterData(file, type, mode) {
  try {
    const workbook = xlsx.readFile(file.path);
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) throw new Error("Excel has no sheets");
    const sheet = workbook.Sheets[sheetName];
    const rawRows = xlsx.utils.sheet_to_json(sheet, { defval: null });

    const rows = rawRows.map(r => ({ raw: r, norm: normalizeRow(r) }));
    const preview = rawRows.slice(0, 10);

    let uploadedCount = 0;
    let deletedCount = 0;
    const errors = [];

    const rawType = (type || "").toString().trim().toLowerCase();
    const mappedType = typeMap[rawType] || rawType;

    // Process based on type
    if (mappedType === "model") {
      uploadedCount = await uploadProductModels(rows, mode, errors, deletedCount);
    } else if (mappedType === "sparepart") {
      uploadedCount = await uploadSpareParts(rows, mode, errors, deletedCount);
    } else if (mappedType === "pincode") {
      const result = await uploadPincodes(rows, mode, errors, deletedCount);
      uploadedCount = result.uploadedCount;
      deletedCount = result.deletedCount;
    } else if (mappedType === "productgroup") {
      const result = await uploadProductGroups(rows, mode, errors, deletedCount);
      uploadedCount = result.uploadedCount;
      deletedCount = result.deletedCount;
    } else if (mappedType === "state") {
      uploadedCount = await uploadStates(rows, mode, errors, deletedCount);
    } else if (mappedType === "city") {
      const result = await uploadCities(rows, mode, errors, deletedCount);
      uploadedCount = result.uploadedCount;
      deletedCount = result.deletedCount;
    } else if (mappedType === "product") {
      uploadedCount = await uploadProducts(rows, mode, errors, deletedCount);
    } else {
      throw new Error(`Unsupported type: ${mappedType}`);
    }

    // Clean up file
    try { fs.unlinkSync(file.path); } catch (e) { }

    return {
      processed: rows.length,
      uploaded: uploadedCount,
      deleted: deletedCount,
      errors,
      mode,
      preview
    };
  } catch (error) {
    try { fs.unlinkSync(file.path); } catch (e) { }
    console.error("Upload error:", error);
    throw error;
  }
}

async function uploadProductModels(rows, mode, errors, deletedCount) {
  const CHUNK = 500;
  if (mode === "replace") {
    try {
      await sequelize.query(`TRUNCATE TABLE ${ProductModel.getTableName()}`);
    } catch (e) {
      const cnt = await ProductModel.destroy({ where: {} });
      deletedCount = typeof cnt === "number" ? cnt : deletedCount;
    }
  }

  let uploadedCount = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const t = await sequelize.transaction();
    let committed = false;
    try {
      const tableName = ProductModel.getTableName();
      const hasExplicitId = chunk.some(({ raw, norm }) => {
        const excelId = pickFirst(norm["id"], norm["Id"], raw["Id"], raw["ID"]);
        return excelId !== null && excelId !== undefined && String(excelId).trim() !== "";
      });
      if (hasExplicitId) {
        try {
          await sequelize.query(`SET IDENTITY_INSERT dbo.${tableName} ON`, { transaction: t });
        } catch (ieErr) {
          console.warn('Failed to enable IDENTITY_INSERT:', ieErr && ieErr.message);
        }
      }

      for (let j = 0; j < chunk.length; j++) {
        const idx = i + j;
        const { raw, norm } = chunk[j];

        const excelId = pickFirst(norm["id"], norm["Id"], raw["Id"], raw["ID"]);
        const brand = pickFirst(norm["brand"]);
        const product = pickFirst(norm["product"]);
        const modelCode = pickFirst(norm["model_code"], norm["modelcode"], norm["model_code "], norm["model"]);
        const modelDesc = pickFirst(norm["model_description"], norm["modeldescription"], norm["model_desc"], norm["description"]);
        const priceRaw = pickFirst(norm["price"]);
        const price = priceRaw !== null ? (priceRaw === "" ? null : Number(priceRaw)) : null;
        const serializedFlag = pickFirst(norm["serialized_flag"], norm["serialized_flag "], norm["serialized_flag"]);
        const warrantyRaw = pickFirst(norm["warranty_in_months"], norm["warranty_in_month"]);
        const warranty = warrantyRaw !== null && warrantyRaw !== undefined && warrantyRaw !== "" ? Number(warrantyRaw) : null;
        let validFromRaw = pickFirst(norm["valid_from"], norm["validfrom"]);
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
          errors.push({ row: idx + 2, reason: "Missing MODEL_CODE", raw });
          continue;
        }

        try {
          const existing = await ProductModel.findOne({ where: { MODEL_CODE: String(modelCode).trim() }, transaction: t });
          const payload = {
            BRAND: brand ? String(brand).trim() : null,
            PRODUCT: product ? String(product).trim() : null,
            MODEL_CODE: String(modelCode).trim(),
            MODEL_DESCRIPTION: modelDesc ? String(modelDesc).trim() : null,
            PRICE: price !== null && !isNaN(price) ? price : null,
            SERIALIZED_FLAG: serializedFlag ? String(serializedFlag).trim() : null,
            WARRANTY_IN_MONTHS: warranty !== null && !isNaN(warranty) ? warranty : null,
            VALID_FROM: validFrom || null
          };

          if (excelId !== null && excelId !== undefined && String(excelId).trim() !== "") {
            payload.Id = isNaN(Number(excelId)) ? excelId : Number(excelId);
          }

          if (existing) {
            await existing.update(payload, { transaction: t });
          } else {
            if (payload.Id === undefined) delete payload.Id;
            await ProductModel.create(payload, { transaction: t });
          }
          uploadedCount++;
        } catch (upErr) {
          errors.push({ row: idx + 2, reason: upErr.message || String(upErr), raw });
        }
      }

      if (hasExplicitId) {
        try {
          await sequelize.query(`SET IDENTITY_INSERT dbo.${tableName} OFF`, { transaction: t });
        } catch (ieErr) {
          console.warn('Failed to disable IDENTITY_INSERT:', ieErr && ieErr.message);
        }
      }

      await t.commit();
      committed = true;
    } catch (chunkErr) {
      try { if (!committed) await t.rollback(); } catch (rbErr) { console.error("Rollback failed:", rbErr.message); }
      errors.push({ row: `chunk ${i / CHUNK + 1}`, reason: chunkErr.message || String(chunkErr) });
      console.error("Chunk error:", chunkErr);
    }
  }
  return uploadedCount;
}

async function uploadSpareParts(rows, mode, errors, deletedCount) {
  const CHUNK = 500;
  if (mode === "replace") {
    try {
      await sequelize.query(`TRUNCATE TABLE ${SparePart.getTableName()}`);
    } catch (e) {
      const cnt = await SparePart.destroy({ where: {} });
      deletedCount = typeof cnt === "number" ? cnt : deletedCount;
    }
  }

  let uploadedCount = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const t = await sequelize.transaction();
    let committed = false;
    try {
      const tableName = SparePart.getTableName();
      const hasExplicitId = chunk.some(({ raw, norm }) => {
        const excelId = pickFirst(norm["id"], norm["Id"], raw["Id"], raw["ID"]);
        return excelId !== null && excelId !== undefined && String(excelId).trim() !== "";
      });
      if (hasExplicitId) {
        try {
          await sequelize.query(`SET IDENTITY_INSERT dbo.${tableName} ON`, { transaction: t });
        } catch (ieErr) {
          console.warn('Failed to enable IDENTITY_INSERT:', ieErr && ieErr.message);
        }
      }

      for (let j = 0; j < chunk.length; j++) {
        const idx = i + j;
        const { raw, norm } = chunk[j];

        const excelId = pickFirst(norm["id"], norm["Id"], raw["Id"], raw["ID"]);
        const brand = pickFirst(norm["brand"], norm["brnd"]);
        const part = pickFirst(norm["part"], norm["name"], norm["value"], norm["part_number"], norm["partno"]);
        const description = pickFirst(norm["description"], norm["descr"]);
        const modelId = pickFirst(norm["modelid"], norm["model_id"], norm["productmodelid"], norm["product_model_id"]);
        const mappedModel = pickFirst(norm["mapped_model"], norm["mappedmodel"], norm["mapped_model "]);
        const modelDescription = pickFirst(norm["model_description"], norm["modeldescription"]);
        const maxUsed = pickFirst(norm["max_used_qty"], norm["maxusedqty"], norm["max_used"]);
        const serviceLevel = pickFirst(norm["service_level"], norm["servicelevel"]);
        const partLocation = pickFirst(norm["part_location"], norm["partlocation"]);
        const status = pickFirst(norm["status"]);

        if (!part && !mappedModel) {
          errors.push({ row: idx + 2, reason: "Missing PART or MAPPED_MODEL", raw });
          continue;
        }

        try {
          const where = {};
          if (brand) where.BRAND = String(brand).trim();
          if (part) where.PART = String(part).trim();
          let existing = null;
          if (where.PART) {
            existing = await SparePart.findOne({ where, transaction: t });
          }
          if (!existing && mappedModel && part) {
            existing = await SparePart.findOne({ where: { MAPPED_MODEL: String(mappedModel).trim(), PART: String(part).trim() }, transaction: t });
          }

          const payload = {
            BRAND: brand ? String(brand).trim() : null,
            PART: part ? String(part).trim() : null,
            DESCRIPTION: description ? String(description).trim() : null,
            MAPPED_MODEL: mappedModel ? String(mappedModel).trim() : null,
            MODEL_DESCRIPTION: modelDescription ? String(modelDescription).trim() : null,
            MAX_USED_QTY: maxUsed !== null && maxUsed !== undefined && maxUsed !== "" ? Number(maxUsed) : null,
            SERVICE_LEVEL: serviceLevel ? String(serviceLevel).trim() : null,
            PART_LOCATION: partLocation ? String(partLocation).trim() : null,
            STATUS: status ? String(status).trim() : null,
            ModelID: modelId ? Number(modelId) : null
          };

          if (excelId !== null && excelId !== undefined && String(excelId).trim() !== "") {
            payload.Id = isNaN(Number(excelId)) ? excelId : Number(excelId);
          }

          if (existing) {
            await existing.update(payload, { transaction: t });
          } else {
            if (payload.Id === undefined) delete payload.Id;
            await SparePart.create(payload, { transaction: t });
          }
          uploadedCount++;
        } catch (upErr) {
          errors.push({ row: idx + 2, reason: upErr.message || String(upErr), raw });
        }
      }

      if (hasExplicitId) {
        try {
          await sequelize.query(`SET IDENTITY_INSERT dbo.${tableName} OFF`, { transaction: t });
        } catch (ieErr) {
          console.warn('Failed to disable IDENTITY_INSERT:', ieErr && ieErr.message);
        }
      }

      await t.commit();
      committed = true;
    } catch (chunkErr) {
      try { if (!committed) await t.rollback(); } catch (rbErr) { console.error("Rollback failed:", rbErr.message); }
      errors.push({ row: `chunk ${i / CHUNK + 1}`, reason: chunkErr.message || String(chunkErr) });
      console.error("Chunk error (sparepart):", chunkErr);
    }
  }
  return uploadedCount;
}

async function uploadPincodes(rows, mode, errors, deletedCount) {
  const CHUNK = 500;
  if (mode === "replace") {
    try {
      await sequelize.query(`TRUNCATE TABLE ${Pincode.getTableName()}`);
    } catch (e) {
      const cnt = await Pincode.destroy({ where: {} });
      deletedCount = typeof cnt === "number" ? cnt : deletedCount;
    }
  }

  let uploadedCount = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const t = await sequelize.transaction();
    let committed = false;
    try {
      for (let j = 0; j < chunk.length; j++) {
        const idx = i + j;
        const { raw, norm } = chunk[j];

        const excelId = pickFirst(norm["id"], norm["Id"], raw["Id"], raw["ID"]);
        const value = pickFirst(norm["value"], norm["pincode"], norm["pin"], raw["VALUE"], raw["Pincode"], raw["PINCODE"]);
        const description = pickFirst(norm["description"], norm["descr"], raw["DESCRIPTION"], raw["Description"]) || value;
        const cityId = pickFirst(norm["city_id"], norm["cityid"], norm["city"], raw["City_ID"], raw["CityId"]);

        if (!value || !cityId) {
          errors.push({ row: idx + 2, reason: "Missing PINCODE or City_ID", raw });
          continue;
        }

        try {
          let cityRecord = null;
          const parsedCityId = Number(cityId);
          if (!isNaN(parsedCityId)) {
            cityRecord = await City.findOne({ where: { Id: parsedCityId }, transaction: t });
          }
          if (!cityRecord) {
            cityRecord = await City.findOne({ where: { Value: String(cityId).trim() }, transaction: t });
          }
          if (!cityRecord) {
            try {
              cityRecord = await City.create({ Value: String(cityId).trim(), Description: null, StateId: null }, { transaction: t });
              errors.push({ row: idx + 2, info: `Created City record with Id ${cityRecord.Id} for incoming City_ID ${cityId}` });
            } catch (cityCreateErr) {
              errors.push({ row: idx + 2, reason: `Missing City ${cityId} and failed to create: ${cityCreateErr.message}`, raw });
              continue;
            }
          }

          let existing = null;
          if (excelId) {
            existing = await Pincode.findOne({ where: { Id: isNaN(Number(excelId)) ? excelId : Number(excelId) }, transaction: t });
          }
          if (!existing) {
            existing = await Pincode.findOne({ where: { VALUE: String(value).trim() }, transaction: t });
          }

          const payload = {
            VALUE: String(value).trim(),
            DESCRIPTION: description ? String(description).trim() : null,
            City_ID: cityRecord.Id
          };

          if (excelId) {
            payload.Id = isNaN(Number(excelId)) ? excelId : Number(excelId);
          }

          if (existing) {
            await existing.update(payload, { transaction: t });
          } else {
            if (payload.Id === undefined) delete payload.Id;
            await Pincode.create(payload, { transaction: t });
          }
          uploadedCount++;
        } catch (upErr) {
          errors.push({ row: idx + 2, reason: upErr.message || String(upErr), raw });
        }
      }

      await t.commit();
      committed = true;
    } catch (chunkErr) {
      try { if (!committed) await t.rollback(); } catch (rbErr) { console.error("Rollback failed:", rbErr.message); }
      errors.push({ row: `chunk ${i / CHUNK + 1}`, reason: chunkErr.message || String(chunkErr) });
      console.error("Chunk error (pincode):", chunkErr);
    }
  }
  return { uploadedCount, deletedCount };
}

async function uploadStates(rows, mode, errors, deletedCount) {
  const CHUNK = 500;
  if (mode === "replace") {
    try {
      await sequelize.query(`TRUNCATE TABLE ${State.getTableName()}`);
    } catch (e) {
      const cnt = await State.destroy({ where: {} });
      deletedCount = typeof cnt === "number" ? cnt : deletedCount;
    }
  }

  let uploadedCount = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const t = await sequelize.transaction();
    let committed = false;
    try {
      const tableName = State.getTableName();
      const hasExplicitId = chunk.some(({ raw, norm }) => {
        const excelId = pickFirst(norm["id"], norm["Id"], raw["Id"], raw["ID"]);
        return excelId !== null && excelId !== undefined && String(excelId).trim() !== "";
      });
      if (hasExplicitId) {
        try {
          await sequelize.query(`SET IDENTITY_INSERT dbo.${tableName} ON`, { transaction: t });
        } catch (ieErr) {
          console.warn('Failed to enable IDENTITY_INSERT:', ieErr.message);
        }
      }

      for (let j = 0; j < chunk.length; j++) {
        const idx = i + j;
        const { raw, norm } = chunk[j];
        const excelId = pickFirst(norm["id"], norm["Id"], raw["Id"], raw["ID"]);
        const value = pickFirst(norm["value"], norm["state"], norm["statecode"], raw["VALUE"], raw["State"], raw["statecode"]);
        const description = pickFirst(norm["description"], norm["statename"], norm["name"], raw["DESCRIPTION"], raw["StateName"]) || value;

        if (!value) {
          errors.push({ row: idx + 2, reason: "Missing VALUE / state code", raw });
          continue;
        }

        try {
          const existing = await State.findOne({ where: { VALUE: String(value).trim() }, transaction: t });
          const payload = {
            VALUE: String(value).trim(),
            DESCRIPTION: description ? String(description).trim() : null
          };

          if (excelId !== null && excelId !== undefined && String(excelId).trim() !== "") {
            payload.Id = isNaN(Number(excelId)) ? excelId : Number(excelId);
          }

          if (existing) {
            await existing.update(payload, { transaction: t });
          } else {
            if (payload.Id === undefined) delete payload.Id;
            await State.create(payload, { transaction: t });
          }
          uploadedCount++;
        } catch (upErr) {
          errors.push({ row: idx + 2, reason: upErr.message || String(upErr), raw });
        }
      }

      if (hasExplicitId) {
        try {
          await sequelize.query(`SET IDENTITY_INSERT dbo.${tableName} OFF`, { transaction: t });
        } catch (ieErr) {
          console.warn('Failed to disable IDENTITY_INSERT:', ieErr.message);
        }
      }

      await t.commit();
      committed = true;
    } catch (chunkErr) {
      try { if (!committed) await t.rollback(); } catch (rbErr) { console.error("Rollback failed:", rbErr.message); }
      errors.push({ row: `chunk ${i / CHUNK + 1}`, reason: chunkErr.message || String(chunkErr) });
      console.error("Chunk error (state):", chunkErr);
    }
  }
  return uploadedCount;
}

async function uploadCities(rows, mode, errors, deletedCount) {
  const CHUNK = 500;
  if (mode === "replace") {
    try {
      await sequelize.query(`TRUNCATE TABLE ${City.getTableName()}`);
    } catch (e) {
      const cnt = await City.destroy({ where: {} });
      deletedCount = typeof cnt === "number" ? cnt : deletedCount;
    }
  }

  let uploadedCount = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const t = await sequelize.transaction();
    let committed = false;
    try {
      const tableName = City.getTableName();
      const hasExplicitId = chunk.some(({ raw, norm }) => {
        const excelId = pickFirst(norm["id"], norm["Id"], raw["Id"], raw["ID"]);
        return excelId !== null && excelId !== undefined && String(excelId).trim() !== "";
      });
      if (hasExplicitId) {
        try {
          await sequelize.query(`SET IDENTITY_INSERT dbo.${tableName} ON`, { transaction: t });
        } catch (ieErr) {
          console.warn('Failed to enable IDENTITY_INSERT:', ieErr.message);
        }
      }

      for (let j = 0; j < chunk.length; j++) {
        const idx = i + j;
        const { raw, norm } = chunk[j];
        const excelId = pickFirst(norm["id"], norm["Id"], raw["Id"], raw["ID"]);
        const value = pickFirst(norm["value"], norm["city"], norm["cityname"], raw["Value"], raw["City"], raw["cityname"]);
        const description = pickFirst(norm["description"], norm["citydescription"], norm["name"], raw["Description"], raw["CityDescription"]) || value;
        const stateName = pickFirst(norm["state"], norm["statename"], norm["parent"], norm["parent_description"], raw["State"], raw["StateName"], raw["Parent"], raw["PARENT_DESCRIPTION"]);
        const stateIdFromExcel = pickFirst(norm["parent_id"], norm["parentid"], raw["PARENT_ID"]);

        if (!value) {
          errors.push({ row: idx + 2, reason: "Missing VALUE / city name", raw });
          continue;
        }

        let stateId = stateIdFromExcel ? Number(stateIdFromExcel) : null;
        if (!stateId && stateName) {
          const state = await State.findOne({ where: { VALUE: String(stateName).trim() }, transaction: t });
          if (state) stateId = state.Id;
        }

        try {
          const existing = await City.findOne({ where: { Value: String(value).trim() }, transaction: t });
          const payload = {
            Value: String(value).trim(),
            Description: description ? String(description).trim() : null,
            StateId: stateId,
            StateName: stateName ? String(stateName).trim() : null
          };

          if (excelId !== null && excelId !== undefined && String(excelId).trim() !== "") {
            payload.Id = isNaN(Number(excelId)) ? excelId : Number(excelId);
          }

          if (existing) {
            await existing.update(payload, { transaction: t });
          } else {
            if (payload.Id === undefined) delete payload.Id;
            await City.create(payload, { transaction: t });
          }
          uploadedCount++;
        } catch (upErr) {
          errors.push({ row: idx + 2, reason: upErr.message || String(upErr), raw });
        }
      }

      if (hasExplicitId) {
        try {
          await sequelize.query(`SET IDENTITY_INSERT dbo.${tableName} OFF`, { transaction: t });
        } catch (ieErr) {
          console.warn('Failed to disable IDENTITY_INSERT:', ieErr.message);
        }
      }

      await t.commit();
      committed = true;
    } catch (chunkErr) {
      try { if (!committed) await t.rollback(); } catch (rbErr) { console.error("Rollback failed:", rbErr.message); }
      errors.push({ row: `chunk ${i / CHUNK + 1}`, reason: chunkErr.message || String(chunkErr) });
      console.error("Chunk error (city):", chunkErr);
    }
  }
  return { uploadedCount, deletedCount };
}

async function uploadProducts(rows, mode, errors, deletedCount) {
  const CHUNK = 500;
  if (mode === "replace") {
    try {
      await sequelize.query(`TRUNCATE TABLE ${ProductMaster.getTableName()}`);
    } catch (e) {
      const cnt = await ProductMaster.destroy({ where: {} });
      deletedCount = typeof cnt === "number" ? cnt : deletedCount;
    }
  }

  let uploadedCount = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const t = await sequelize.transaction();
    let committed = false;
    try {
      for (let j = 0; j < chunk.length; j++) {
        const idx = i + j;
        const { raw, norm } = chunk[j];
        const value = pickFirst(norm["value"], norm["product"], norm["productcode"], raw["VALUE"], raw["Product"], raw["productcode"]);
        const description = pickFirst(norm["description"], norm["productname"], norm["name"], raw["DESCRIPTION"], raw["ProductName"]) || value;
        const groupName = pickFirst(norm["group"], norm["productgroup"], norm["groupname"], raw["Group"], raw["ProductGroup"], raw["groupname"]);

        if (!value) {
          errors.push({ row: idx + 2, reason: "Missing VALUE / product code", raw });
          continue;
        }

        let groupId = null;
        if (groupName) {
          const group = await ProductGroup.findOne({ where: { VALUE: String(groupName).trim() }, transaction: t });
          if (group) groupId = group.Id;
        }

        try {
          const existing = await ProductMaster.findOne({ where: { VALUE: String(value).trim() }, transaction: t });
          const payload = {
            VALUE: String(value).trim(),
            DESCRIPTION: description ? String(description).trim() : null,
            ProductGroupID: groupId
          };

          if (existing) {
            await existing.update(payload, { transaction: t });
          } else {
            await ProductMaster.create(payload, { transaction: t });
          }
          uploadedCount++;
        } catch (upErr) {
          errors.push({ row: idx + 2, reason: upErr.message || String(upErr), raw });
        }
      }

      await t.commit();
      committed = true;
    } catch (chunkErr) {
      try { if (!committed) await t.rollback(); } catch (rbErr) { console.error("Rollback failed:", rbErr.message); }
      errors.push({ row: `chunk ${i / CHUNK + 1}`, reason: chunkErr.message || String(chunkErr) });
      console.error("Chunk error (product):", chunkErr);
    }
  }
  return uploadedCount;
}

async function uploadProductGroups(rows, mode, errors, deletedCount) {
  const CHUNK = 500;
  if (mode === "replace") {
    try {
      await sequelize.query(`TRUNCATE TABLE ${ProductGroup.getTableName()}`);
    } catch (e) {
      const cnt = await ProductGroup.destroy({ where: {} });
      deletedCount = typeof cnt === "number" ? cnt : deletedCount;
    }
  }

  let uploadedCount = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const t = await sequelize.transaction();
    let committed = false;
    try {
      const tableName = ProductGroup.getTableName();
      const hasExplicitId = chunk.some(({ raw, norm }) => {
        const excelId = pickFirst(norm["id"], norm["Id"], raw["Id"], raw["ID"]);
        return excelId !== null && excelId !== undefined && String(excelId).trim() !== "";
      });
      if (hasExplicitId) {
        try {
          await sequelize.query(`SET IDENTITY_INSERT dbo.${tableName} ON`, { transaction: t });
        } catch (ieErr) {
          console.warn('Failed to enable IDENTITY_INSERT:', ieErr.message);
        }
      }

      for (let j = 0; j < chunk.length; j++) {
        const idx = i + j;
        const { raw, norm } = chunk[j];
        const excelId = pickFirst(norm["id"], norm["Id"], raw["Id"], raw["ID"]);
        const value = pickFirst(norm["value"], norm["groupcode"], norm["group_code"], raw["VALUE"], raw["GroupCode"], raw["groupcode"]);
        const description = pickFirst(norm["description"], norm["groupname"], norm["name"], raw["DESCRIPTION"], raw["GroupName"]) || value;

        if (!value) {
          errors.push({ row: idx + 2, reason: "Missing VALUE / group code", raw });
          continue;
        }

        try {
          const existing = await ProductGroup.findOne({ where: { VALUE: String(value).trim() }, transaction: t });
          const payload = {
            VALUE: String(value).trim(),
            DESCRIPTION: description ? String(description).trim() : null
          };

          if (excelId !== null && excelId !== undefined && String(excelId).trim() !== "") {
            payload.Id = isNaN(Number(excelId)) ? excelId : Number(excelId);
          }

          if (existing) {
            await existing.update(payload, { transaction: t });
          } else {
            if (payload.Id === undefined) delete payload.Id;
            await ProductGroup.create(payload, { transaction: t });
          }
          uploadedCount++;
        } catch (upErr) {
          errors.push({ row: idx + 2, reason: upErr.message || String(upErr), raw });
        }
      }

      if (hasExplicitId) {
        try {
          await sequelize.query(`SET IDENTITY_INSERT dbo.${tableName} OFF`, { transaction: t });
        } catch (ieErr) {
          console.warn('Failed to disable IDENTITY_INSERT:', ieErr.message);
        }
      }

      await t.commit();
      committed = true;
    } catch (chunkErr) {
      try { if (!committed) await t.rollback(); } catch (rbErr) { console.error("Rollback failed:", rbErr.message); }
      errors.push({ row: `chunk ${i / CHUNK + 1}`, reason: chunkErr.message || String(chunkErr) });
      console.error("Chunk error (productgroup):", chunkErr);
    }
  }
  return { uploadedCount, deletedCount };
}

// Get master data
export async function getMasterDataByType(type, filters = {}) {
  try {
    const requested = (type || '').toString().trim().toLowerCase();
    const mappedType = typeMap[requested] || requested;

    const map = {
      state: async () => {
        if (!State) throw new Error('State model not loaded');
        return await State.findAll({ order: [["VALUE", "ASC"]] });
      },
      city: async () => {
        if (!City) throw new Error('City model not loaded');
        return await City.findAll({
          where: filters.stateId ? { StateId: Number(filters.stateId) } : {},
          order: [["Value", "ASC"]],
        });
      },
      pincode: async () => {
        if (!Pincode) throw new Error('Pincode model not loaded');
        return await Pincode.findAll({
          where: filters.cityId ? { City_ID: Number(filters.cityId) } : {},
          order: [["VALUE", "ASC"]],
          raw: true,
        });
      },
      productgroup: async () => {
        if (!ProductGroup) throw new Error('ProductGroup model not loaded');
        return await ProductGroup.findAll({ order: [["VALUE", "ASC"]] });
      },
      product: async () => {
        if (!ProductMaster) throw new Error('ProductMaster model not loaded');
        return await ProductMaster.findAll({ order: [["VALUE", "ASC"]] });
      },
      model: async () => {
        if (!ProductModel) throw new Error('ProductModel model not loaded');
        return await ProductModel.findAll({
          where: filters.productId ? { Product: filters.productId } : {},
          order: [["MODEL_CODE", "ASC"]],
          raw: true
        });
      },
      sparepart: async () => {
        if (!SparePart) throw new Error('SparePart model not loaded');
        return await SparePart.findAll({
          where: filters.modelId ? { MAPPED_MODEL: filters.modelId } : {},
          order: [["PART", "ASC"]]
        });
      },
    };

    const key = mappedType;
    if (!map[key]) throw new Error(`Invalid type: ${type}`);

    return await map[key]();
  } catch (error) {
    console.error("getMasterDataByType error for type", type, ":", error);
    throw error;
  }
}

// Get models list
export async function getProductModels() {
  try {
    const rows = await ProductModel.findAll({ order: [["MODEL_CODE", "ASC"]], limit: 1000 });
    return rows;
  } catch (error) {
    throw error;
  }
}

// CRUD operations for master data
function resolveModelFromTypeParam(typeParam) {
  if (!typeParam) return null;
  const mapped = typeMap[typeParam.toLowerCase()] || typeParam.toLowerCase();
  const map = {
    state: State,
    city: City,
    pincode: Pincode,
    productgroup: ProductGroup,
    model: ProductModel,
    sparepart: SparePart,
    product: ProductMaster,
  };
  return map[mapped];
}

export async function createMasterData(type, payload) {
  try {
    const model = resolveModelFromTypeParam(type);
    if (!model) throw new Error('Unknown type');
    const created = await model.create(payload);
    return created;
  } catch (error) {
    throw error;
  }
}

export async function updateMasterData(type, id, payload) {
  try {
    const model = resolveModelFromTypeParam(type);
    if (!model) throw new Error('Unknown type');

    const pk = (model.primaryKeyAttributes && model.primaryKeyAttributes[0]) || 'Id';
    const where = {};
    where[pk] = isNaN(Number(id)) ? id : Number(id);

    const [affected] = await model.update(payload, { where });
    if (!affected) throw new Error('Record not found');
    const updated = await model.findOne({ where });
    return updated;
  } catch (error) {
    throw error;
  }
}

export async function deleteMasterData(type, id) {
  try {
    const model = resolveModelFromTypeParam(type);
    if (!model) throw new Error('Unknown type');
    const pk = (model.primaryKeyAttributes && model.primaryKeyAttributes[0]) || 'Id';
    const where = {};
    where[pk] = isNaN(Number(id)) ? id : Number(id);
    const d = await model.destroy({ where });
    if (!d) throw new Error('Record not found or already deleted');
    return d;
  } catch (error) {
    throw error;
  }
}

// Assign service centers to branches
export async function assignServiceCentersToBranches(assignments) {
  try {
    const { ServiceCentre } = await import('../models/index.js');
    let updated = 0;
    for (const a of assignments) {
      const scId = a.serviceCenterId || a.scId || a.ServiceCenterId;
      const brId = a.branchId || a.BranchId || a.branch;
      if (!scId || !brId) continue;
      try {
        const [cnt] = await ServiceCentre.update({ BranchId: brId }, { where: { Id: scId } });
        if (cnt) updated++;
      } catch (e) {
        console.error('Assignment update failed for', scId, e.message);
      }
    }
    return { updated };
  } catch (error) {
    throw error;
  }
}

// Search master data
export async function searchMasterData(type, q) {
  try {
    const requested = (type || '').toString().trim().toLowerCase();
    const mappedType = typeMap[requested] || requested;

    let whereClause = {};
    if (q && q.trim()) {
      whereClause.VALUE = { [Op.like]: `%${q.trim()}%` };
    }

    const models = {
      state: State,
      city: City,
      pincode: Pincode,
      productgroup: ProductGroup,
      product: ProductMaster,
      model: ProductModel,
      sparepart: SparePart,
    };

    const Model = models[mappedType];
    if (!Model) throw new Error('Invalid type');

    const rows = await Model.findAll({
      where: whereClause,
      order: [['VALUE', 'ASC']],
      limit: 100
    });

    return rows;
  } catch (error) {
    throw error;
  }
}

// Get replacement history
export async function getReplacementHistory(filters = {}) {
  try {
    const { startDate, endDate, callId, status, requestedBy, page = 1, limit = 10 } = filters;

    const whereClause = { RequestType: 'replacement' };

    if (startDate && endDate) {
      whereClause.CreatedAt = { [Op.between]: [new Date(startDate), new Date(endDate)] };
    }

    if (status) {
      whereClause.Status = status;
    }

    if (callId) {
      whereClause.Notes = { [Op.like]: `%Call ID: ${callId}%` };
    }

    if (requestedBy) {
      whereClause.Notes = { ...whereClause.Notes, [Op.like]: `%Requested By: ${requestedBy}%` };
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await SpareRequest.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: SpareRequestItem,
          as: 'spareRequestItems',
          required: false
        },
        {
          model: ComplaintRegistration,
          as: 'complaint',
          required: false,
          include: [
            {
              model: Customer,
              as: 'customer',
              required: false
            }
          ]
        }
      ],
      order: [['CreatedAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const transformedRows = rows.map(request => {
      const notes = request.Notes || '';
      const callIdMatch = notes.match(/Call ID: ([^\.]+)/);
      const requestedByMatch = notes.match(/Requested By: ([^\.]+)/);
      const serialNoMatch = notes.match(/Serial No: ([^\.]+)/);
      const replacementReasonMatch = notes.match(/Replacement Reason: ([^\.]+)/);

      return {
        id: request.Id,
        callId: callIdMatch ? callIdMatch[1] : '',
        requestNumber: request.RequestNumber,
        status: request.Status,
        createdAt: request.CreatedAt,
        requestedBy: requestedByMatch ? requestedByMatch[1] : '',
        customer: request.complaint?.customer ? {
          name: request.complaint.customer.Name,
          mobile: request.complaint.customer.MobileNo
        } : null,
        product: {
          serialNo: serialNoMatch ? serialNoMatch[1] : '',
        },
        replacement: {
          reason: replacementReasonMatch ? replacementReasonMatch[1] : '',
          items: request.spareRequestItems?.map(item => ({
            sku: item.Sku,
            name: item.SpareName,
            requestedQty: item.RequestedQty,
            receivedQty: item.ReceivedQty,
            approvedQty: item.ApprovedQty
          })) || []
        }
      };
    });

    return {
      data: transformedRows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    };
  } catch (error) {
    throw error;
  }
}
