-- Create Technicians table
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Technicians')
BEGIN
  CREATE TABLE Technicians (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    ServiceCenterId INT NOT NULL,
    Name NVARCHAR(255) NOT NULL,
    Mobile NVARCHAR(20),
    Email NVARCHAR(255),
    Status NVARCHAR(50) DEFAULT 'inactive',
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    UpdatedAt DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (ServiceCenterId) REFERENCES ServiceCenters(Id)
  );
  PRINT 'Technicians table created successfully';
END
ELSE
BEGIN
  PRINT 'Technicians table already exists';
END

-- Create TechnicianStatusRequests table
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'TechnicianStatusRequests')
BEGIN
  CREATE TABLE TechnicianStatusRequests (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    TechnicianId INT NOT NULL,
    RequestedBy INT NOT NULL, -- FK to Users table
    RequestType NVARCHAR(50) NOT NULL, -- 'activate' or 'deactivate'
    Status NVARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    RequestedAt DATETIME2 DEFAULT GETDATE(),
    ApprovedAt DATETIME2 NULL,
    ApprovedBy INT NULL, -- FK to Users table
    Notes NVARCHAR(1000),
    FOREIGN KEY (TechnicianId) REFERENCES Technicians(Id),
    FOREIGN KEY (RequestedBy) REFERENCES Users(UserID),
    FOREIGN KEY (ApprovedBy) REFERENCES Users(UserID)
  );
  PRINT 'TechnicianStatusRequests table created successfully';
END
ELSE
BEGIN
  PRINT 'TechnicianStatusRequests table already exists';
END