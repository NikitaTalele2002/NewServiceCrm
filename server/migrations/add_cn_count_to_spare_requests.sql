-- Add CN (Credit Note) Count column to SpareRequests table

IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_NAME = 'SpareRequests' AND COLUMN_NAME = 'CnCount'
)
BEGIN
  ALTER TABLE SpareRequests
  ADD CnCount INT NULL DEFAULT 0;
END
