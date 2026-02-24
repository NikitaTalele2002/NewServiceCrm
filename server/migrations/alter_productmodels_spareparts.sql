-- Migration: Alter ProductModels and SpareParts tables to match new model structure
-- This file adds foreign keys and adjusts table structure

BEGIN TRANSACTION;

-- ================== ALTER ProductModels TABLE ==================
-- Add ProductID column if it doesn't exist (FK to ProductMaster)
IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_NAME = 'ProductModels' AND COLUMN_NAME = 'Product'
)
BEGIN
  ALTER TABLE ProductModels
  ADD Product INT NULL;
  
  -- Add foreign key constraint (use dynamic SQL to avoid compile-time name resolution)
  EXEC('ALTER TABLE ProductModels ADD CONSTRAINT FK_ProductModels_ProductMaster FOREIGN KEY ([Product]) REFERENCES ProductMaster(ID) ON UPDATE CASCADE ON DELETE SET NULL');
  
  PRINT 'Added Product (FK) column to ProductModels';
END;

-- Ensure MODEL_CODE is unique and NOT NULL if not already
IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE 
  WHERE TABLE_NAME = 'ProductModels' AND CONSTRAINT_NAME LIKE '%UQ%MODEL_CODE%'
)
BEGIN
  -- If MODEL_CODE exists and is nullable, populate NULLs and make NOT NULL
  IF EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'ProductModels' AND COLUMN_NAME = 'MODEL_CODE' AND IS_NULLABLE = 'YES'
  )
  BEGIN
    ;WITH cte AS (
      SELECT Id, ROW_NUMBER() OVER (ORDER BY Id) AS rn
      FROM ProductModels
      WHERE MODEL_CODE IS NULL
    )
    UPDATE pm
    SET MODEL_CODE = 'UNKNOWN_' + CAST(cte.rn AS VARCHAR(20))
    FROM ProductModels pm
    JOIN cte ON pm.Id = cte.Id;

    -- Alter column to NOT NULL
    ALTER TABLE ProductModels
    ALTER COLUMN MODEL_CODE VARCHAR(200) NOT NULL;

    PRINT 'Updated MODEL_CODE to NOT NULL';
  END;
  
  -- Add unique constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM sys.indexes 
    WHERE NAME LIKE '%UQ%MODEL_CODE%' AND OBJECT_ID = OBJECT_ID('ProductModels')
  )
  BEGIN
    ALTER TABLE ProductModels
    ADD CONSTRAINT UQ_ProductModels_MODEL_CODE UNIQUE (MODEL_CODE);
    PRINT 'Added UNIQUE constraint to MODEL_CODE';
  END;
END;

-- ================== ALTER spare_parts TABLE ==================
-- Handle existing model_id or add new ModelID column and copy values
IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_NAME = 'spare_parts' AND COLUMN_NAME IN ('ModelID','model_id')
)
BEGIN
  EXEC('ALTER TABLE spare_parts ADD ModelID INT NULL; ALTER TABLE spare_parts ADD CONSTRAINT FK_SpareParts_ProductModels FOREIGN KEY (ModelID) REFERENCES ProductModels(Id) ON UPDATE CASCADE ON DELETE SET NULL;');
  PRINT 'Added ModelID (FK) column to spare_parts';
END
ELSE IF EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'spare_parts' AND COLUMN_NAME = 'model_id'
) AND NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'spare_parts' AND COLUMN_NAME = 'ModelID'
)
BEGIN
  EXEC('ALTER TABLE spare_parts ADD ModelID INT NULL; UPDATE spare_parts SET ModelID = model_id WHERE ModelID IS NULL; ALTER TABLE spare_parts ADD CONSTRAINT FK_SpareParts_ProductModels FOREIGN KEY (ModelID) REFERENCES ProductModels(Id) ON UPDATE CASCADE ON DELETE SET NULL;');
  PRINT 'Added ModelID and copied values from existing model_id';
END;

