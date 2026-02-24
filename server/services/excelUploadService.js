import XLSX from 'xlsx';
import { ProductGroup, State, City, Pincode, Product, ProductModel, SparePart } from '../models/index.js';

/**
 * Parse Excel file and extract data
 */
export const parseExcelFile = (filePath) => {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);
    return data;
  } catch (error) {
    throw new Error(`Failed to parse Excel file: ${error.message}`);
  }
};

/**
 * Upload Product Groups
 */
export const uploadProductGroups = async (records) => {
  try {
    const results = {
      success: 0,
      failed: 0,
      errors: [],
      created: []
    };

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      
      try {
        // Trim whitespace and handle empty values
        const value = record.VALUE ? String(record.VALUE).trim() : null;
        const description = record.DESCRIPTION ? String(record.DESCRIPTION).trim() : null;
        const id = record.ID ? parseInt(record.ID) : null;

        // Validate required field
        if (!value) {
          results.failed++;
          results.errors.push({
            row: i + 2,
            error: 'VALUE is required',
            data: record
          });
          continue;
        }

        // Check if already exists
        const existing = await ProductGroup.findOne({ where: { VALUE: value } });
        if (existing) {
          results.failed++;
          results.errors.push({
            row: i + 2,
            error: `Product Group "${value}" already exists`,
            data: record
          });
          continue;
        }

        // Create new record
        const created = await ProductGroup.create({
          VALUE: value,
          DESCRIPTION: description || null
        });

        results.success++;
        results.created.push({
          id: created.Id,
          value: created.VALUE,
          description: created.DESCRIPTION
        });

      } catch (error) {
        results.failed++;
        results.errors.push({
          row: i + 2,
          error: error.message,
          data: record
        });
      }
    }

    return results;
  } catch (error) {
    throw new Error(`Failed to upload product groups: ${error.message}`);
  }
};

/**
 * Upload States
 */
export const uploadStates = async (records) => {
  try {
    const results = {
      success: 0,
      failed: 0,
      errors: [],
      created: []
    };

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      
      try {
        // Support multiple column name variations
        const id = record.Id || record.ID || record.id || null;
        const value = record.VALUE || record.Value || record.STATE_NAME || String(record.STATE_NAME || '').trim();
        const description = record.DESCRIPTION || record.Description || record.STATE_CODE || record.StateCode || null;

        if (!value) {
          results.failed++;
          results.errors.push({
            row: i + 2,
            error: 'VALUE/STATE_NAME is required',
            data: record
          });
          continue;
        }

        const existing = await State.findOne({ where: { VALUE: String(value).trim() } });
        if (existing) {
          results.failed++;
          results.errors.push({
            row: i + 2,
            error: `State "${value}" already exists`,
            data: record
          });
          continue;
        }

        const payload = {
          VALUE: String(value).trim(),
          DESCRIPTION: description ? String(description).trim() : null
        };

        // If an explicit ID was provided, include it
        if (id !== null && id !== undefined && String(id).trim() !== "") {
          payload.Id = isNaN(Number(id)) ? id : Number(id);
        }

        const created = await State.create(payload);

        results.success++;
        results.created.push({
          id: created.Id,
          value: created.VALUE,
          description: created.DESCRIPTION
        });

      } catch (error) {
        results.failed++;
        results.errors.push({
          row: i + 2,
          error: error.message,
          data: record
        });
      }
    }

    return results;
  } catch (error) {
    throw new Error(`Failed to upload states: ${error.message}`);
  }
};

/**
 * Upload Cities
 */
export const uploadCities = async (records) => {
  try {
    const results = {
      success: 0,
      failed: 0,
      errors: [],
      created: []
    };

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      
      try {
        const cityName = record.CITY_NAME ? String(record.CITY_NAME).trim() : null;
        const stateId = record.STATE_ID ? parseInt(record.STATE_ID) : null;

        if (!cityName) {
          results.failed++;
          results.errors.push({
            row: i + 2,
            error: 'CITY_NAME is required',
            data: record
          });
          continue;
        }

        // Verify state exists if state_id provided
        if (stateId) {
          const stateExists = await State.findByPk(stateId);
          if (!stateExists) {
            results.failed++;
            results.errors.push({
              row: i + 2,
              error: `State with Id ${stateId} does not exist`,
              data: record
            });
            continue;
          }
        }

        const existing = await City.findOne({ where: { CityName: cityName } });
        if (existing) {
          results.failed++;
          results.errors.push({
            row: i + 2,
            error: `City "${cityName}" already exists`,
            data: record
          });
          continue;
        }

        const created = await City.create({
          CityName: cityName,
          StateId: stateId || null
        });

        results.success++;
        results.created.push({
          id: created.Id,
          name: created.CityName,
          stateId: created.StateId
        });

      } catch (error) {
        results.failed++;
        results.errors.push({
          row: i + 2,
          error: error.message,
          data: record
        });
      }
    }

    return results;
  } catch (error) {
    throw new Error(`Failed to upload cities: ${error.message}`);
  }
};

