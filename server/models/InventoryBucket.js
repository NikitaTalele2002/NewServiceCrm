/**
 * InventoryBucket Model - DEPRECATED & REMOVED
 * 
 * ⚠️  THIS MODEL IS NO LONGER USED
 * 
 * Reason: The inventory_bucket table has been consolidated into the spare_inventory table.
 * All bucket tracking (GOOD, DEFECTIVE, IN_TRANSIT) is now done through SpareInventory model.
 * 
 * Migration: 20260223_consolidate_bucket_system.js
 * Status: Inventory bucket table successfully removed from database
 * 
 * DO NOT USE THIS MODEL - Delete after verifying no code imports it
 */

import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const InventoryBucket = sequelize.define(
    'InventoryBucket',
    {
      bucket_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'bucket_id'
      },
      model_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'model_id',
        comment: 'Spare model ID (foreign key to spare_models)'
      },
      location_type: {
        type: DataTypes.ENUM('warehouse', 'branch', 'service_center', 'technician', 'customer'),
        allowNull: false,
        field: 'location_type',
        comment: 'Type of location'
      },
      location_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'location_id',
        comment: 'ID of the location (warehouse_id, branch_id, asc_id, technician_id, etc.)'
      },
      bucket: {
        type: DataTypes.ENUM('GOOD', 'DEFECTIVE', 'IN_TRANSIT'),
        allowNull: false,
        field: 'bucket',
        comment: 'Inventory bucket: GOOD=Saleable, DEFECTIVE=IW Defective, IN_TRANSIT=Moving',
       // fk will be added by alter table during the sync database
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'quantity',
        comment: 'Current quantity in this bucket'
      },
      last_updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'last_updated_at',
        comment: 'When this bucket quantity was last updated'
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'created_at'
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'updated_at'
      }
    },
    {
      tableName: 'inventory_bucket',
      timestamps: false,
      indexes: [
        {
          fields: ['model_id', 'location_type', 'location_id'],
          name: 'idx_bucket_location'
        },
        {
          fields: ['bucket'],
          name: 'idx_bucket_type'
        },
        {
          fields: ['model_id', 'bucket'],
          name: 'idx_model_bucket'
        }
      ]
    }
  );

  return InventoryBucket;
};
