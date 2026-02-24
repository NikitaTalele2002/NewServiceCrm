import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const CallTechnicianAssignment = sequelize.define(
    'CallTechnicianAssignment',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'id',
      },
      call_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'call_id',
        // FK removed - added via ALTER TABLE
      },
      technician_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'technician_id',
        // FK removed - added via ALTER TABLE
      },
      assigned_by_user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'assigned_by_user_id',
        // FK removed - added via ALTER TABLE
      },
      assigned_reason: {
        type: DataTypes.ENUM('ABSENT', 'OVERLOADED', 'CUSTOMER_REQUEST', 'PERFORMANCE', 'AVAILABILITY'),
        allowNull: true,
        field: 'assigned_reason',
      },
      assigned_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'assigned_at',
      },
      unassigned_at: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'unassigned_at',
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'is_active',
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
      tableName: 'call_technician_assignment',
      timestamps: false,
    }
  );

  return CallTechnicianAssignment;
};
