-- Create Groups table for product groups/categories
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Groups]') AND type in (N'U'))        
BEGIN
    CREATE TABLE Groups (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Code NVARCHAR(100) NOT NULL UNIQUE,
        Name NVARCHAR(255) NULL,
        CreatedAt DATETIME DEFAULT GETDATE(),
        UpdatedAt DATETIME DEFAULT GETDATE()
    );

    CREATE INDEX IX_Groups_Code ON Groups(Code);
    PRINT 'Table Groups created successfully';
END
ELSE
BEGIN
    PRINT 'Table Groups already exists';
END

-- Create ProductsMaster table for product master data
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[ProductsMaster]') AND type in (N'U'))
BEGIN
    CREATE TABLE ProductsMaster (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        ProductCode NVARCHAR(100) NOT NULL UNIQUE,
        ProductName NVARCHAR(255) NULL,
        GroupCode NVARCHAR(100) NULL,
        HSN NVARCHAR(50) NULL,
        CreatedAt DATETIME DEFAULT GETDATE(),
        UpdatedAt DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (GroupCode) REFERENCES Groups(Code)
    );

    CREATE INDEX IX_ProductsMaster_Code ON ProductsMaster(ProductCode);
    CREATE INDEX IX_ProductsMaster_GroupCode ON ProductsMaster(GroupCode);
    PRINT 'Table ProductsMaster created successfully';
END
ELSE
BEGIN
    PRINT 'Table ProductsMaster already exists';
END

-- Create PincodeMasters table for pincode/city/state master data
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[PincodeMasters]') AND type in (N'U'))
BEGIN
    CREATE TABLE PincodeMasters (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        StateCode NVARCHAR(50) NULL,
        StateName NVARCHAR(255) NULL,
        CityCode NVARCHAR(50) NULL,
        CityName NVARCHAR(255) NULL,
        Pincode NVARCHAR(20) NOT NULL UNIQUE,
        CreatedAt DATETIME DEFAULT GETDATE(),
        UpdatedAt DATETIME DEFAULT GETDATE()
    );

    CREATE INDEX IX_PincodeMasters_Pincode ON PincodeMasters(Pincode);
    CREATE INDEX IX_PincodeMasters_State ON PincodeMasters(StateCode);
    CREATE INDEX IX_PincodeMasters_City ON PincodeMasters(CityCode);
    PRINT 'Table PincodeMasters created successfully';
END
ELSE
BEGIN
    PRINT 'Table PincodeMasters already exists';
END

-- Create Admins table for admin users (optional, if not already created)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Admins]') AND type in (N'U'))        
BEGIN
    CREATE TABLE Admins (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Username NVARCHAR(100) NOT NULL UNIQUE,
        Password NVARCHAR(255) NOT NULL,
        Email NVARCHAR(255) NULL,
        Active BIT DEFAULT 1,
        CreatedAt DATETIME DEFAULT GETDATE(),
        UpdatedAt DATETIME DEFAULT GETDATE()
    );

    CREATE INDEX IX_Admins_Username ON Admins(Username);
    PRINT 'Table Admins created successfully';
END
ELSE
BEGIN
    PRINT 'Table Admins already exists';
END

PRINT 'All master tables created or already exist!';
