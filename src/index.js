// require("dotenv").config({path:"./.env"})
import dotenv from "dotenv";
import connectDB from "./db/index.js";
import colors from "colors";
import { app } from "./app.js";

//dotenv config
dotenv.config({ path: "./.env" });
//call connectDB()
connectDB()
  .then(() => {
    app.listen(process.env.PORT || 7071, () => {
      console.log(
        `\n◔ SERVER IS RUNNING ON PORT: ${process.env.PORT}`.bgBlue.white
      );
    });
  })
  .catch((err) => {
    console.log("\nMONGODB CONNECTION FAILED!!!".bgRed.white, err);
  });

  

/*
import mongooge from "mongoose";
import { DB_NAME } from "./constants.js";
import express from "express";
const app = express()(async () => {
  try {
    await mongooge.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
    app.on("error", (error) => {
      console.log("ERROR: ", error);
      throw error;
    });

    app.listen(process.env.PORT, () => {
      console.log(`App is listening on port: ${process.env.PORT}`);
    });
  } catch (error) {
    console.error("ERROR: ", error);
    throw error;
  }
})();
*/
