-- SQL Migration: Add 'plant' to from_entity_type enum in logistics_documents CHECK constraint
-- Run this in SQL Server Management Studio

-- Step 1: Remove the old constraint
ALTER TABLE logistics_documents
DROP CONSTRAINT CK__logistics__from___0AC320CD;

-- Step 2: Add new constraint that includes 'plant'
ALTER TABLE logistics_documents
ADD CONSTRAINT CK__logistics__from___0AC320CD 
CHECK (from_entity_type IN ('warehouse', 'branch', 'service_center', 'technician', 'supplier', 'plant'));

-- Verify the constraint was added
SELECT name, definition
FROM sys.check_constraints
WHERE parent_object_id = OBJECT_ID('logistics_documents')
AND name = 'CK__logistics__from___0AC320CD';

-- Step 3: Also check if to_entity_type needs 'plant'
-- This query shows the current to_entity_type constraint:
SELECT name, definition
FROM sys.check_constraints
WHERE parent_object_id = OBJECT_ID('logistics_documents')
AND definition LIKE '%to_entity_type%';

-- If needed, update to_entity_type constraint as well:
ALTER TABLE logistics_documents
DROP CONSTRAINT CK__logistics__to_____0BD01D36;

ALTER TABLE logistics_documents
ADD CONSTRAINT CK__logistics__to_____0BD01D36
CHECK (to_entity_type IN ('warehouse', 'branch', 'service_center', 'technician', 'customer', 'supplier', 'plant'));
