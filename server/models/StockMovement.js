import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const StockMovement = sequelize.define(
    'StockMovement',
    {
      movement_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'movement_id',
      },
      // NEW: stock_movement_type - WHAT actually happened to stock (Physical Reality)
      // Values: FILLUP_DISPATCH, FILLUP_RECEIPT, TECH_ISSUE_OUT, TECH_ISSUE_IN, TECH_RETURN_DEFECTIVE,
      //         ASC_RETURN_DEFECTIVE_OUT, ASC_RETURN_DEFECTIVE_IN, CONSUMPTION_IW, CONSUMPTION_OOW
      stock_movement_type: {
        type: DataTypes.ENUM(
          'FILLUP_DISPATCH',
          'FILLUP_RECEIPT',
          'TECH_ISSUE_OUT',
          'TECH_ISSUE_IN',
          'TECH_RETURN_DEFECTIVE',
          'ASC_RETURN_DEFECTIVE_OUT',
          'ASC_RETURN_DEFECTIVE_IN',
          'CONSUMPTION_IW',
          'CONSUMPTION_OOW'
        ),
        allowNull: false,
        field: 'stock_movement_type',
        comment: 'Physical reality - WHAT happened to stock. Bucket impact and SAP integration based on this type.'
      },
      // NEW: bucket - Which bucket this movement affects (GOOD, DEFECTIVE, IN_TRANSIT)
      // Derived from stock_movement_type. Read-only - calculated based on movement type.
      bucket: {
        type: DataTypes.ENUM('GOOD', 'DEFECTIVE', 'IN_TRANSIT'),
        allowNull: false,
        field: 'bucket',
        comment: 'Inventory bucket affected by this movement (GOOD=Saleable, DEFECTIVE=IW Defective, IN_TRANSIT=Moving)'
      },
      // NEW: bucket_operation - How the bucket quantity changes (INCREASE or DECREASE)
      // Derived from stock_movement_type. Read-only - calculated based on movement type.
      bucket_operation: {
        type: DataTypes.ENUM('INCREASE', 'DECREASE'),
        allowNull: false,
        field: 'bucket_operation',
        comment: 'Operation on bucket: INCREASE adds to bucket qty, DECREASE removes from bucket qty'
      },
      reference_type: {
        type: DataTypes.ENUM('purchase_order', 'spare_request', 'return_request', 'transfer_request', 'adjustment'),
        allowNull: false,
        field: 'reference_type',
      },
      reference_no: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'reference_no',
        comment: 'SAP-generated Delivery Note (DN) or Challan number'
      },
      source_location_type: {
        type: DataTypes.ENUM('warehouse', 'plant', 'service_center', 'technician', 'customer', 'supplier'),
        allowNull: true,
        field: 'source_location_type',
      },
      source_location_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'source_location_id',
      },
      destination_location_type: {
        type: DataTypes.ENUM('warehouse', 'plant', 'service_center', 'technician', 'customer', 'supplier'),
        allowNull: true,
        field: 'destination_location_type',
      },
      destination_location_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'destination_location_id',
      },
      total_qty: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'total_qty',
      },
      total_amount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
        field: 'total_amount',
      },
      movement_date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'movement_date',
      },
      assigned_to: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'assigned_to',
        references: {
          model: 'users',
          key: 'user_id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'created_by',
        references: {
          model: 'users',
          key: 'user_id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      verified_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'verified_by',
        references: {
          model: 'users',
          key: 'user_id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      verified_at: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'verified_at',
      },
      status: {
        type: DataTypes.ENUM('pending', 'in_transit', 'completed', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending',
        field: 'status',
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'created_at',
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'updated_at',
      }
    },
    {
      tableName: 'stock_movement',
      timestamps: false,
    }
  );

  return StockMovement;


};
