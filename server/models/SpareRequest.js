import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const SpareRequest = sequelize.define(
    'SpareRequest',
    {
      request_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'request_id',
      },
      // Legacy field - kept for backward compatibility with old request types
      request_type: {
        type: DataTypes.ENUM('consignment_fillup', 'consignment_return'),
        allowNull: true,
        field: 'request_type',
        comment: 'Legacy field for backward compatibility. Maps to: consignment_fillup or consignment_return'
      },
      // NEW: spare_request_type - WHY material is moving (who requested & why)
      // Values: CFU, TECH_ISSUE, TECH_RETURN_DEFECTIVE, ASC_RETURN_DEFECTIVE, ASC_RETURN_EXCESS, BRANCH_PICKUP
      spare_request_type: {
        type: DataTypes.ENUM(
          'CFU',
          'TECH_ISSUE',
          'TECH_RETURN_DEFECTIVE',
          'ASC_RETURN_DEFECTIVE',
          'ASC_RETURN_EXCESS',
          'BRANCH_PICKUP'
        ),
        allowNull: false,
        field: 'spare_request_type',
        comment: 'Business intent - WHY material is moving. Maps to stock movement types.'
      },
      call_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'call_id',
        // FK removed - added via ALTER TABLE
      },
      requested_source_type: {
        type: DataTypes.ENUM('technician', 'service_center', 'plant', 'warehouse'),
        allowNull: false,
        field: 'requested_source_type',
      },
      requested_source_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'requested_source_id',
        comment: 'Polymorphic FK - references technician/service_center/branch/warehouse table based on requested_source_type',
      },
      requested_to_type: {
        type: DataTypes.ENUM('warehouse', 'plant', 'service_center', 'technician', 'customer', 'supplier'),
        allowNull: false,
        field: 'requested_to_type',
      },
      requested_to_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'requested_to_id',
      },
      request_reason: {
        type: DataTypes.ENUM('defect', 'msl', 'bulk', 'replacement'),
        allowNull: false,
        field: 'request_reason',
      },
      status_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'status_id',
        // FK removed - added via ALTER TABLE
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'created_at',
      },
      created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'created_by',
        // FK removed - added via ALTER TABLE
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'updated_at',
      },
    },
    {
      tableName: 'spare_requests',
      timestamps: false,
      underscored: true,
    }
  );

  return SpareRequest;
};
