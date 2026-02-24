import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const ReportingAuthority = sequelize.define(
    "ReportingAuthority",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: "id",
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "user_id",
        references: {
          model: 'users',
          key: 'user_id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      user_role_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "user_role_id",
        references: {
          model: 'roles',
          key: 'roles_id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      user_reporting_authority_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "user_reporting_authority_id",
        references: {
          model: 'users',
          key: 'user_id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      effective_from: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: "effective_from",
      },
      effective_to: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "effective_to",
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: "created_at",
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: "updated_at",
      },
    },
    {
      tableName: "reporting_authority",
      timestamps: false,
    }
  );

  return ReportingAuthority;
};
