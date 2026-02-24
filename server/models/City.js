export default (sequelize, DataTypes) => {
  const City = sequelize.define("City", {
    Id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      field: "Id",
    },
    Value: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "Value",
    },
    Description: {
      type: DataTypes.STRING,
      allowNull: true,
      field:"Description",
    },
    StateId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "Parent_I",
      references: {
        model: 'States',
        key: 'Id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    StateName: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "Parent_Description",  // maps to DB column
    },
    city_tier_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "city_tier_id",
      comment: 'FK to city_tier_master for T1/T2/T3 classification'
    },
  }, {
    tableName: "Cities",
    timestamps: false,
  });

  // Define associations
  City.associate = (models) => {
    if (models.State) {
      City.belongsTo(models.State, {
        foreignKey: 'StateId',
        as: 'state',
        constraints: false
      });
    }
    if (models.CityTierMaster) {
      City.belongsTo(models.CityTierMaster, {
        foreignKey: 'city_tier_id',
        as: 'tier',
        constraints: false
      });
    }
  };

  return City;
};





