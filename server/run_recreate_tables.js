import sequelize from './database/connection.js';

const statements = [
  "IF OBJECT_ID('dbo.spare_parts', 'U') IS NOT NULL DROP TABLE dbo.spare_parts;",
  "IF OBJECT_ID('dbo.ProductModels', 'U') IS NOT NULL DROP TABLE dbo.ProductModels;",
  "IF OBJECT_ID('dbo.ProductMaster', 'U') IS NOT NULL DROP TABLE dbo.ProductMaster;",

  `CREATE TABLE ProductMaster (
    ID INT IDENTITY(1,1) PRIMARY KEY,
    VALUE NVARCHAR(200) NOT NULL,
    DESCRIPTION NVARCHAR(255) NULL,
    Product_group_ID INT NULL,
    CreatedAt DATETIMEOFFSET NULL,
    UpdatedAt DATETIMEOFFSET NULL
  );`,

  `CREATE TABLE ProductModels (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    BRAND NVARCHAR(200) NULL,
    PRODUCT INT NULL,
    MODEL_CODE NVARCHAR(200) NOT NULL,
    MODEL_DESCRIPTION NVARCHAR(MAX) NULL,
    PRICE DECIMAL(18,2) NULL,
    SERIALIZED_FLAG NVARCHAR(10) NULL,
    WARRANTY_IN_MONTHS INT NULL,
    VALID_FROM DATETIMEOFFSET NULL
  );`,

  `CREATE TABLE spare_parts (
    spare_part_id INT IDENTITY(1,1) PRIMARY KEY,
    ModelID INT NULL,
    BRAND VARCHAR(100) NOT NULL,
    PART VARCHAR(100) NOT NULL,
    MAPPED_MODEL VARCHAR(50) NULL,
    MODEL_DESCRIPTION VARCHAR(255) NULL,
    MAX_USED_QTY INT NULL,
    SERVICE_LEVEL VARCHAR(50) NULL,
    PART_LOCATION VARCHAR(100) NULL,
    STATUS VARCHAR(50) NULL,
    LAST_UPDATED_DATE DATETIME NULL,
    uom NVARCHAR(50) NULL,
    spare_name NVARCHAR(200) NULL,
    spare_code NVARCHAR(100) NULL,
    description NVARCHAR(MAX) NULL,
    unit_price DECIMAL(18,2) NULL,
    gst_rate DECIMAL(5,2) NULL,
    is_active BIT NULL,
    created_at DATETIMEOFFSET NULL,
    updated_at DATETIMEOFFSET NULL
  );`,

  "ALTER TABLE ProductModels ADD CONSTRAINT UQ_ProductModels_MODEL_CODE UNIQUE (MODEL_CODE);",
  "ALTER TABLE ProductModels ADD CONSTRAINT FK_ProductModels_ProductMaster FOREIGN KEY (PRODUCT) REFERENCES ProductMaster(ID) ON UPDATE CASCADE ON DELETE SET NULL;",
  "ALTER TABLE spare_parts ADD CONSTRAINT FK_SpareParts_ProductModels FOREIGN KEY (ModelID) REFERENCES ProductModels(Id) ON UPDATE CASCADE ON DELETE SET NULL;",
];

async function main() {
  try {
    console.log('Dropping and recreating ProductMaster, ProductModels, spare_parts...');
    for (const stmt of statements) {
      try {
        await sequelize.query(stmt);
        console.log('OK:', stmt.split('\n')[0].slice(0, 120));
      } catch (e) {
        console.warn('Statement failed (continuing):', stmt.split('\n')[0].slice(0,120));
        const util = await import('util');
        console.warn(util.inspect(e, { depth: 3 }));
      }
    }
    console.log('✓ Tables recreated (best-effort)');
  } catch (err) {
    console.error('Error recreating tables:');
    console.error(err);
    process.exitCode = 1;
  } finally {
    try { await sequelize.close(); } catch (e) {}
  }
}

main();
