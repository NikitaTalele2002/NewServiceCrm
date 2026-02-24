import { DataTypes } from 'sequelize';
// 11
export default (sequelize) => {
  const Approvals = sequelize.define(
    'Approvals',
    {
      approval_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'approval_id',
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
      approval_level: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'approval_level',
      },
      approver_role: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'approver_role',
        references: {
          model: 'roles',
          key: 'roles_id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      approver_user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'approver_user_id',
        references: {
          model: 'users',
          key: 'user_id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      approval_status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected', 'hold'),
        defaultValue: 'pending',
        field: 'approval_status',
      },
      approval_remarks: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'approval_remarks',
      },
      approved_at: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'approved_at',
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
      tableName: 'approvals',
      timestamps: false,
    }
  );

  return Approvals;
};
