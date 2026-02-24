// models/State.js
export default (sequelize, DataTypes) => {
  const State = sequelize.define("State", {
    Id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      field:"Id",
    },
    VALUE: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "VALUE",
    },
    DESCRIPTION: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "DESCRIPTION",
    },
    PARENT_ID: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "PARENT_ID",
      references: {
        model: "States",}
    },
    PARENT_DESCRIPTION: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "PARENT_DESCRIPTION",
    },
  }, {
    tableName: "States",
    timestamps: false,
  });

  return State;
};
