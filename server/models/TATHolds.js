import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const TATHolds = sequelize.define(
    'TATHolds',
    {
      tat_holds_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'tat_holds_id',
      },
      call_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'call_id',
        // FK removed - added via ALTER TABLE
      },
      hold_reason: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'hold_reason',
      },
      hold_start_time: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'hold_start_time',
      },
      hold_end_time: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'hold_end_time',
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
      tableName: 'tat_holds',
      timestamps: false,
    }
  );

  return TATHolds;
};
