-- Add ReceivedQty and RejectedQty to SpareRequestItems table
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'SpareRequestItems' AND COLUMN_NAME = 'ReceivedQty')
BEGIN
  ALTER TABLE SpareRequestItems ADD ReceivedQty INT DEFAULT 0;
  PRINT 'ReceivedQty column added to SpareRequestItems.';
END
ELSE
BEGIN
  PRINT 'ReceivedQty column already exists in SpareRequestItems.';
END


