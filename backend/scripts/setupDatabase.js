const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
require("dotenv").config();

async function run() {
  const dbName = process.env.DB_NAME || "career_path_navigator";
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    multipleStatements: true
  });

  const schema = fs.readFileSync(path.join(__dirname, "../../database/schema.sql"), "utf8");
  const seed = fs.readFileSync(path.join(__dirname, "../../database/seed.sql"), "utf8");

  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
  await connection.query(`USE \`${dbName}\``);
  await connection.query(schema);
  await connection.query(seed);
  await connection.end();

  console.log(`Database '${dbName}' is ready.`);
}

run().catch((error) => {
  console.error("Database setup failed:");
  console.error(error.message);
  process.exit(1);
});
