-- Add C&F Approval Date and C&F Rejection Date columns to SpareRequests table
-- This tracks when the C&F (Corporate & Field) approves or rejects the DCF
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'SpareRequests' AND COLUMN_NAME = 'CfApprovalDate')
BEGIN
  ALTER TABLE SpareRequests ADD CfApprovalDate DATETIME NULL;
  PRINT 'CfApprovalDate column added to SpareRequests.';
END
ELSE
BEGIN
  PRINT 'CfApprovalDate column already exists in SpareRequests.';
END

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'SpareRequests' AND COLUMN_NAME = 'CfRejectionDate')
BEGIN
  ALTER TABLE SpareRequests ADD CfRejectionDate DATETIME NULL;
  PRINT 'CfRejectionDate column added to SpareRequests.';
END
ELSE
BEGIN
  PRINT 'CfRejectionDate column already exists in SpareRequests.';
END
