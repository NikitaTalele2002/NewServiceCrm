-- Add ReturnType column to SpareRequests table
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'SpareRequests' AND COLUMN_NAME = 'ReturnType')
BEGIN
  ALTER TABLE SpareRequests
  ADD ReturnType NVARCHAR(50) NULL;
  
  PRINT 'ReturnType column added to SpareRequests successfully';
END
ELSE
BEGIN
  PRINT 'ReturnType column already exists';
END