import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const CallCancellationRequests = sequelize.define(
    'CallCancellationRequests',
    {
      cancellation_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'cancellation_id',
      },
      call_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'call_id',
        // FK removed - added via ALTER TABLE
      },
      requested_by_role: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'requested_by_role',
        // FK removed - added via ALTER TABLE
      },
      requested_by_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'requested_by_id',
        // FK removed - added via ALTER TABLE
      },
      reason: {
        type: DataTypes.ENUM('DUPLICATE', 'RESOLVED', 'NO_RESPONSE', 'CUSTOMER_REQUEST', 'TECHNICAL_ISSUE', 'INVALID_DATA', 'OTHER'),
        allowNull: false,
        field: 'reason',
      },
      request_status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected', 'escalated'),
        defaultValue: 'pending',
        field: 'request_status',
      },
      cancellation_remark: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'cancellation_remark',
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
      tableName: 'call_cancellation_requests',
      timestamps: false,
    }
  );

  return CallCancellationRequests;
};
