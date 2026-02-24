-- SQL: Fetch current inventory for a branch by branchId
SELECT si.*, sp.PART, sp.ModelID, pm.MODEL_DESCRIPTION, pm.ProductID, 
       prd.NAME AS product_name, prd.ProductGroupID, pg.VALUE AS product_group
FROM spare_inventory si
JOIN spare_parts sp ON sp.Id = si.spare_id
LEFT JOIN ProductModel pm ON pm.Id = sp.ProductModelId
LEFT JOIN ProductMaster prd ON prd.ID = pm.ProductID
LEFT JOIN ProductGroups pg ON pg.Id = prd.ProductGroupID
WHERE si.location_type = 'plant' AND si.location_id = @branchId
ORDER BY si.spare_id ASC;
