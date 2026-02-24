import { DataTypes } from 'sequelize';
//13
export default (sequelize) => {
  const ActionLog = sequelize.define(
    'ActionLog',
    {
      log_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'log_id',
      },
      entity_type: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: 'entity_type',
      },
      entity_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'entity_id',
      },
      action_user_role_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'action_user_role_id',
        // FK removed - added via ALTER TABLE
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'user_id',
        // FK removed - added via ALTER TABLE
      },
      old_status_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'old_status_id',
        // FK removed - added via ALTER TABLE
      },
      new_status_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'new_status_id',
        // FK removed - added via ALTER TABLE
      },
      old_substatus_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'old_substatus_id',
        // FK removed - added via ALTER TABLE
      },
      new_substatus_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'new_substatus_id',
        // FK removed - added via ALTER TABLE
      },
      remarks: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'remarks',
      },
      action_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'action_at',
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
      tableName: 'action_logs',
      timestamps: false,
    }
  );

  return ActionLog;
};
