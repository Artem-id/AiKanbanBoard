require("dotenv").config() ;
const fs = require("fs");
const path = require("path");
const { pool }= require("../config/db");

(async ( ) => {
  try{
    const sql = fs.readFileSync(path.join(__dirname, "schema.sql"),"utf8");
    console.log("Применение схемы..." ) ;
    await pool.query(sql);
    console.log("✅ Схема успешно применена");
  } 
  catch (err){
    console.error("Не удалось применить схему:" , err.message);
    process.exitCode = 1;
  } 
  finally {
    await pool.end();}
}
)();