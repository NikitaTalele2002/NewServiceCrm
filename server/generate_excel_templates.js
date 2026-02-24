import ExcelJS from 'exceljs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Sample data for ProductModels
const productModelSampleData = [
  {
    MODEL_CODE: 'PM001',
    BRAND: 'Brand A',
    PRODUCT: 'Laptop',
    MODEL_DESCRIPTION: 'High performance laptop model',
    PRICE: 45000.00,
    SERIALIZED_FLAG: 'Y',
    WARRANTY_IN_MONTHS: 24,
    VALID_FROM: new Date('2024-01-01')
  },
  {
    MODEL_CODE: 'PM002',
    BRAND: 'Brand B',
    PRODUCT: 'Desktop',
    MODEL_DESCRIPTION: 'Powerful desktop computer',
    PRICE: 55000.00,
    SERIALIZED_FLAG: 'Y',
    WARRANTY_IN_MONTHS: 36,
    VALID_FROM: new Date('2024-01-15')
  },
  {
    MODEL_CODE: 'PM003',
    BRAND: 'Brand A',
    PRODUCT: 'Tablet',
    MODEL_DESCRIPTION: 'Portable tablet device',
    PRICE: 25000.00,
    SERIALIZED_FLAG: 'Y',
    WARRANTY_IN_MONTHS: 12,
    VALID_FROM: new Date('2024-02-01')
  },
  {
    MODEL_CODE: 'PM004',
    BRAND: 'Brand C',
    PRODUCT: 'Monitor',
    MODEL_DESCRIPTION: 'Ultra HD monitor',
    PRICE: 15000.00,
    SERIALIZED_FLAG: 'N',
    WARRANTY_IN_MONTHS: 24,
    VALID_FROM: new Date('2024-02-10')
  },
  {
    MODEL_CODE: 'PM005',
    BRAND: 'Brand D',
    PRODUCT: 'Printer',
    MODEL_DESCRIPTION: 'Multi-function printer',
    PRICE: 12000.00,
    SERIALIZED_FLAG: 'N',
    WARRANTY_IN_MONTHS: 12,
    VALID_FROM: new Date('2024-03-01')
  }
];

// Sample data for SpareParts
const sparePartSampleData = [
  {
    BRAND: 'Brand A',
    PART: 'RAM 8GB',
    ModelID: null,
    DESCRIPTION: 'RAM memory 8GB DDR4',
    MAPPED_MODEL: 'PM001',
    MODEL_DESCRIPTION: 'Laptop model A',
    MAX_USED_QTY: 2,
    SERVICE_LEVEL: 'CRITICAL',
    PART_LOCATION: 'Shelf A1',
    STATUS: 'ACTIVE',
    LAST_UPDATED_DATE: new Date('2024-01-01')
  },
  {
    BRAND: 'Brand B',
    PART: 'SSD 256GB',
    ModelID: null,
    DESCRIPTION: 'Solid state drive 256GB NVMe',
    MAPPED_MODEL: 'PM002',
    MODEL_DESCRIPTION: 'Desktop model B',
    MAX_USED_QTY: 1,
    SERVICE_LEVEL: 'HIGH',
    PART_LOCATION: 'Shelf B2',
    STATUS: 'ACTIVE',
    LAST_UPDATED_DATE: new Date('2024-01-05')
  },
  {
    BRAND: 'Brand A',
    PART: 'Battery Pack',
    ModelID: null,
    DESCRIPTION: 'Replacement battery pack',
    MAPPED_MODEL: 'PM003',
    MODEL_DESCRIPTION: 'Tablet model C',
    MAX_USED_QTY: 3,
    SERVICE_LEVEL: 'MEDIUM',
    PART_LOCATION: 'Shelf C3',
    STATUS: 'ACTIVE',
    LAST_UPDATED_DATE: new Date('2024-01-10')
  }
];

// Sample data for States
const stateSampleData = [
  {
    name: 'Maharashtra',
    code: 'MH',
    description: 'Maharashtra State in India'
  },
  {
    name: 'Gujarat',
    code: 'GJ',
    description: 'Gujarat State in India'
  },
  {
    name: 'Karnataka',
    code: 'KA',
    description: 'Karnataka State in India'
  },
  {
    name: 'Tamil Nadu',
    code: 'TN',
    description: 'Tamil Nadu State in India'
  }
];

