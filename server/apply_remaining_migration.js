import sequelize from './database/connection.js';

async function colExists(table, column) {
  const sql = `SELECT 1 AS exists_flag FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${table}' AND COLUMN_NAME = '${column}'`;
  const [rows] = await sequelize.query(sql);
  return rows.length > 0;
}

async function run() {
  try {
    console.log('Applying remaining migration steps...');

    // ModelID
    const hasModelID = await colExists('spare_parts', 'ModelID');
    const has_model_id = await colExists('spare_parts', 'model_id');
    if (!hasModelID) {
      if (has_model_id) {
        console.log('Adding ModelID and copying values from model_id');
        await sequelize.query("ALTER TABLE spare_parts ADD ModelID INT NULL;");
        await sequelize.query("UPDATE spare_parts SET ModelID = model_id WHERE ModelID IS NULL;");
        try {
          await sequelize.query("ALTER TABLE spare_parts ADD CONSTRAINT FK_SpareParts_ProductModels FOREIGN KEY (ModelID) REFERENCES ProductModels(Id) ON UPDATE CASCADE ON DELETE SET NULL;");
        } catch (e) {
          console.warn('Could not add FK constraint (may already exist):', e.message);
        }
      } else {
        console.log('No existing model_id column found; adding ModelID (empty)');
        await sequelize.query("ALTER TABLE spare_parts ADD ModelID INT NULL;");
      }
    } else {
      console.log('ModelID already present');
    }

    // BRAND
    const hasBrand = await colExists('spare_parts', 'BRAND');
    const hasSpareName = await colExists('spare_parts', 'spare_name');
    if (!hasBrand) {
      console.log('Adding BRAND column');
      await sequelize.query("ALTER TABLE spare_parts ADD BRAND VARCHAR(100) NULL;");
      if (hasSpareName) {
        await sequelize.query("UPDATE spare_parts SET BRAND = spare_name WHERE BRAND IS NULL;");
      }
    }
    // Make BRAND NOT NULL with defaults
    if (await colExists('spare_parts', 'BRAND')) {
      await sequelize.query("UPDATE spare_parts SET BRAND = 'UNKNOWN' WHERE BRAND IS NULL OR BRAND = '';" );
      try {
        await sequelize.query("ALTER TABLE spare_parts ALTER COLUMN BRAND VARCHAR(100) NOT NULL;");
      } catch (e) {
        console.warn('Could not alter BRAND to NOT NULL:', e.message);
      }
    }

    // PART
    const hasPart = await colExists('spare_parts', 'PART');
    if (!hasPart) {
      console.log('Adding PART column');
      await sequelize.query("ALTER TABLE spare_parts ADD PART VARCHAR(100) NULL;");
      if (hasSpareName) {
        await sequelize.query("UPDATE spare_parts SET PART = spare_name WHERE PART IS NULL;");
      }
    }
    if (await colExists('spare_parts', 'PART')) {
      await sequelize.query("UPDATE spare_parts SET PART = 'UNKNOWN' WHERE PART IS NULL OR PART = '';" );
      try {
        await sequelize.query("ALTER TABLE spare_parts ALTER COLUMN PART VARCHAR(100) NOT NULL;");
      } catch (e) {
        console.warn('Could not alter PART to NOT NULL:', e.message);
      }
    }

    console.log('Remaining migration steps applied (best-effort).');
  } catch (err) {
    console.error('Error applying remaining migration steps:', err);
  } finally {
    try { await sequelize.close(); } catch (e) {}
  }
}

run();
