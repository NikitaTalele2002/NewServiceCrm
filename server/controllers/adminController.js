import * as adminService from '../services/adminService.js';

// POST /api/admin/upload-master
export async function uploadMasterData(req, res) {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const type = (req.body?.type || "").toString().trim().toLowerCase();
    const mode = (req.query?.mode || "append").toString().toLowerCase();

    const result = await adminService.uploadMasterData(req.file, type, mode);
    
    res.json({ 
      message: "Upload processed", 
      results: result,
      preview: result.preview
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ message: "Upload failed", error: error.message });
  }
}

// POST /api/admin/upload-pincode
export async function uploadPincode(req, res) {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const xlsx = await import('xlsx');
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
        const { City, Pincode } = await import('../models/index.js');
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
            console.log(`Created City ${cityRecord.Id} for incoming City_ID ${cityId}`);
          } catch (cityErr) {
            console.error('Failed to create City:', cityErr.message);
            continue;
          }
        }

        const payload = { 
          VALUE: value, 
          DESCRIPTION: description || value, 
          City_ID: cityRecord.Id 
        };
        if (excelId) payload.Id = isNaN(Number(excelId)) ? excelId : Number(excelId);
        
        await Pincode.upsert(payload);
        uploadedCount++;
      } catch (e) {
        console.error('Pincode upsert error:', e.message);
      }
    }

    res.json({ message: "Pincode upload completed", processed: processedCount, uploaded: uploadedCount });
  } catch (error) {
    console.error("Error uploading pincodes:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
}

// GET /api/admin/master/models
export async function getProductModels(req, res) {
  try {
    const rows = await adminService.getProductModels();
    res.json({ rows });
  } catch (error) {
    console.error("Error fetching models:", error);
    res.status(500).json({ message: error.message });
  }
}

// GET /api/admin/master/state
export async function getStates(req, res) {
  try {
    const rows = await adminService.getMasterDataByType('state');
    res.json({ rows });
  } catch (error) {
    console.error("Error fetching states:", error);
    res.status(500).json({ error: error.message || 'Failed to fetch states', details: error.stack });
  }
}

// GET /api/admin/master/city
export async function getCities(req, res) {
  try {
    const { stateId } = req.query;
    const rows = await adminService.getMasterDataByType('city', { stateId });
    res.json({ rows });
  } catch (error) {
    console.error("Error fetching cities:", error);
    res.status(500).json({ error: error.message || 'Failed to fetch cities', details: error.stack });
  }
}

// GET /api/admin/master/pincode
export async function getPincodes(req, res) {
  try {
    const { cityId } = req.query;
    const rows = await adminService.getMasterDataByType('pincode', { cityId });
    res.json({ rows });
  } catch (error) {
    console.error("Error fetching pincodes:", error);
    res.status(500).json({ error: error.message || 'Failed to fetch pincodes', details: error.stack });
  }
}

// GET /api/admin/master-data
export async function getMasterData(req, res) {
  try {
    const { type, stateId, cityId, productId, modelId } = req.query;
    
    const filters = {};
    if (stateId) filters.stateId = stateId;
    if (cityId) filters.cityId = cityId;
    if (productId) filters.productId = productId;
    if (modelId) filters.modelId = modelId;

    const rows = await adminService.getMasterDataByType(type, filters);
    res.json({ rows: Array.isArray(rows) ? rows : [rows] });
  } catch (error) {
    console.error("Master-data error:", error);
    res.status(500).json({ 
      error: "Server error", 
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    });
  }
}

// POST /api/admin/master-data/:type
export async function createMasterData(req, res) {
  try {
    const created = await adminService.createMasterData(req.params.type, req.body || {});
    res.json({ message: 'Created', data: created });
  } catch (error) {
    console.error('Create master-data error:', error);
    res.status(500).json({ message: error.message });
  }
}

// PUT /api/admin/master-data/:type/:id
export async function updateMasterData(req, res) {
  try {
    const updated = await adminService.updateMasterData(req.params.type, req.params.id, req.body || {});
    res.json({ message: 'Updated', data: updated });
  } catch (error) {
    console.error('Update master-data error:', error);
    res.status(400).json({ message: error.message });
  }
}

// DELETE /api/admin/master-data/:type/:id
export async function deleteMasterData(req, res) {
  try {
    await adminService.deleteMasterData(req.params.type, req.params.id);
    res.json({ message: 'Deleted' });
  } catch (error) {
    console.error('Delete master-data error:', error);
    res.status(400).json({ message: error.message });
  }
}

// POST /api/admin/assign-servicecenter-branch
export async function assignServiceCentersToBranches(req, res) {
  try {
    const result = await adminService.assignServiceCentersToBranches(req.body.assignments || []);
    res.json({ ok: true, ...result });
  } catch (error) {
    console.error('assign-servicecenter-branch error:', error);
    res.status(500).json({ message: error.message });
  }
}

// GET /api/admin/search-master
export async function searchMasterData(req, res) {
  try {
    const { type, q } = req.query;
    const rows = await adminService.searchMasterData(type, q);
    res.json({ rows });
  } catch (error) {
    console.error('Error searching master data:', error);
    res.status(500).json({ error: error.message });
  }
}

// GET /api/admin/replacement-history
export async function getReplacementHistory(req, res) {
  try {
    const result = await adminService.getReplacementHistory(req.query);
    res.json(result);
  } catch (error) {
    console.error('Error fetching replacement history:', error);
    res.status(500).json({ error: 'Failed to fetch replacement history' });
  }
}

// GET /api/admin/users
export async function getUsers(req, res) {
  try {
    const { User } = await import('../models/index.js');
    const users = await User.findAll({
      attributes: ['UserID', 'Username', 'Role', 'Email', 'BranchId', 'CenterId'],
      order: [['Username', 'ASC']]
    });
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
}
