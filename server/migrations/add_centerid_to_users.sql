-- Add CenterId to Users table
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Users' AND COLUMN_NAME = 'CenterId')
BEGIN
  ALTER TABLE Users ADD CenterId INT NULL;
  PRINT 'CenterId column added to Users table successfully';
END
ELSE
BEGIN
  PRINT 'CenterId column already exists in Users table';
END