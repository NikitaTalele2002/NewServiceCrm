// models/SparePart.js
import { DataTypes } from "sequelize";

export default (sequelize) => {
  const SparePart = sequelize.define(
    "SparePart",
    {
      Id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: "Id",
      },

      ModelID: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "ModelID",
        references: {
          model: "ProductModels",
          key: "Id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },

      BRAND: {
        type: DataTypes.STRING(200),
        allowNull: true,
        field: "BRAND",
      },

      PART: {
        type: DataTypes.STRING(200),
        allowNull: false,
        field: "PART",
      },

      MAPPED_MODEL: {
        type: DataTypes.STRING(200),
        allowNull: true,
        field: "MAPPED_MODEL",
      },

      MODEL_DESCRIPTION: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: "MODEL_DESCRIPTION",
      },

      MAX_USED_QTY: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "MAX_USED_QTY",
      },

      SERVICE_LEVEL: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: "SERVICE_LEVEL",
      },

      PART_LOCATION: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: "PART_LOCATION",
      },

      STATUS: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: "STATUS",
      },

      LAST_UPDATED_DATE: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "LAST_UPDATED_DATE",
      },

      DESCRIPTION: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: "DESCRIPTION",
      },
    },
    {
      tableName: "spare_parts",
      timestamps: false,
    }
  );

  return SparePart;
};
