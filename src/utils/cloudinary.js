import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    //upload the file on cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    // console.log(`File is uploaded on cloudinary`, response.url);
    //unlink file
    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    //remove the locally saved temporary file as the upload operation got failed
    fs.unlinkSync(localFilePath);
    return null;
  }
};

//delete image from cloudinary
const deleteFromCloudinary = async (cloudinaryImagePath) => {
  try {
    if (!cloudinaryImagePath) return null;
    //delete from cloudinary
    const response = await cloudinary.uploader.destroy(cloudinaryImagePath, {
      resource_type: "auto",
    });
    return response;
  } catch (error) {
    return null;
  }
};

export { uploadOnCloudinary, deleteFromCloudinary };
