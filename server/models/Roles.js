import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const Roles = sequelize.define(
    "Roles",
    {
      roles_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: "roles_id",
      },
      roles_name: {
        type: DataTypes.ENUM('admin', 'HOD', 'technician', 'customer', 'service_center', 'plant','call_center','RSM'),
        allowNull: false,
        field: "roles_name",
      },
      description: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: "description",
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
      tableName: "roles",
      timestamps: true,
    }
  );

  return Roles;
};