/**
 * Upload Pincodes
 */
export const uploadPincodes = async (records) => {
  try {
    const results = {
      success: 0,
      failed: 0,
      errors: [],
      created: []
    };

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      
      try {
        const pincode = record.PINCODE ? String(record.PINCODE).trim() : null;
        const cityId = record.CITY_ID ? parseInt(record.CITY_ID) : null;

        if (!pincode) {
          results.failed++;
          results.errors.push({
            row: i + 2,
            error: 'PINCODE is required',
            data: record
          });
          continue;
        }

        if (!cityId) {
          results.failed++;
          results.errors.push({
            row: i + 2,
            error: 'CITY_ID is required',
            data: record
          });
          continue;
        }

        // Verify city exists
        const cityExists = await City.findByPk(cityId);
        if (!cityExists) {
          results.failed++;
          results.errors.push({
            row: i + 2,
            error: `City with Id ${cityId} does not exist`,
            data: record
          });
          continue;
        }

        const existing = await Pincode.findOne({ where: { Pincode: pincode } });
        if (existing) {
          results.failed++;
          results.errors.push({
            row: i + 2,
            error: `Pincode "${pincode}" already exists`,
            data: record
          });
          continue;
        }

        const created = await Pincode.create({
          Pincode: pincode,
          CityId: cityId
        });

        results.success++;
        results.created.push({
          id: created.Id,
          pincode: created.Pincode,
          cityId: created.CityId
        });

      } catch (error) {
        results.failed++;
        results.errors.push({
          row: i + 2,
          error: error.message,
          data: record
        });
      }
    }

    return results;
  } catch (error) {
    throw new Error(`Failed to upload pincodes: ${error.message}`);
  }
};

/**
 * Upload Spare Parts
 */
export const uploadSpareParts = async (records) => {
  try {
    const results = {
      success: 0,
      failed: 0,
      errors: [],
      created: []
    };

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      
      try {
        const spareName = record.SPARE_NAME ? String(record.SPARE_NAME).trim() : null;
        const spareCode = record.SPARE_CODE ? String(record.SPARE_CODE).trim() : null;
        const description = record.DESCRIPTION ? String(record.DESCRIPTION).trim() : null;
        const productGroupId = record.PRODUCT_GROUP_ID ? parseInt(record.PRODUCT_GROUP_ID) : null;

        if (!spareName) {
          results.failed++;
          results.errors.push({
            row: i + 2,
            error: 'SPARE_NAME is required',
            data: record
          });
          continue;
        }

        if (productGroupId) {
          const groupExists = await ProductGroup.findByPk(productGroupId);
          if (!groupExists) {
            results.failed++;
            results.errors.push({
              row: i + 2,
              error: `Product Group with Id ${productGroupId} does not exist`,
              data: record
            });
            continue;
          }
        }

        const existing = await SparePart.findOne({ where: { SpareName: spareName } });
        if (existing) {
          results.failed++;
          results.errors.push({
            row: i + 2,
            error: `Spare Part "${spareName}" already exists`,
            data: record
          });
          continue;
        }

        const created = await SparePart.create({
          SpareName: spareName,
          SpareCode: spareCode || null,
          DESCRIPTION: description || null,
          ProductGroupId: productGroupId || null
        });

        results.success++;
        results.created.push({
          id: created.Id,
          name: created.SpareName,
          code: created.SpareCode
        });

      } catch (error) {
        results.failed++;
        results.errors.push({
          row: i + 2,
          error: error.message,
          data: record
        });
      }
    }

    return results;
  } catch (error) {
    throw new Error(`Failed to upload spare parts: ${error.message}`);
  }
};
