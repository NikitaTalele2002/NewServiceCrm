import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { 
  parseExcelFile, 
  uploadProductGroups, 
  uploadStates, 
  uploadCities, 
  uploadPincodes,
  uploadSpareParts 
} from '../services/excelUploadService.js';

// Configure multer for file uploads
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel' // .xls
  ];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only Excel files are allowed'), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

/**
 * Upload Product Groups from Excel
 */
export const uploadProductGroupsController = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Parse Excel file
    const records = parseExcelFile(req.file.path);

    if (!records || records.length === 0) {
      fs.unlinkSync(req.file.path); // Delete uploaded file
      return res.status(400).json({
        success: false,
        message: 'Excel file is empty'
      });
    }

    // Upload to database
    const results = await uploadProductGroups(records);

    // Delete upload file
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      message: `Uploaded Product Groups: ${results.success} successful, ${results.failed} failed`,
      results
    });

  } catch (error) {
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch(e) {}
    }
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Upload failed'
    });
  }
};

/**
 * Upload States from Excel
 */
export const uploadStatesController = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const records = parseExcelFile(req.file.path);

    if (!records || records.length === 0) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'Excel file is empty'
      });
    }

    const results = await uploadStates(records);
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      message: `Uploaded States: ${results.success} successful, ${results.failed} failed`,
      results
    });

  } catch (error) {
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch(e) {}
    }
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Upload failed'
    });
  }
};

/**
 * Upload Cities from Excel
 */
export const uploadCitiesController = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const records = parseExcelFile(req.file.path);

    if (!records || records.length === 0) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'Excel file is empty'
      });
    }

    const results = await uploadCities(records);
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      message: `Uploaded Cities: ${results.success} successful, ${results.failed} failed`,
      results
    });

  } catch (error) {
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch(e) {}
    }
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Upload failed'
    });
  }
};

/**
 * Upload Pincodes from Excel
 */
export const uploadPincodesController = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const records = parseExcelFile(req.file.path);

    if (!records || records.length === 0) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'Excel file is empty'
      });
    }

    const results = await uploadPincodes(records);
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      message: `Uploaded Pincodes: ${results.success} successful, ${results.failed} failed`,
      results
    });

  } catch (error) {
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch(e) {}
    }
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Upload failed'
    });
  }
};

/**
 * Upload Spare Parts from Excel
 */
export const uploadSparePartsController = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const records = parseExcelFile(req.file.path);

    if (!records || records.length === 0) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'Excel file is empty'
      });
    }

    const results = await uploadSpareParts(records);
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      message: `Uploaded Spare Parts: ${results.success} successful, ${results.failed} failed`,
      results
    });

  } catch (error) {
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch(e) {}
    }
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Upload failed'
    });
  }
};
