import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGODB_URI}/${DB_NAME}`
    );
    console.log(
      `\n🔛 MongoDB connected!! DB HOST: ${connectionInstance.connection.host}`
        .bgGreen.white
    );
  } catch (error) {
    console.log("MONGODB CONNECTION FAILED".bgRed.white, error);
    process.exit(1);
  }
};

export default connectDB;
