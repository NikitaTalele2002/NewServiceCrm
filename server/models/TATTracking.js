import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const TATTracking = sequelize.define(
    'TATTracking',
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
        unique: true,
        field: 'call_id',
        // FK removed - added via ALTER TABLE
      },
      tat_start_time: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'tat_start_time',
      },
      tat_end_time: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'tat_end_time',
      },
      tat_status: {
        type: DataTypes.ENUM('in_progress', 'within_tat', 'breached', 'resolved'),
        defaultValue: 'in_progress',
        field: 'tat_status',
      },
      total_hold_minutes: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'total_hold_minutes',
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
      tableName: 'tat_tracking',
      timestamps: false,
    }
  );

  return TATTracking;
};
