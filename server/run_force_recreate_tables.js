import sequelize from './database/connection.js';

async function run() {
  try {
    console.log('Dropping foreign keys referencing ProductMaster/ProductModels/spare_parts...');

    const target = ['ProductMaster','ProductModels','spare_parts'];
    const q = `
      SELECT fk.name AS fk_name,
             SCHEMA_NAME(pt.schema_id) AS parent_schema,
             OBJECT_NAME(fk.parent_object_id) AS parent_table
      FROM sys.foreign_keys fk
      JOIN sys.tables pt ON fk.parent_object_id = pt.object_id
      WHERE OBJECT_NAME(fk.referenced_object_id) IN (${target.map(t => `'${t}'`).join(',')})
    `;

    const [fks] = await sequelize.query(q, { raw: true });
    for (const row of fks) {
      const stmt = `ALTER TABLE [${row.parent_schema}].[${row.parent_table}] DROP CONSTRAINT [${row.fk_name}]`;
      try {
        await sequelize.query(stmt);
        console.log('Dropped FK:', row.fk_name, 'on', `${row.parent_schema}.${row.parent_table}`);
      } catch (e) {
        console.warn('Failed dropping FK (continuing):', row.fk_name, e && e.message);
      }
    }

    console.log('Force-dropping target tables...');
    const drops = [
      "IF OBJECT_ID('dbo.spare_parts','U') IS NOT NULL DROP TABLE dbo.spare_parts;",
      "IF OBJECT_ID('dbo.ProductModels','U') IS NOT NULL DROP TABLE dbo.ProductModels;",
      "IF OBJECT_ID('dbo.ProductMaster','U') IS NOT NULL DROP TABLE dbo.ProductMaster;",
    ];
    for (const d of drops) {
      try { await sequelize.query(d); console.log('OK:', d.split('\n')[0]); } catch (e) { console.warn('Drop failed (continuing):', e && e.message); }
    }

    console.log('Creating tables...');
    // reuse schema from previous script
    const createStatements = [
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
       );`
    ];
    for (const s of createStatements) {
      try { await sequelize.query(s); console.log('Created: ', s.split('\n')[0]); } catch (e) { console.warn('Create failed (continuing):', e && e.message); }
    }

    // add constraints
    try { await sequelize.query("ALTER TABLE ProductModels ADD CONSTRAINT UQ_ProductModels_MODEL_CODE UNIQUE (MODEL_CODE);"); console.log('Added unique constraint'); } catch(e){console.warn('Unique constraint add failed:', e && e.message)}
    try { await sequelize.query("ALTER TABLE ProductModels ADD CONSTRAINT FK_ProductModels_ProductMaster FOREIGN KEY (PRODUCT) REFERENCES ProductMaster(ID) ON UPDATE CASCADE ON DELETE SET NULL;"); console.log('Added FK ProductModels->ProductMaster'); } catch(e){console.warn('FK add failed:', e && e.message)}
    try { await sequelize.query("ALTER TABLE spare_parts ADD CONSTRAINT FK_SpareParts_ProductModels FOREIGN KEY (ModelID) REFERENCES ProductModels(Id) ON UPDATE CASCADE ON DELETE SET NULL;"); console.log('Added FK spare_parts->ProductModels'); } catch(e){console.warn('FK add failed:', e && e.message)}

    console.log('Force recreate completed');
  } catch (err) {
    console.error('Force recreate failed:', err && err.message ? err.message : err);
  } finally {
    try { await sequelize.close(); } catch (e) {}
  }
}

run();
