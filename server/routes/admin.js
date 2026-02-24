// Admin Routes
import express from "express";
import multer from "multer";
import xlsx from "xlsx";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

import {
  sequelize,
  State,
  City,
  Pincode,
  ProductGroup,
  ProductModel,
  ProductMaster,
  SparePart,
  Product,
  SpareRequest,
  SpareRequestItem,
  // ComplaintRegistration,
  Customer
} from "../models/index.js";
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { Op } from 'sequelize';
import * as uploadService from "../services/adminUploadService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const diskUpload = multer({ dest: uploadDir, limits: { fileSize: 50 * 1024 * 1024 } });
const memoryUpload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

/* ==================== UPLOAD MASTER ROUTE ==================== */
router.post("/upload-master", diskUpload.single("file"), async (req, res) => {
  const file = req.file;
  const rawType = (req.body?.type || "").toString().trim().toLowerCase();
  const mode = (req.query?.mode || "append").toString().toLowerCase();
  const mappedType = uploadService.typeMap[rawType] || rawType;

  if (!file) return res.status(400).json({ message: "No file uploaded" });

  // console.log(`/api/admin/upload-master called -> type=${rawType} -> mapped=${mappedType} mode=${mode}`);

  try {
    const workbook = xlsx.readFile(file.path);
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) throw new Error("Excel has no sheets");
    const sheet = workbook.Sheets[sheetName];
    const rawRows = xlsx.utils.sheet_to_json(sheet, { defval: null });

    const rows = rawRows.map(r => ({ raw: r, norm: uploadService.normalizeRow(r) }));
    const preview = rawRows.slice(0, 10);

    let uploadedCount = 0;
    let deletedCount = 0;
    const errors = [];

    async function uploadProductModels(rowsToProcess) {
      const CHUNK = 500;
      if (mode === "replace") {
        try {
          await sequelize.query(`TRUNCATE TABLE ${ProductModel.getTableName()}`);
        } catch (e) {
          const cnt = await ProductModel.destroy({ where: {} });
          deletedCount = typeof cnt === "number" ? cnt : deletedCount;
        }
      }

      for (let i = 0; i < rowsToProcess.length; i += CHUNK) {
        const chunk = rowsToProcess.slice(i, i + CHUNK);
        const t = await sequelize.transaction();
        let committed = false;
        try {
          const tableName = ProductModel.getTableName();
          const hasExplicitId = chunk.some(({ raw, norm }) => {
            const excelId = uploadService.pickFirst(norm["id"], norm["Id"], raw["Id"], raw["ID"]);
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

            const excelId = uploadService.pickFirst(norm["id"], norm["Id"], raw["Id"], raw["ID"]);
            const brand = uploadService.pickFirst(norm["brand"]);
            const product = uploadService.pickFirst(norm["product"]);
            const modelCode = uploadService.pickFirst(norm["model_code"], norm["modelcode"], norm["model_code "], norm["model"]);
            const modelDesc = uploadService.pickFirst(norm["model_description"], norm["modeldescription"], norm["model_desc"], norm["description"]);
            const priceRaw = uploadService.pickFirst(norm["price"]);
            const price = priceRaw !== null ? (priceRaw === "" ? null : Number(priceRaw)) : null;
            const serializedFlag = uploadService.pickFirst(norm["serialized_flag"], norm["serialized_flag "], norm["serialized_flag"]);
            const warrantyRaw = uploadService.pickFirst(norm["warranty_in_months"], norm["warranty_in_month"]);
            const warranty = warrantyRaw !== null && warrantyRaw !== undefined && warrantyRaw !== "" ? Number(warrantyRaw) : null;
            let validFromRaw = uploadService.pickFirst(norm["valid_from"], norm["validfrom"]);
            let validFrom = null;
            if (validFromRaw) {
              if (validFromRaw instanceof Date) validFrom = validFromRaw;
              else {
                if (!isNaN(Number(validFromRaw)) && String(validFromRaw).length < 8) {
                  validFrom = uploadService.excelSerialToJSDate(validFromRaw);
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
              errors.push({ row: idx + 2, reason: upErr && upErr.message ? upErr.message : String(upErr), raw });
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
          try { if (!committed) await t.rollback(); } catch (rbErr) { console.error("Rollback failed:", rbErr && rbErr.message); }
          errors.push({ row: `chunk ${i / CHUNK + 1}`, reason: chunkErr && chunkErr.message ? chunkErr.message : String(chunkErr) });
          console.error("Chunk error:", chunkErr);
        }
      }
    }

    async function uploadSpareParts(rowsToProcess) {
      const CHUNK = 500;
      if (mode === "replace") {
        try {
          await sequelize.query(`TRUNCATE TABLE ${SparePart.getTableName()}`);
        } catch (e) {
          const cnt = await SparePart.destroy({ where: {} });
          deletedCount = typeof cnt === "number" ? cnt : deletedCount;
        }
      }

      for (let i = 0; i < rowsToProcess.length; i += CHUNK) {
        const chunk = rowsToProcess.slice(i, i + CHUNK);
        const t = await sequelize.transaction();
        let committed = false;
        try {
          const tableName = SparePart.getTableName();
          const hasExplicitId = chunk.some(({ raw, norm }) => {
            const excelId = uploadService.pickFirst(norm["id"], norm["Id"], raw["Id"], raw["ID"]);
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

            const excelId = uploadService.pickFirst(norm["id"], norm["Id"], raw["Id"], raw["ID"]);
            const brand = uploadService.pickFirst(norm["brand"], norm["brnd"]);
            const part = uploadService.pickFirst(norm["part"], norm["name"], norm["value"], norm["part_number"], norm["partno"]);
            const description = uploadService.pickFirst(norm["description"], norm["descr"]);
            const modelId = uploadService.pickFirst(norm["modelid"], norm["model_id"], norm["productmodelid"], norm["product_model_id"], raw && raw.ModelID, raw && raw["Model ID"]);
            const mappedModel = uploadService.pickFirst(norm["mapped_model"], norm["mappedmodel"], norm["mapped_model "]);
            const modelDescription = uploadService.pickFirst(norm["model_description"], norm["modeldescription"]);
            const maxUsed = uploadService.pickFirst(norm["max_used_qty"], norm["maxusedqty"], norm["max_used"]);
            const serviceLevel = uploadService.pickFirst(norm["service_level"], norm["servicelevel"]);
            const partLocation = uploadService.pickFirst(norm["part_location"], norm["partlocation"]);
            const status = uploadService.pickFirst(norm["status"]);
            let lastUpdatedRaw = uploadService.pickFirst(norm["last_updated_date"], norm["lastupdateddate"]);
            let lastUpdated = null;
            if (lastUpdatedRaw) {
              if (lastUpdatedRaw instanceof Date) lastUpdated = lastUpdatedRaw;
              else {
                if (!isNaN(Number(lastUpdatedRaw)) && String(lastUpdatedRaw).length < 8) lastUpdated = uploadService.excelSerialToJSDate(lastUpdatedRaw);
                else {
                  const d = new Date(lastUpdatedRaw);
                  if (!isNaN(d.getTime())) lastUpdated = d;
                }
              }
            }

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
                LAST_UPDATED_DATE: lastUpdated || null,
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
              errors.push({ row: idx + 2, reason: upErr && upErr.message ? upErr.message : String(upErr), raw });
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
          try { if (!committed) await t.rollback(); } catch (rbErr) { console.error("Rollback failed:", rbErr && rbErr.message); }
          errors.push({ row: `chunk ${i / CHUNK + 1}`, reason: chunkErr && chunkErr.message ? chunkErr.message : String(chunkErr) });
          console.error("Chunk error (sparepart):", chunkErr);
        }
      }
    }

    async function uploadPincodes(rowsToProcess) {
      const CHUNK = 500;
      if (mode === "replace") {
        try {
          await sequelize.query(`TRUNCATE TABLE ${Pincode.getTableName()}`);
        } catch (e) {
          const cnt = await Pincode.destroy({ where: {} });
          deletedCount = typeof cnt === "number" ? cnt : deletedCount;
        }
      }

      for (let i = 0; i < rowsToProcess.length; i += CHUNK) {
        const chunk = rowsToProcess.slice(i, i + CHUNK);
        const t = await sequelize.transaction();
        let committed = false;
        try {
          for (let j = 0; j < chunk.length; j++) {
            const idx = i + j;
            const { raw, norm } = chunk[j];

            const excelId = uploadService.pickFirst(norm["id"], norm["Id"], raw["Id"], raw["ID"]);
            const value = uploadService.pickFirst(norm["value"], norm["pincode"], norm["pin"], raw["VALUE"], raw["Pincode"], raw["PINCODE"]);
            const description = uploadService.pickFirst(norm["description"], norm["descr"], raw["DESCRIPTION"], raw["Description"]) || value;
            const cityId = uploadService.pickFirst(norm["city_id"], norm["cityid"], norm["city"], raw["City_ID"], raw["CityId"]);

            if (!value || !cityId) {
              errors.push({ row: idx + 2, reason: "Missing PINCODE or City_ID", raw });
              continue;
            }

            try {
              // Resolve or create the City record so FK constraint will be satisfied
              let cityRecord = null;
              const parsedCityId = Number(cityId);
              if (!isNaN(parsedCityId)) {
                cityRecord = await City.findOne({ where: { Id: parsedCityId }, transaction: t });
              }
              if (!cityRecord) {
                // try matching by City.Value
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
                Id: excelId ? (isNaN(Number(excelId)) ? excelId : Number(excelId)) : undefined,
                VALUE: String(value).trim(),
                DESCRIPTION: description ? String(description).trim() : null,
                City_ID: cityRecord.Id
              };

              if (existing) {
                await existing.update(payload, { transaction: t });
              } else {
                if (payload.Id === undefined) delete payload.Id;
                await Pincode.create(payload, { transaction: t });
              }
              uploadedCount++;
            } catch (upErr) {
              errors.push({ row: idx + 2, reason: upErr && upErr.message ? upErr.message : String(upErr), raw });
            }
          }

          await t.commit();
          committed = true;
        } catch (chunkErr) {
          try { if (!committed) await t.rollback(); } catch (rbErr) { console.error("Rollback failed:", rbErr && rbErr.message); }
          errors.push({ row: `chunk ${i / CHUNK + 1}`, reason: chunkErr && chunkErr.message ? chunkErr.message : String(chunkErr) });
          console.error("Chunk error (pincode):", chunkErr);
        }
      }
    }

    async function uploadStates(rowsToProcess) {
      const CHUNK = 500;
      if (mode === "replace") {
        try {
          await sequelize.query(`TRUNCATE TABLE ${State.getTableName()}`);
        } catch (e) {
          const cnt = await State.destroy({ where: {} });
          deletedCount = typeof cnt === "number" ? cnt : deletedCount;
        }
      }

      for (let i = 0; i < rowsToProcess.length; i += CHUNK) {
        const chunk = rowsToProcess.slice(i, i + CHUNK);
        const t = await sequelize.transaction();
        let committed = false;
        try {
          const tableName = State.getTableName();
          const hasExplicitId = chunk.some(({ raw, norm }) => {
            const excelId = uploadService.pickFirst(norm["id"], norm["Id"], raw["Id"], raw["ID"]);
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
            const excelId = uploadService.pickFirst(norm["id"], norm["Id"], raw["Id"], raw["ID"]);
            const value = uploadService.pickFirst(norm["value"], norm["state"], norm["statecode"], raw["VALUE"], raw["State"], raw["statecode"]);
            const description = uploadService.pickFirst(norm["description"], norm["statename"], norm["name"], raw["DESCRIPTION"], raw["StateName"]) || value;

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
              errors.push({ row: idx + 2, reason: upErr && upErr.message ? upErr.message : String(upErr), raw });
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
          try { if (!committed) await t.rollback(); } catch (rbErr) { console.error("Rollback failed:", rbErr && rbErr.message); }
          errors.push({ row: `chunk ${i / CHUNK + 1}`, reason: chunkErr && chunkErr.message ? chunkErr.message : String(chunkErr) });
          console.error("Chunk error (state):", chunkErr);
        }
      }
    }

    async function uploadCities(rowsToProcess) {
      const CHUNK = 500;
      if (mode === "replace") {
        try {
          await sequelize.query(`TRUNCATE TABLE ${City.getTableName()}`);
        } catch (e) {
          const cnt = await City.destroy({ where: {} });
          deletedCount = typeof cnt === "number" ? cnt : deletedCount;
        }
      }

      for (let i = 0; i < rowsToProcess.length; i += CHUNK) {
        const chunk = rowsToProcess.slice(i, i + CHUNK);
        const t = await sequelize.transaction();
        let committed = false;
        try {
            // If any row in this chunk provides an explicit Id, enable IDENTITY_INSERT for the table
            const tableName = City.getTableName();
            const hasExplicitId = chunk.some(({ raw, norm }) => {
              const excelId = uploadService.pickFirst(norm["id"], norm["Id"], raw["Id"], raw["ID"]);
              return excelId !== null && excelId !== undefined && String(excelId).trim() !== "";
            });
            if (hasExplicitId) {
              try {
                await sequelize.query(`SET IDENTITY_INSERT dbo.${tableName} ON`, { transaction: t });
              } catch (ieErr) {
                // If enabling identity insert fails, continue and attempt individual creates (they will auto-generate ids)
                console.warn('Failed to enable IDENTITY_INSERT:', ieErr && ieErr.message);
              }
            }

          for (let j = 0; j < chunk.length; j++) {
            const idx = i + j;
            const { raw, norm } = chunk[j];
            const excelId = uploadService.pickFirst(norm["id"], norm["Id"], raw["Id"], raw["ID"]);
            const value = uploadService.pickFirst(norm["value"], norm["city"], norm["cityname"], raw["Value"], raw["City"], raw["cityname"]);
            const description = uploadService.pickFirst(norm["description"], norm["citydescription"], norm["name"], raw["Description"], raw["CityDescription"]) || value;
            const stateName = uploadService.pickFirst(norm["state"], norm["statename"], norm["parent"], norm["parent_description"], raw["State"], raw["StateName"], raw["Parent"], raw["PARENT_DESCRIPTION"]);
            const stateIdFromExcel = uploadService.pickFirst(norm["parent_id"], norm["parentid"], raw["PARENT_ID"]);

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

              // If Excel provided an explicit Id, include it so we insert with that Id (requires IDENTITY_INSERT ON)
              if (excelId !== null && excelId !== undefined && String(excelId).trim() !== "") {
                payload.Id = isNaN(Number(excelId)) ? excelId : Number(excelId);
              }

              if (existing) {
                await existing.update(payload, { transaction: t });
              } else {
                // remove undefined Id so DB autogenerates when not provided
                if (payload.Id === undefined) delete payload.Id;
                await City.create(payload, { transaction: t });
              }
              uploadedCount++;
            } catch (upErr) {
              errors.push({ row: idx + 2, reason: upErr && upErr.message ? upErr.message : String(upErr), raw });
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
          try { if (!committed) await t.rollback(); } catch (rbErr) { console.error("Rollback failed:", rbErr && rbErr.message); }
          errors.push({ row: `chunk ${i / CHUNK + 1}`, reason: chunkErr && chunkErr.message ? chunkErr.message : String(chunkErr) });
          console.error("Chunk error (city):", chunkErr);
        }
      }
    }

    async function uploadProducts(rowsToProcess) {
      const CHUNK = 500;
      if (mode === "replace") {
        try {
          await sequelize.query(`TRUNCATE TABLE ${Product.getTableName()}`);
        } catch (e) {
          const cnt = await Product.destroy({ where: {} });
          deletedCount = typeof cnt === "number" ? cnt : deletedCount;
        }
      }

      for (let i = 0; i < rowsToProcess.length; i += CHUNK) {
        const chunk = rowsToProcess.slice(i, i + CHUNK);
        const t = await sequelize.transaction();
        let committed = false;
        try {
          for (let j = 0; j < chunk.length; j++) {
            const idx = i + j;
            const { raw, norm } = chunk[j];
            const value = uploadService.pickFirst(norm["value"], norm["product"], norm["productcode"], raw["VALUE"], raw["Product"], raw["productcode"]);
            const description = uploadService.pickFirst(norm["description"], norm["productname"], norm["name"], raw["DESCRIPTION"], raw["ProductName"]) || value;
            const groupName = uploadService.pickFirst(norm["group"], norm["productgroup"], norm["groupname"], raw["Group"], raw["ProductGroup"], raw["groupname"]);

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
              const existing = await Product.findOne({ where: { VALUE: String(value).trim() }, transaction: t });
              const payload = {
                VALUE: String(value).trim(),
                DESCRIPTION: description ? String(description).trim() : null,
                ProductGroupID: groupId
              };

              if (existing) {
                await existing.update(payload, { transaction: t });
              } else {
                await Product.create(payload, { transaction: t });
              }
              uploadedCount++;
            } catch (upErr) {
              errors.push({ row: idx + 2, reason: upErr && upErr.message ? upErr.message : String(upErr), raw });
            }
          }

          await t.commit();
          committed = true;
        } catch (chunkErr) {
          try { if (!committed) await t.rollback(); } catch (rbErr) { console.error("Rollback failed:", rbErr && rbErr.message); }
          errors.push({ row: `chunk ${i / CHUNK + 1}`, reason: chunkErr && chunkErr.message ? chunkErr.message : String(chunkErr) });
          console.error("Chunk error (product):", chunkErr);
        }
      }
    }

    async function uploadProductGroups(rowsToProcess) {
      const CHUNK = 500;
      if (mode === "replace") {
        try {
          await sequelize.query(`TRUNCATE TABLE ${ProductGroup.getTableName()}`);
        } catch (e) {
          const cnt = await ProductGroup.destroy({ where: {} });
          deletedCount = typeof cnt === "number" ? cnt : deletedCount;
        }
      }

      for (let i = 0; i < rowsToProcess.length; i += CHUNK) {
        const chunk = rowsToProcess.slice(i, i + CHUNK);
        const t = await sequelize.transaction();
        let committed = false;
        try {
            // If any row in this chunk provides an explicit Id, enable IDENTITY_INSERT for the table
            const tableName = ProductGroup.getTableName();
            const hasExplicitId = chunk.some(({ raw, norm }) => {
              const excelId = uploadService.pickFirst(norm["id"], norm["Id"], raw["Id"], raw["ID"]);
              return excelId !== null && excelId !== undefined && String(excelId).trim() !== "";
            });
            if (hasExplicitId) {
              try {
                await sequelize.query(`SET IDENTITY_INSERT dbo.${tableName} ON`, { transaction: t });
              } catch (ieErr) {
                // If enabling identity insert fails, continue and attempt individual creates (they will auto-generate ids)
                console.warn('Failed to enable IDENTITY_INSERT:', ieErr && ieErr.message);
              }
            }

            for (let j = 0; j < chunk.length; j++) {
            const idx = i + j;
            const { raw, norm } = chunk[j];
              const excelId = uploadService.pickFirst(norm["id"], norm["Id"], raw["Id"], raw["ID"]);
              const value = uploadService.pickFirst(norm["value"], norm["groupcode"], norm["group_code"], raw["VALUE"], raw["GroupCode"], raw["groupcode"]);
              const description = uploadService.pickFirst(norm["description"], norm["groupname"], norm["name"], raw["DESCRIPTION"], raw["GroupName"]) || value;

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

                // If Excel provided an explicit Id, include it so we insert with that Id (requires IDENTITY_INSERT ON)
                if (excelId !== null && excelId !== undefined && String(excelId).trim() !== "") {
                  payload.Id = isNaN(Number(excelId)) ? excelId : Number(excelId);
                }

                if (existing) {
                  await existing.update(payload, { transaction: t });
                } else {
                  // remove undefined Id so DB autogenerates when not provided
                  if (payload.Id === undefined) delete payload.Id;
                  await ProductGroup.create(payload, { transaction: t });
                }
                uploadedCount++;
              } catch (upErr) {
                errors.push({ row: idx + 2, reason: upErr && upErr.message ? upErr.message : String(upErr), raw });
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
          try { if (!committed) await t.rollback(); } catch (rbErr) { console.error("Rollback failed:", rbErr && rbErr.message); }
          errors.push({ row: `chunk ${i / CHUNK + 1}`, reason: chunkErr && chunkErr.message ? chunkErr.message : String(chunkErr) });
          console.error("Chunk error (productgroup):", chunkErr);
        }
      }
    }

    let svcResult = { uploadedCount: 0, deletedCount: 0, errors: [] };
    if (mappedType === "model") {
      svcResult = await uploadService.uploadProductModels(rows, mode, sequelize);
    } else if (mappedType === "sparepart") {
      svcResult = await uploadService.uploadSpareParts(rows, mode, sequelize);
    } else if (mappedType === "pincode") {
      svcResult = await uploadService.uploadPincodes(rows, mode, sequelize);
    } else if (mappedType === "productgroup") {
      svcResult = await uploadService.uploadProductGroups(rows, mode, sequelize);
    } else if (mappedType === "state") {
      svcResult = await uploadService.uploadStates(rows, mode, sequelize);
    } else if (mappedType === "city") {
      svcResult = await uploadService.uploadCities(rows, mode, sequelize);
    } else if (mappedType === "product") {
      svcResult = await uploadService.uploadProducts(rows, mode, sequelize);
    } else {
      return res.status(400).json({ message: `Unsupported type for this endpoint. Received: ${mappedType}` });
    }

    // Use service results for reporting
    uploadedCount = svcResult.uploadedCount || 0;
    deletedCount = svcResult.deletedCount || 0;
    // merge errors: service errors take precedence
    errors.push(...(Array.isArray(svcResult.errors) ? svcResult.errors : []));

    try { fs.unlinkSync(file.path); } catch (e) {}
    const results = { processed: rows.length, uploaded: uploadedCount, deleted: deletedCount, errors, mode };
    if (errors.length) console.warn(`Upload completed with ${errors.length} row errors. Sample:`, errors[0]);
    return res.json({ message: "Upload processed", results, preview });
  } catch (err) {
    try { fs.unlinkSync(file.path); } catch (e) {}
    console.error("Upload error:", err);
    return res.status(500).json({ message: "Upload failed", error: err.message });
  }
});

/* ---------------- minimal fetch route to verify models ---------------- */
router.get("/master/models", async (req, res) => {
  try {
    const rows = await ProductModel.findAll({ order: [["MODEL_CODE", "ASC"]], limit: 1000 });
    res.json({ rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

/* ---------------- pincode upload (memory) ---------------- */
router.post("/upload-pincode", memoryUpload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { defval: null });

    let processedCount = 0;
    let uploadedCount = 0;

    for (const row of data) {
      processedCount++;

      const excelId = row["Id"] ?? row["ID"] ?? row["id"];
      const value = row["VALUE"] ?? row["Pincode"] ?? row["PINCODE"] ?? row["value"] ?? row["PincodeValue"];
      const description = row["DESCRIPTION"] ?? row["Description"] ?? value;
      const cityId = row["City_ID"] ?? row["CityId"] ?? row["city_id"] ?? row["cityid"] ?? row["City"];

      if (!value || !cityId) continue;

      try {
        // Resolve/Create City before upserting Pincode
        let cityRecord = null;
        const parsedCityId = Number(cityId);
        if (!isNaN(parsedCityId)) {
          cityRecord = await City.findOne({ where: { Id: parsedCityId } });
        }
        if (!cityRecord) {
          cityRecord = await City.findOne({ where: { Value: String(cityId).trim() } });
        }
        if (!cityRecord) {
          try {
            cityRecord = await City.create({ Value: String(cityId).trim(), Description: null, StateId: null });
            // log created city - not an error
            console.log(`Created City ${cityRecord.Id} for incoming City_ID ${cityId}`);
          } catch (cityErr) {
            console.error('Failed to create City for pincode upload:', cityErr && cityErr.message);
            continue;
          }
        }

        const payload = { Id: excelId ? (isNaN(Number(excelId)) ? excelId : Number(excelId)) : undefined, VALUE: value, DESCRIPTION: description || value, City_ID: cityRecord.Id };
        if (payload.Id === undefined) delete payload.Id;
        await Pincode.upsert(payload);
        uploadedCount++;
      } catch (e) {
        console.error('Pincode upsert error:', e && e.message);
      }
    }

    res.json({ message: "Pincode upload completed", processed: processedCount, uploaded: uploadedCount });
  } catch (error) {
    console.error("Error uploading pincodes:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});


// fetching state, city, pincode
router.get("/master/state", async (req, res) => {
  try {
    const rows = await State.findAll({ order: [["VALUE", "ASC"]] });
    res.json({ rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/master/city", async (req, res) => {
  try {
    const { stateId } = req.query;
    const rows = await City.findAll({
      where: stateId ? { StateId: Number(stateId) } : {},
      order: [["Value", "ASC"]],
      attributes: ['Id', 'Value', 'Description', 'StateId', 'StateName'],
      raw: true,
    });
    res.json({ rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/master/pincode", async (req, res) => {
  try {
    const { cityId } = req.query;
    const rows = await Pincode.findAll({ where: cityId ? { City_ID: Number(cityId) } : {}, order: [["VALUE", "ASC"]], limit: 1000 });
    res.json({ rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.get("/master-data", async (req, res) => {
  try {
    const { type, stateId, cityId, productId, modelId } = req.query;

    // allow alias types (e.g. 'cities' -> 'city') via typeMap
    // trim input and normalize to lowercase to tolerate extra whitespace/casing from clients
    const requested = (type || '').toString().trim().toLowerCase();
    const mappedType = uploadService.typeMap[requested] || requested;
    console.log(`/api/admin/master-data called -> type=${type} -> requested=${requested} -> mapped=${mappedType}`);
    
    // Debug: Log which models are available
    console.log(`Available models check - Pincode: ${!!Pincode}, State: ${!!State}, City: ${!!City}, ProductGroup: ${!!ProductGroup}`);
    if (!Pincode) console.warn('WARNING: Pincode model is not available!');
    if (!State) console.warn('WARNING: State model is not available!');
    if (!City) console.warn('WARNING: City model is not available!');
    if (!ProductGroup) console.warn('WARNING: ProductGroup model is not available!');

    const map = {
      state: async () => {
        try {
          if (!State) throw new Error('State model not available');
          return await State.findAll({ 
            order: [["VALUE", "ASC"]],
            attributes: ['Id', 'VALUE', 'DESCRIPTION'],
            raw: true
          });
        } catch (err) {
          console.warn('State findAll failed, using raw SQL:', err.message);
          try {
            const [results] = await sequelize.query(
              'SELECT [Id], [VALUE], [DESCRIPTION] FROM [States] ORDER BY [VALUE] ASC',
              { type: sequelize.QueryTypes.SELECT, timeout: 30000 }
            );
            return results || [];
          } catch (sqlErr) {
            console.error('State SQL fallback failed:', sqlErr.message);
            return [];
          }
        }
      },
      city: async () => {
        try {
          if (!City) throw new Error('City model not available');
          let stateNames = [];
          const where = {};

          if (stateId) {
            const numericStateId = Number(stateId);
            where.StateId = numericStateId;

            if (!Number.isNaN(numericStateId) && State) {
              const stateRow = await State.findOne({
                where: { Id: numericStateId },
                attributes: ['VALUE', 'DESCRIPTION'],
                raw: true,
              });
              if (stateRow) {
                stateNames = [stateRow.VALUE, stateRow.DESCRIPTION]
                  .filter(Boolean)
                  .map((name) => String(name).trim());
              }
            }
          }

          let rows = await City.findAll({
            where,
            order: [["Value", "ASC"]],
            attributes: ['Id', 'Value', 'Description', 'StateId', 'StateName'],
            raw: true,
          });

          if (stateId && Array.isArray(rows) && rows.length === 0 && stateNames.length > 0) {
            rows = await City.findAll({
              where: { StateName: { [Op.in]: stateNames } },
              order: [["Value", "ASC"]],
              attributes: ['Id', 'Value', 'Description', 'StateId', 'StateName'],
              raw: true,
            });
          }

          return rows;
        } catch (err) {
          console.warn('City findAll failed, using raw SQL:', err.message);
          try {
            let sql = 'SELECT [Id], [Value], [Description], [Parent_I] AS [StateId], [Parent_Description] AS [StateName] FROM [Cities] ORDER BY [Value] ASC';
            const params = [];
            if (stateId) {
              sql = `
                SELECT [Id], [Value], [Description], [Parent_I] AS [StateId], [Parent_Description] AS [StateName]
                FROM [Cities]
                WHERE [Parent_I] = ?
                   OR [Parent_Description] IN (
                     SELECT [VALUE] FROM [States] WHERE [Id] = ?
                     UNION
                     SELECT [DESCRIPTION] FROM [States] WHERE [Id] = ?
                   )
                ORDER BY [Value] ASC
              `;
              params.push(Number(stateId), Number(stateId), Number(stateId));
            }
            const results = await sequelize.query(sql, {
              replacements: params,
              type: sequelize.QueryTypes.SELECT,
              timeout: 30000
            });
            return results || [];
          } catch (sqlErr) {
            console.error('City SQL fallback failed:', sqlErr.message);
            return [];
          }
        }
      },
      pincode: async () => {
        try {
          if (!Pincode) throw new Error('Pincode model not available');
          const result = await Pincode.findAll({
            where: cityId ? { City_ID: Number(cityId) } : {},
            order: [["VALUE", "ASC"]],
            attributes: ['Id', 'VALUE', 'DESCRIPTION', 'City_ID'],
            raw: true,
          });
          console.log('Pincode.findAll() returned:', Array.isArray(result) ? `array with ${result.length} items` : typeof result);
          return (Array.isArray(result) ? result : []).map(r => ({
            Id: r.Id,
            VALUE: r.VALUE,
            value: r.VALUE,
            DESCRIPTION: r.DESCRIPTION,
            City_ID: r.City_ID,
            cityId: r.City_ID
          }));
        } catch (err) {
          console.warn('Pincode findAll failed, using raw SQL:', err.message);
          try {
            let sql = 'SELECT [Id], [VALUE], [DESCRIPTION], [City_ID] FROM [Pincodes] ORDER BY [VALUE] ASC';
            const params = [];
            if (cityId) {
              sql = 'SELECT [Id], [VALUE], [DESCRIPTION], [City_ID] FROM [Pincodes] WHERE [City_ID] = ? ORDER BY [VALUE] ASC';
              params.push(Number(cityId));
            }
            const results = await sequelize.query(sql, { 
              replacements: params,
              type: sequelize.QueryTypes.SELECT,
              timeout: 30000
            });
            console.log('Raw SQL Pincode query returned:', Array.isArray(results) ? `array with ${results.length} items` : typeof results);
            return (Array.isArray(results) ? results : []).map(r => ({
              Id: r.Id,
              VALUE: r.VALUE,
              value: r.VALUE,
              DESCRIPTION: r.DESCRIPTION,
              City_ID: r.City_ID,
              cityId: r.City_ID
            }));
          } catch (sqlErr) {
            console.error('Pincode SQL fallback also failed:', sqlErr.message);
            return [];
          }
        }
      },
      productgroup: async () => {
        try {
          if (!ProductGroup) throw new Error('ProductGroup model not available');
          return await ProductGroup.findAll({ order: [["VALUE", "ASC"]], raw: true });
        } catch (err) {
          console.warn('ProductGroup findAll failed, using raw SQL:', err.message);
          const [results] = await sequelize.query(
            'SELECT Id, VALUE, DESCRIPTION FROM ProductGroups ORDER BY VALUE ASC',
            { type: sequelize.QueryTypes.SELECT }
          );
          return results || [];
        }
      },
      model: async () => {
        // Use raw query to avoid any Sequelize association or attribute inference
        const sequelize = ProductModel.sequelize;
        // Resolve table name from model to avoid hard-coded mismatch
        const rawTable = typeof ProductModel.getTableName === 'function' ? ProductModel.getTableName() : (ProductModel.tableName || ProductModel.getTableName);
        let schemaName = 'dbo';
        let baseName = rawTable;
        if (rawTable && typeof rawTable === 'object') {
          schemaName = rawTable.schema || rawTable.table_schema || schemaName;
          baseName = rawTable.tableName || rawTable.table || rawTable.tableName;
        } else if (typeof rawTable === 'string' && rawTable.includes('.')) {
          const parts = rawTable.split('.');
          schemaName = parts[0] || schemaName;
          baseName = parts[1] || parts[0];
        }
        const qualifiedTable = `[${schemaName}].[${baseName}]`;

        let sql = `SELECT Id, Product AS ProductID, BRAND, PRODUCT, MODEL_CODE, MODEL_DESCRIPTION, PRICE, SERIALIZED_FLAG, WARRANTY_IN_MONTHS, VALID_FROM FROM ${qualifiedTable}`;
        const replacements = [];
        
        if (productId) {
          sql += ` WHERE Product = ?`;
          replacements.push(productId);
        }
        
        sql += ` ORDER BY MODEL_CODE ASC`;
        
        let [results] = await sequelize.query(sql, { 
          type: sequelize.QueryTypes.SELECT,
          replacements 
        }).catch(e => {
          // console.warn('Raw model query failed, will fallback to model.findAll():', e && e.message);
          return [ [] ];
        });

        // If raw query returned nothing, try Sequelize findAll as a fallback
        if (!Array.isArray(results) || results.length === 0) {
          try {
            const whereClause = productId ? { Product: productId } : {};
            const fallback = await ProductModel.findAll({ 
              where: whereClause,
              order: [["MODEL_CODE", "ASC"]], 
              raw: true 
            });
            results = Array.isArray(fallback) ? fallback : [];
            console.log('/api/admin/master-data -> model fetch (fallback findAll) returned', results.length);
          } catch (e) {
            console.warn('Fallback ProductModel.findAll() failed:', e && e.message);
          }
        } else {
          console.log(`/api/admin/master-data -> model fetch returned ${Array.isArray(results) ? results.length : 0} rows`);
        }

        if (Array.isArray(results) && results.length > 0) console.log('Sample model row:', results[0]);
        const mapped = (Array.isArray(results) ? results : []).map(r => {
          const id = r.Id ?? r.ID ?? r.id ?? null;
          const productRaw = r.ProductID ?? r.Product ?? r.PRODUCT ?? r.product ?? null;
          const productId = uploadService.parsePossibleId(productRaw) ?? (productRaw !== null && productRaw !== undefined ? String(productRaw).trim() : null);
          return {
            ...r,
            Id: id,
            id: id,
            ID: id,
            ProductID: productId,
            Product: productRaw,
            PRODUCT: productRaw,
            MODEL_CODE: r.MODEL_CODE ?? r.Model_Code ?? r.model_code ?? r.MODEL ?? r.model ?? r.Value ?? null,
            MODEL_DESCRIPTION: r.MODEL_DESCRIPTION ?? r.Model_Description ?? r.model_description ?? r.DESCRIPTION ?? r.description ?? null
          };
        });
        return mapped;
      },
      sparepart: async () => {
        try {
          const whereClause = modelId ? { MAPPED_MODEL: modelId } : {};
          return await SparePart.findAll({ 
            where: whereClause,
            order: [["PART", "ASC"]] 
          });
        } catch (err) {
          // Fallback: if SparePart model defines columns that do not exist in DB
          // (e.g., ModelID), run a raw select matching the migration-created table
          const sequelizeRaw = SparePart.sequelize;
          let sql = `SELECT Id, BRAND, PART, DESCRIPTION, MAPPED_MODEL, MODEL_DESCRIPTION, MAX_USED_QTY, SERVICE_LEVEL, PART_LOCATION, STATUS, LAST_UPDATED_DATE, CreatedAt FROM SpareParts`;
          const replacements = [];
          
          if (modelId) {
            sql += ` WHERE MAPPED_MODEL = ?`;
            replacements.push(modelId);
          }
          
          sql += ` ORDER BY PART ASC`;
          
          const [results] = await sequelizeRaw.query(sql, { 
            type: sequelizeRaw.QueryTypes.SELECT,
            replacements
          });
          return results;
        }
      },
      product: async () => {
        try {
          // Use ProductMaster model since that's where products are stored
          const results = await ProductMaster.findAll({ 
            order: [["VALUE", "ASC"]], 
            attributes: ['ID', 'VALUE', 'DESCRIPTION', 'Product_group_ID'], 
            raw: true 
          });
          // Normalize field names: ensure Product_group_ID is named ProductGroupID
          return (Array.isArray(results) ? results : []).map(r => ({
            ID: r.ID,
            VALUE: r.VALUE,
            DESCRIPTION: r.DESCRIPTION,
            ProductGroupID: r.Product_group_ID
          }));
        } catch (err) {
          console.warn('ProductMaster.findAll failed, using raw SQL:', err.message);
          // Fallback: use raw SQL with explicit column selection and timeout
          try {
            const sql = `SELECT [ID], [VALUE], [DESCRIPTION], [Product_group_ID] AS ProductGroupID FROM [ProductMaster] ORDER BY [VALUE] ASC`;
            const results = await sequelize.query(sql, { 
              type: sequelize.QueryTypes.SELECT, 
              timeout: 30000 
            });
            return Array.isArray(results) && results.length > 0 ? results : [];
          } catch (sqlErr) {
            console.error('Raw SQL product query also failed:', sqlErr.message);
            return [];
          }
        }
      },
    };

    const key = mappedType;

    if (!map[key]) {
      console.warn(`Invalid master-data type requested: ${type} -> mapped: ${mappedType}`);
      return res.status(400).json({ error: "Invalid type" });
    }

    const rows = await map[key]();
    console.log(`Master-data[${key}] response:`, {
      isArray: Array.isArray(rows),
      type: typeof rows,
      length: Array.isArray(rows) ? rows.length : 'N/A',
      preview: Array.isArray(rows) ? rows.slice(0, 2) : rows
    });
    return res.json({ rows: Array.isArray(rows) ? rows : [rows] });

  } catch (err) {
    console.error("Master-data error:", err);
    console.error("Error stack:", err.stack);
    console.error("Error message:", err.message);
    res.status(500).json({ 
      error: "Server error", 
      message: err.message,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined 
    });
  }
});

// Generic create/update/delete endpoints for master-data
function resolveModelFromTypeParam(typeParam) {
  if (!typeParam) return null;
  const mapped = uploadService.typeMap[typeParam.toLowerCase()] || typeParam.toLowerCase();
  switch (mapped) {
    case 'state': return State;
    case 'city': return City;
    case 'pincode': return Pincode;
    case 'productgroup': return ProductGroup;
    case 'model': return ProductModel;
    case 'sparepart': return SparePart;
    case 'product': return Product;
    default: return null;
  }
}

router.post('/master-data/:type', async (req, res) => {
  try {
    const model = resolveModelFromTypeParam(req.params.type);
    if (!model) return res.status(400).json({ message: 'Unknown type' });
    const payload = req.body || {};
    const created = await model.create(payload);
    return res.json({ message: 'Created', data: created });
  } catch (err) {
    console.error('Create master-data error:', err);
    return res.status(500).json({ message: err.message });
  }
});

router.put('/master-data/:type/:id', async (req, res) => {
  try {
    const model = resolveModelFromTypeParam(req.params.type);
    if (!model) return res.status(400).json({ message: 'Unknown type' });
    const id = req.params.id;
    const payload = req.body || {};

    const pk = (model.primaryKeyAttributes && model.primaryKeyAttributes[0]) || 'Id';
    const where = {};
    where[pk] = isNaN(Number(id)) ? id : Number(id);

    const [affected] = await model.update(payload, { where });
    if (!affected) return res.status(404).json({ message: 'Record not found' });
    const updated = await model.findOne({ where });
    return res.json({ message: 'Updated', data: updated });
  } catch (err) {
    console.error('Update master-data error:', err);
    return res.status(500).json({ message: err.message });
  }
});

router.delete('/master-data/:type/:id', async (req, res) => {
  try {
    const model = resolveModelFromTypeParam(req.params.type);
    if (!model) return res.status(400).json({ message: 'Unknown type' });
    const id = req.params.id;
    const pk = (model.primaryKeyAttributes && model.primaryKeyAttributes[0]) || 'Id';
    const where = {};
    where[pk] = isNaN(Number(id)) ? id : Number(id);
    const d = await model.destroy({ where });
    if (!d) return res.status(404).json({ message: 'Record not found or already deleted' });
    return res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('Delete master-data error:', err);
    return res.status(500).json({ message: err.message });
  }
});

// Admin helper: assign service centers to branches
router.post('/assign-servicecenter-branch', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const assignments = Array.isArray(req.body.assignments) ? req.body.assignments : [];
    const ServiceCentreModel = sequelize.models.ServiceCentre || ServiceCentre;
    let updated = 0;
    for (const a of assignments) {
      const scId = a.serviceCenterId || a.scId || a.ServiceCenterId;
      const brId = a.branchId || a.BranchId || a.branch;
      if (!scId || !brId) continue;
      try {
        const [cnt] = await ServiceCentreModel.update({ BranchId: brId }, { where: { Id: scId } });
        if (cnt) updated++;
      } catch (e) {
        console.error('Assignment update failed for', scId, e && e.message ? e.message : e);
      }
    }
    return res.json({ ok: true, updated });
  } catch (err) {
    console.error('assign-servicecenter-branch error', err);
    return res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/users - Fetch all users
router.get('/users', authenticateToken, requireRole(['admin', 'service_center']), async (req, res) => {
  try {
    const { User } = await import('../models/index.js');
    const users = await User.findAll({
      attributes: ['UserID', 'Username', 'Role', 'Email', 'BranchId', 'CenterId'],
      order: [['Username', 'ASC']]
    });
    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err);    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /api/admin/search-master - Search master data by type and query
router.get('/search-master', async (req, res) => {
  try {
    const { type, q } = req.query;
    const requested = (type || '').toString().trim().toLowerCase();
    const mappedType = uploadService.typeMap[requested] || requested;

    let whereClause = {};
    if (q && q.trim()) {
      whereClause.VALUE = { [Op.like]: `%${q.trim()}%` };
    }



    let Model;
    switch (mappedType) {
      case 'state':
        Model = State;
        break;
      case 'city':
        Model = City;
        break;
      case 'pincode':
        Model = Pincode;
        break;
      case 'productgroup':
        Model = ProductGroup;
        break;
      case 'product':
        Model = ProductMaster;
        break;
      case 'model':
        Model = ProductModel;
        break;
      default:
        return res.status(400).json({ error: 'Invalid type' });
    }

    const rows = await Model.findAll({
      where: whereClause,
      order: [['VALUE', 'ASC']],
      limit: 100 // Limit results
    });

    res.json({ rows });
  } catch (err) {
    console.error('Error searching master data:', err);    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /api/admin/replacement-history - Get replacement history with filters
router.get('/replacement-history', authenticateToken, requireRole(['admin', 'service_center']), async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      callId,
      status,
      requestedBy,
      page = 1,
      limit = 10
    } = req.query;

    const whereClause = {
      RequestType: 'replacement'
    };

    // Add filters
    if (startDate && endDate) {
      whereClause.CreatedAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    if (status) {
      whereClause.Status = status;
    }

    // For callId, we need to search in Notes field since it's stored there
    if (callId) {
      whereClause.Notes = {
        [Op.like]: `%Call ID: ${callId}%`
      };
    }

    // For requestedBy, also search in Notes
    if (requestedBy) {
      whereClause.Notes = {
        ...whereClause.Notes,
        [Op.like]: `%Requested By: ${requestedBy}%`
      };
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

    // Transform the data to match the frontend expectations
    const transformedRows = rows.map(request => {
      // Extract info from Notes field
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
          // We might need to add more product details if available
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

    res.json({
      data: transformedRows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching replacement history:', error);
    res.status(500).json({ error: 'Failed to fetch replacement history' });
  }
});

export default router;