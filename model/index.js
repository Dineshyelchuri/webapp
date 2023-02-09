const dbConfig = require("../config/dbConfig.js");
const { Sequelize, DataTypes } = require("sequelize");

const sequelize = new Sequelize(
  process.env.DB_DATABASE,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: dbConfig.dialect,
    // operatorsAliases: false,
    pool: {
      max: dbConfig.pool.max,
      min: dbConfig.pool.min,
      acquire: dbConfig.pool.acquire,
      idle: dbConfig.pool.idle,
    },
    define: {
      timestamps: false,
    },
  }
);

sequelize
  .authenticate()
  .then(() => {
    console.log("connected");
  })
  .catch((err) => {
    console.log(err);
  });

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.users = require("./userModel.js")(sequelize, DataTypes);
db.products = require("./productModel")(sequelize, DataTypes);


db.sequelize
  .sync({ force: false })
  .then(() => {
    console.log("sync done");
  })
  .catch((error) => {
    console.error("Validation error: ", error);
  });

module.exports = db;