// Sample data for Cities
const citySampleData = [
  {
    city_name: 'Mumbai',
    state_name: 'Maharashtra',
    state_id: null,
    description: 'Capital of Maharashtra'
  },
  {
    city_name: 'Pune',
    state_name: 'Maharashtra',
    state_id: null,
    description: 'City in Maharashtra'
  },
  {
    city_name: 'Ahmednagar',
    state_name: 'Maharashtra',
    state_id: null,
    description: 'City in Maharashtra'
  },
  {
    city_name: 'Bangalore',
    state_name: 'Karnataka',
    state_id: null,
    description: 'Capital of Karnataka'
  }
];

// Sample data for Pincodes
const pincodeSampleData = [
  {
    pincode: '400001',
    city_id: null,
    state: 'Maharashtra',
    description: 'Mumbai postal code'
  },
  {
    pincode: '411001',
    city_id: null,
    state: 'Maharashtra',
    description: 'Pune postal code'
  },
  {
    pincode: '560001',
    city_id: null,
    state: 'Karnataka',
    description: 'Bangalore postal code'
  }
];

// Sample data for Products (ProductMaster)
const productSampleData = [
  {
    VALUE: 'Laptop Pro',
    DESCRIPTION: 'Professional laptop computer',
    Product_group_ID: null
  },
  {
    VALUE: 'Desktop Workstation',
    DESCRIPTION: 'High-end desktop workstation',
    Product_group_ID: null
  },
  {
    VALUE: 'Tablet Device',
    DESCRIPTION: 'Portable tablet device',
    Product_group_ID: null
  },
  {
    VALUE: 'Monitor UltraHD',
    DESCRIPTION: 'Ultra HD display monitor',
    Product_group_ID: null
  },
  {
    VALUE: 'Keyboard Mechanical',
    DESCRIPTION: 'Mechanical gaming keyboard',
    Product_group_ID: null
  }
];

// Sample data for ProductGroups
const productGroupSampleData = [
  {
    name: 'Electronics',
    description: 'Electronic products and devices'
  },
  {
    name: 'Computers',
    description: 'Computer hardware'
  },
  {
    name: 'Accessories',
    description: 'Computer accessories'
  }
];

