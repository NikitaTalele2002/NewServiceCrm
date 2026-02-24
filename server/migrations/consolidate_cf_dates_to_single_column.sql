-- Drop CfRejectionDate column and keep only CfApprovalDate
-- Both approval and rejection dates will now be stored in a single CfApprovalDate column

IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'SpareRequests' AND COLUMN_NAME = 'CfRejectionDate')
BEGIN
  ALTER TABLE SpareRequests DROP COLUMN CfRejectionDate;
  PRINT 'CfRejectionDate column dropped from SpareRequests.';
END
ELSE
BEGIN
  PRINT 'CfRejectionDate column does not exist in SpareRequests.';
END


-- Rename CfApprovalDate to CfApprovalRejectionDate for clarity (optional - comment out if not needed)
-- IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'SpareRequests' AND COLUMN_NAME = 'CfApprovalDate')
-- BEGIN
--   EXEC sp_rename 'SpareRequests.CfApprovalDate', 'CfApprovalRejectionDate', 'COLUMN';
--   PRINT 'CfApprovalDate renamed to CfApprovalRejectionDate.';
-- END


