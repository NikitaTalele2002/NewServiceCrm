import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const CallSpareUsage = sequelize.define(
    'CallSpareUsage',
    {
      usage_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'usage_id',
      },
      call_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'call_id',
        // FK removed - added via ALTER TABLE
      },
      spare_part_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'spare_part_id',
        // FK removed - added via ALTER TABLE
      },
      defect_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'defect_id',
      },
      issued_qty: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'issued_qty',
      },
      used_qty: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'used_qty',
      },
      returned_qty: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'returned_qty',
      },
      usage_status: {
        type: DataTypes.ENUM('USED', 'PARTIAL', 'NOT_USED'),
        defaultValue: 'PARTIAL',
        field: 'usage_status',
      },
      used_by_tech_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'used_by_tech_id',
        references: {
          model: 'users',
          key: 'user_id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      used_at: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'used_at',
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
      tableName: 'call_spare_usage',
      timestamps: false,
    }
  );

  return CallSpareUsage;
};
