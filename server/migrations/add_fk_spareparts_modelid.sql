-- Migration to add ModelID column, populate it, and add foreign key constraint for SpareParts.ModelID -> ProductModels.Id
-- Run this in MSSQL

-- Add the column if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('SpareParts') AND name = 'ModelID')
BEGIN
    ALTER TABLE SpareParts ADD ModelID INT NULL;
END

-- Populate ModelID based on MAPPED_MODEL matching ProductModels.MODEL_CODE
UPDATE SpareParts
SET ModelID = pm.Id
FROM SpareParts sp
INNER JOIN ProductModels pm ON sp.MAPPED_MODEL = pm.MODEL_CODE
WHERE sp.ModelID IS NULL;

-- Add the foreign key constraint if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_SpareParts_ModelID')
BEGIN
    ALTER TABLE SpareParts
    ADD CONSTRAINT FK_SpareParts_ModelID
    FOREIGN KEY (ModelID) REFERENCES ProductModels(Id)
    ON UPDATE CASCADE
    ON DELETE SET NULL;
END
