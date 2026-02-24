IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'SpareRequests' AND COLUMN_NAME = 'RequestType')
BEGIN
  ALTER TABLE SpareRequests
  ADD RequestType NVARCHAR(50) NULL;
  
  PRINT 'RequestType column added to SpareRequests successfully';
END
ELSE
BEGIN
  PRINT 'RequestType column already exists';
END

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'SpareRequests' AND COLUMN_NAME = 'NumberOfMasterCarton')
BEGIN
  ALTER TABLE SpareRequests
  ADD NumberOfMasterCarton INT NULL;
  
  PRINT 'NumberOfMasterCarton column added to SpareRequests successfully';
END
ELSE
BEGIN
  PRINT 'NumberOfMasterCarton column already exists';
END