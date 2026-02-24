import { DataTypes } from 'sequelize';
// 7 
export default (sequelize) => {
  const AccessControl = sequelize.define(
    "AccessControl",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: "id",
      },
      role_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "role_id"
      },
      module_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: "module_name",
      },
      action: {
        type: DataTypes.STRING(50),
        allowNull: false,
        field: "action",
      },
      is_allowed: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: "is_allowed",
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: "createdAt",
      },
      updatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: "updatedAt",
      },
    },
    {
      tableName: "access_controls",
      timestamps: true,
    }
  );

  // Define associations without references (FK will be added via ALTER TABLE)
  AccessControl.associate = (models) => {
    if (models.Roles) {
      AccessControl.belongsTo(models.Roles, {
        foreignKey: 'role_id',
        as: 'role',
        constraints: false
      });
    }
  };

  return AccessControl;
};