async function generateExcelTemplates() {
  try {
    // ProductModels
    console.log('📊 Generating ProductModel template...');
    const pmWorkbook = new ExcelJS.Workbook();
    const pmSheet = pmWorkbook.addWorksheet('ProductModels');
    
    // Add headers
    pmSheet.columns = [
      { header: 'MODEL_CODE', key: 'MODEL_CODE', width: 15 },
      { header: 'Product', key: 'Product', width: 12 },
      { header: 'BRAND', key: 'BRAND', width: 15 },
      { header: 'PRODUCT', key: 'PRODUCT', width: 15 },
      { header: 'MODEL_DESCRIPTION', key: 'MODEL_DESCRIPTION', width: 30 },
      { header: 'PRICE', key: 'PRICE', width: 12 },
      { header: 'SERIALIZED_FLAG', key: 'SERIALIZED_FLAG', width: 15 },
      { header: 'WARRANTY_IN_MONTHS', key: 'WARRANTY_IN_MONTHS', width: 18 },
      { header: 'VALID_FROM', key: 'VALID_FROM', width: 15 }
    ];
    
    // Style header
    pmSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    pmSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
    
    // Add sample data
    productModelSampleData.forEach(row => {
      pmSheet.addRow(row);
    });
    
    await pmWorkbook.xlsx.writeFile(path.join(__dirname, 'uploads', 'ProductModels_Template.xlsx'));
    console.log('✓ ProductModels_Template.xlsx created');

    // SpareParts
    console.log('📊 Generating SpareParts template...');
    const spWorkbook = new ExcelJS.Workbook();
    const spSheet = spWorkbook.addWorksheet('SpareParts');
    
    spSheet.columns = [
      { header: 'BRAND', key: 'BRAND', width: 15 },
      { header: 'PART', key: 'PART', width: 25 },
      { header: 'ModelID', key: 'ModelID', width: 12 },
      { header: 'DESCRIPTION', key: 'DESCRIPTION', width: 25 },
      { header: 'MAPPED_MODEL', key: 'MAPPED_MODEL', width: 15 },
      { header: 'MODEL_DESCRIPTION', key: 'MODEL_DESCRIPTION', width: 25 },
      { header: 'MAX_USED_QTY', key: 'MAX_USED_QTY', width: 12 },
      { header: 'SERVICE_LEVEL', key: 'SERVICE_LEVEL', width: 12 },
      { header: 'PART_LOCATION', key: 'PART_LOCATION', width: 15 },
      { header: 'STATUS', key: 'STATUS', width: 10 },
      { header: 'LAST_UPDATED_DATE', key: 'LAST_UPDATED_DATE', width: 18 }
    ];
    
    spSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    spSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF70AD47' } };
    
    sparePartSampleData.forEach(row => {
      spSheet.addRow(row);
    });
    
    await spWorkbook.xlsx.writeFile(path.join(__dirname, 'uploads', 'SpareParts_Template.xlsx'));
    console.log('✓ SpareParts_Template.xlsx created');

    // States
    console.log('📊 Generating States template...');
    const stateWorkbook = new ExcelJS.Workbook();
    const stateSheet = stateWorkbook.addWorksheet('States');
    
    stateSheet.columns = [
      { header: 'name', key: 'name', width: 20 },
      { header: 'code', key: 'code', width: 10 },
      { header: 'description', key: 'description', width: 30 }
    ];
    
    stateSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    stateSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC000' } };
    
    stateSampleData.forEach(row => {
      stateSheet.addRow(row);
    });
    
    await stateWorkbook.xlsx.writeFile(path.join(__dirname, 'uploads', 'States_Template.xlsx'));
    console.log('✓ States_Template.xlsx created');

    // Cities
    console.log('📊 Generating Cities template...');
    const cityWorkbook = new ExcelJS.Workbook();
    const citySheet = cityWorkbook.addWorksheet('Cities');
    
    citySheet.columns = [
      { header: 'city_name', key: 'city_name', width: 20 },
      { header: 'state_name', key: 'state_name', width: 20 },
      { header: 'state_id', key: 'state_id', width: 12 },
      { header: 'description', key: 'description', width: 30 }
    ];
    
    citySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    citySheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC55A11' } };
    
    citySampleData.forEach(row => {
      citySheet.addRow(row);
    });
    
    await cityWorkbook.xlsx.writeFile(path.join(__dirname, 'uploads', 'Cities_Template.xlsx'));
    console.log('✓ Cities_Template.xlsx created');

    // Pincodes
    console.log('📊 Generating Pincodes template...');
    const pinWorkbook = new ExcelJS.Workbook();
    const pinSheet = pinWorkbook.addWorksheet('Pincodes');
    
    pinSheet.columns = [
      { header: 'pincode', key: 'pincode', width: 15 },
      { header: 'city_id', key: 'city_id', width: 12 },
      { header: 'state', key: 'state', width: 20 },
      { header: 'description', key: 'description', width: 30 }
    ];
    
    pinSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    pinSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF92D050' } };
    
    pincodeSampleData.forEach(row => {
      pinSheet.addRow(row);
    });
    
    await pinWorkbook.xlsx.writeFile(path.join(__dirname, 'uploads', 'Pincodes_Template.xlsx'));
    console.log('✓ Pincodes_Template.xlsx created');

    // Products
    console.log('📊 Generating Products template...');
    const prodWorkbook = new ExcelJS.Workbook();
    const prodSheet = prodWorkbook.addWorksheet('Products');
    
    prodSheet.columns = [
      { header: 'VALUE', key: 'VALUE', width: 25 },
      { header: 'DESCRIPTION', key: 'DESCRIPTION', width: 35 },
      { header: 'Product_group_ID', key: 'Product_group_ID', width: 18 }
    ];
    
    prodSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    prodSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5B9BD5' } };
    
    productSampleData.forEach(row => {
      prodSheet.addRow(row);
    });
    
    await prodWorkbook.xlsx.writeFile(path.join(__dirname, 'uploads', 'Products_Template.xlsx'));
    console.log('✓ Products_Template.xlsx created');

    // ProductGroups
    console.log('📊 Generating ProductGroups template...');
    const pgWorkbook = new ExcelJS.Workbook();
    const pgSheet = pgWorkbook.addWorksheet('ProductGroups');
    
    pgSheet.columns = [
      { header: 'name', key: 'name', width: 20 },
      { header: 'description', key: 'description', width: 40 }
    ];
    
    pgSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    pgSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF70AD47' } };
    
    productGroupSampleData.forEach(row => {
      pgSheet.addRow(row);
    });
    
    await pgWorkbook.xlsx.writeFile(path.join(__dirname, 'uploads', 'ProductGroups_Template.xlsx'));
    console.log('✓ ProductGroups_Template.xlsx created');

    console.log('\n✅ All template files generated successfully!');
    console.log('📁 Location: server/uploads/');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error generating templates:', error);
    process.exit(1);
  }
}

generateExcelTemplates();
