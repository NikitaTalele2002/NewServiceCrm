import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const EntityChangeRequests = sequelize.define(
    'EntityChangeRequests',
    {
      request_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'request_id',
      },
      entity_type: {
        type: DataTypes.ENUM('TECHNICIAN', 'SERVICE_CENTRE'),
        allowNull: false,
        field: 'entity_type',
      },
      entity_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'entity_id',
      },
      action_type: {
        type: DataTypes.ENUM('ADD', 'UPDATE', 'DEACTIVATE'),
        allowNull: false,
        field: 'action_type',
      },
      request_status: {
        type: DataTypes.ENUM('DRAFT', 'SUBMITTED', 'UNDER_APPROVAL', 'APPROVED', 'REJECTED'),
        defaultValue: 'DRAFT',
        field: 'request_status',
      },
      requested_by_user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'requested_by_user_id',
        references: {
          model: 'users',
          key: 'user_id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      requested_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'requested_at',
      },
      approved_at: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'approved_at',
      },
      approved_entity_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'approved_entity_id',
      },
      remarks: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'remarks',
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
      },
    },
    {
      tableName: 'entity_change_requests',
      timestamps: false,
    }
  );

  return EntityChangeRequests;
};
