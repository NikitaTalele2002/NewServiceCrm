-- Alter TechnicianStatusRequests table to add technician detail fields and make TechnicianId nullable
IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'TechnicianStatusRequests')
BEGIN
  -- Add new columns
  IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'TechnicianStatusRequests' AND COLUMN_NAME = 'TechnicianName')
  BEGIN
    ALTER TABLE TechnicianStatusRequests ADD TechnicianName NVARCHAR(255);
    PRINT 'Added TechnicianName column to TechnicianStatusRequests';
  END

  IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'TechnicianStatusRequests' AND COLUMN_NAME = 'TechnicianMobile')
  BEGIN
    ALTER TABLE TechnicianStatusRequests ADD TechnicianMobile NVARCHAR(20);
    PRINT 'Added TechnicianMobile column to TechnicianStatusRequests';
  END

  IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'TechnicianStatusRequests' AND COLUMN_NAME = 'TechnicianEmail')
  BEGIN
    ALTER TABLE TechnicianStatusRequests ADD TechnicianEmail NVARCHAR(255);
    PRINT 'Added TechnicianEmail column to TechnicianStatusRequests';
  END

  -- Make TechnicianId nullable
  IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'TechnicianStatusRequests' AND COLUMN_NAME = 'TechnicianId')
  BEGIN
    ALTER TABLE TechnicianStatusRequests ALTER COLUMN TechnicianId INT NULL;
    PRINT 'Made TechnicianId nullable in TechnicianStatusRequests';
  END
END
ELSE
BEGIN
  PRINT 'TechnicianStatusRequests table does not exist';
END