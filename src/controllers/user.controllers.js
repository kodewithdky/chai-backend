import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

//register user
const registerUser = asyncHandler(async (req, res) => {
  //destructure request body value
  const { name, email, phone, password } = req.body;
  //vallidation -not empty
  if ([name, email, phone, password].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "All fields are required!");
  }
  //geting images from request file -using multer
  const avatarLocalPath = req.files?.avatar[0]?.path;
  // const coverImageLocalPath = req.files?.coverImage[0]?.path;
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files?.coverImage[0]?.path;
  }
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required!");
  }

  //check existing user
  const existedUser = await User.findOne({
    $or: [{ email }, { phone }],
  });
  if (existedUser) {
    throw new ApiError(409, "User already exist!");
  }
  
  //upload file on cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  if (!avatar) {
    throw new ApiError(400, "Avatar file upload to failed!");
  }
  //create new user
  const user = await User.create({
    name,
    email,
    phone,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    password,
  });
  //check user created or not. and remove password and refreshToken from response
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering user!");
  }
  //send response
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered successfully!"));
});

export { registerUser };
