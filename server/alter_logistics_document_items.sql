-- Direct SQL Alteration Script for logistics_document_items table
-- This script will be used if migration JavaScript fails

-- BACKUP: Create backup of old table (optional)
-- CREATE TABLE logistics_document_items_backup AS SELECT * FROM logistics_document_items;

-- Step 1: Drop old foreign key constraints (if exist)
-- For SQL Server
ALTER TABLE logistics_document_items DROP CONSTRAINT IF EXISTS FK_logistics_document_items_document;

-- Step 2: Drop all old columns
-- This approach drops the entire table and recreates it (safest method)
DROP TABLE IF EXISTS logistics_document_items;

-- Step 3: Create new logistics_document_items table
CREATE TABLE logistics_document_items (
    id INT PRIMARY KEY IDENTITY(1,1),
    document_id INT NOT NULL,
    spare_part_id INT,
    qty INT NOT NULL DEFAULT 0,
    uom VARCHAR(20),
    hsn VARCHAR(50),
    FOREIGN KEY (document_id) REFERENCES logistics_documents(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (spare_part_id) REFERENCES spare_part(spare_id)
);

-- Step 4: Create indexes for better query performance
CREATE INDEX idx_logistics_document_items_document_id ON logistics_document_items(document_id);
CREATE INDEX idx_logistics_document_items_spare_part_id ON logistics_document_items(spare_part_id);

-- Verification: Check new table structure
-- SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'logistics_document_items' ORDER BY ORDINAL_POSITION;

-- Print success message
PRINT 'logistics_document_items table successfully restructured!';
PRINT 'New columns: id, document_id, spare_part_id, qty, uom, hsn';
