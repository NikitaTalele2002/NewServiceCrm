import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const ProductGroup = sequelize.define('ProductGroup', {
    Id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'Id'
    },
    VALUE: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      field: 'VALUE'
    },
    DESCRIPTION: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'DESCRIPTION'
    }
  }, {
    tableName: 'ProductGroups',
    timestamps: false,
    underscored: false
  });

  return ProductGroup;
};




