import { config } from "dotenv";
import { Sequelize } from "sequelize-typescript";
import Scrape from "./scrape.model";
import Books from "./books.model";
config();

const sequelize = new Sequelize({
  database: process.env.DB_NAME,
  dialect: "postgres",
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  models: [
    Scrape,
    Books
  ],
  logging: false,
});

export default sequelize;
