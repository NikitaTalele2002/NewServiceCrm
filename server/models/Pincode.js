import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const Pincode = sequelize.define('Pincode', {
    Id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'Id'
    },
    VALUE: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      field: 'VALUE'
    },
    DESCRIPTION: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'DESCRIPTION'
    },
    City_ID: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'City_ID',
      references: {
        model: 'Cities',
        key: 'Id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    }
  }, {
    tableName: 'Pincodes',
    timestamps: false,
    underscored: false
  });

  return Pincode;
};