-- Ensure BRAND exists; if spare_name exists copy it into BRAND
IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_NAME = 'spare_parts' AND COLUMN_NAME = 'BRAND'
)
BEGIN
  IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'spare_parts' AND COLUMN_NAME = 'spare_name')
  BEGIN
    EXEC('ALTER TABLE spare_parts ADD BRAND VARCHAR(100) NULL; UPDATE spare_parts SET BRAND = spare_name WHERE BRAND IS NULL;');
    PRINT 'Added BRAND column and copied from spare_name';
  END
  ELSE
  BEGIN
    ALTER TABLE spare_parts ADD BRAND VARCHAR(100) NULL;
    PRINT 'Added BRAND column';
  END
END;

IF EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_NAME = 'spare_parts' AND COLUMN_NAME = 'BRAND' AND IS_NULLABLE = 'YES'
)
BEGIN
  EXEC('UPDATE spare_parts SET BRAND = ''UNKNOWN'' WHERE BRAND IS NULL OR BRAND = ''''; ALTER TABLE spare_parts ALTER COLUMN BRAND VARCHAR(100) NOT NULL;');
  PRINT 'Updated BRAND to NOT NULL';
END;

-- Ensure PART exists; if spare_name exists copy it into PART
IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_NAME = 'spare_parts' AND COLUMN_NAME = 'PART'
)
BEGIN
  IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'spare_parts' AND COLUMN_NAME = 'spare_name')
  BEGIN
    EXEC('ALTER TABLE spare_parts ADD PART VARCHAR(100) NULL; UPDATE spare_parts SET PART = spare_name WHERE PART IS NULL;');
    PRINT 'Added PART column and copied from spare_name';
  END
  ELSE
  BEGIN
    ALTER TABLE spare_parts ADD PART VARCHAR(100) NULL;
    PRINT 'Added PART column';
  END
END;

IF EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_NAME = 'spare_parts' AND COLUMN_NAME = 'PART' AND IS_NULLABLE = 'YES'
)
BEGIN
  EXEC('UPDATE spare_parts SET PART = ''UNKNOWN'' WHERE PART IS NULL OR PART = ''''; ALTER TABLE spare_parts ALTER COLUMN PART VARCHAR(100) NOT NULL;');
  PRINT 'Updated PART to NOT NULL';
END;

-- Add missing columns to spare_parts if they don't exist
IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_NAME = 'spare_parts' AND COLUMN_NAME = 'MAPPED_MODEL'
)
BEGIN
  ALTER TABLE spare_parts
  ADD MAPPED_MODEL VARCHAR(50) NULL;
  PRINT 'Added MAPPED_MODEL column';
END;

IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_NAME = 'spare_parts' AND COLUMN_NAME = 'MODEL_DESCRIPTION'
)
BEGIN
  ALTER TABLE spare_parts
  ADD MODEL_DESCRIPTION VARCHAR(255) NULL;
  PRINT 'Added MODEL_DESCRIPTION column';
END;

IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_NAME = 'spare_parts' AND COLUMN_NAME = 'MAX_USED_QTY'
)
BEGIN
  ALTER TABLE spare_parts
  ADD MAX_USED_QTY INT NULL;
  PRINT 'Added MAX_USED_QTY column';
END;

IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_NAME = 'spare_parts' AND COLUMN_NAME = 'SERVICE_LEVEL'
)
BEGIN
  ALTER TABLE spare_parts
  ADD SERVICE_LEVEL VARCHAR(50) NULL;
  PRINT 'Added SERVICE_LEVEL column';
END;

IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_NAME = 'spare_parts' AND COLUMN_NAME = 'PART_LOCATION'
)
BEGIN
  ALTER TABLE spare_parts
  ADD PART_LOCATION VARCHAR(100) NULL;
  PRINT 'Added PART_LOCATION column';
END;

IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_NAME = 'spare_parts' AND COLUMN_NAME = 'STATUS'
)
BEGIN
  ALTER TABLE spare_parts
  ADD STATUS VARCHAR(50) NULL;
  PRINT 'Added STATUS column';
END;

IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_NAME = 'spare_parts' AND COLUMN_NAME = 'LAST_UPDATED_DATE'
)
BEGIN
  ALTER TABLE spare_parts
  ADD LAST_UPDATED_DATE DATETIME NULL;
  PRINT 'Added LAST_UPDATED_DATE column';
END;

COMMIT TRANSACTION;

PRINT 'Migration completed successfully!';
PRINT 'ProductModels and spare_parts tables have been updated to match the new model structure.';
