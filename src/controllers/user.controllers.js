import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

//genrate access and referesh token
const generateAcessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating refresh and access token"
    );
  }
};

//option secure cookie
const options = {
  httpOnly: true,
  secure: true,
};

//register user
const registerUser = asyncHandler(async (req, res) => {
  //destructure request body value
  const { name, username, email, phone, password } = req.body;
  //vallidation -not empty
  if (
    [name, username, email, phone, password].some(
      (field) => field?.trim() === ""
    )
  ) {
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
    $or: [{ email }, { phone }, { username }],
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
    username,
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

//login user
const loginUser = asyncHandler(async (req, res) => {
  // fetch data from body
  const { email, phone,username, password } = req.body;
  //validation
  if (!(email || phone || username)) {
    throw new ApiError(400, "Email or Phone is required!");
  }
  //find user
  const user = await User.findOne({
    $or: [{ email }, { phone }, { username }],
  });
  if (!user) {
    throw new ApiError(404, "User does not exist!");
  }
  //checking user password
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials!");
  }
  //access token and referesh token
  const { accessToken, refreshToken } = await generateAcessAndRefreshTokens(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "User logged in successfully!"
      )
    );
});

//logout user
const logoutUser = asyncHandler(async (req, res) => {
  //find and update user
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined || "",
      },
    },
    {
      new: true,
    }
  );

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out!"));
});

//refress access token
const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;
  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request!");
  }
  try {
    //verify refresh token
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    //find user
    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new ApiError(401, "Invalid refresh token!");
    }
    //match refresh token
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token expired!");
    }
    //generate access and refresh token
    const { accessToken, newRefreshToken } =
      await generateAcessAndRefreshTokens(user._id);
    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed!"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token!");
  }
});

//change user password
const changeUserPassword = asyncHandler(async (req, res) => {
  //fetching data from body
  const { oldPassword, newPassword } = req.body;
  //find user
  const user = await User.findById(req.user?._id);
  //check password
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid credentils!");
  }
  // change password
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password change successfully!"));
});

//fetch current user
const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "User fetched successfully"));
});

//update account
const updateAccountDetails = asyncHandler(async (req, res) => {
  //fetching data from body
  const { name, username, email, phone } = req.body;
  //vallidation -not empty
  if ([name, username, email, phone].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "All fields are required!");
  }
  //update user details
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        name,
        username,
        email,
        phone,
      },
    },
    { new: true }
  ).select("-password");
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully!"));
});

//update avatar
const updateUserAvatar = asyncHandler(async (req, res) => {
  //fetch image from req.file using multer
  const avatarLocalPath = req.file?.path;
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing!");
  }
  //upload image on cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  if (!avatar.url) {
    throw new ApiError(400, "Error while uploading avatar!");
  }
  //update avatar
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: { avatar: avatar.user } },
    { new: true }
  ).select("-password");
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar updated successfully!"));
});

//update coverImage
const updateCoverImage = asyncHandler(async (req, res) => {
  //fetch cover image from req.file using multer
  const coverImageLocalPath = req.file?.path;
  if (!coverImageLocalPath) {
    throw new ApiError(400, "Avatar file is missing!");
  }
  //upload conver image on cloudinary
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  if (!coverImage.url) {
    throw new ApiError(400, "Error while uploading avatar!");
  }
  //update conver image
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: { coverImage: coverImage.user } },
    { new: true }
  ).select("-password");
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover image updated successfully!"));
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeUserPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateCoverImage,
};
