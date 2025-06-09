const User = require("../models/user");
const Task = require("../models/task");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");
const fs = require("fs");

const { validationResult } = require("express-validator");
const HttpError = require("../models/http-error");

const getAllUsers = async (req, res, next) => {
  let users;
  try {
    users = await User.find({}, "name email");
    // users = await User.findOne({email: email})
  } catch (err) {
    const error = new HttpError(
      "Fetching users failed, please try again later.",
      500
    );
    return next(error);
  }
  res.json({ users: users.map((user) => user.toObject({ getters: true })) });
};

const getUserProfile = async (req, res, next) => {
  const userId = req.params.uid;

  let user;
  let createdTasksCount;
  let assignedTasksCount;
  try {
    user = await User.findById(userId);
  } catch (error) {
    const err = new HttpError("Getting user failed.", 500);
    return next(err);
  }

  if (!user) {
    return next(new HttpError("User not found.", 404));
  }

  try {
    createdTasksCount = await Task.countDocuments({ creator: userId });
    assignedTasksCount = await Task.countDocuments({
      assignedUsers: userId,
      creator: { $ne: userId },
    });
  } catch (error) {
    const err = new HttpError("Getting task count failed.", 500);
    return next(err);
  }

  res.json({
    name: user.name,
    email: user.email,
    createdTasksCount,
    assignedTasksCount,
    totalTasksCount: createdTasksCount + assignedTasksCount,
    image: user.image,
  });
};

const updateUserProfile = async (req, res, next) => {
  const userId = req.params.uid;

  const { name, email, oldPassword, newPassword } = req.body;

  if (!name || !email) {
    return next(new HttpError("Name and email are required", 400));
  }

  let user;
  try {
    user = await User.findById(userId).select("+password");
  } catch (error) {
    const err = new HttpError("Could not find user.", 404);
    return next(err);
  }

  if (!user) {
    return next(new HttpError("User not found.", 404));
  }

  let existingUser;
  try {
    existingUser = await User.findOne({ email });
    if (existingUser && existingUser.id !== userId) {
      return next(new HttpError("Email already exists.", 400));
    }
  } catch (error) {
    const err = new HttpError("Finding email failed.", 404);
    return next(err);
  }

  if (oldPassword || newPassword) {
    if (!oldPassword || !newPassword) {
      return next(
        new HttpError(
          "Both old and new passwords are required for password change",
          400
        )
      );
    }

    try {
      const isValidPassword = await user.comparePassword(oldPassword);
      if (!isValidPassword) {
        return next(new HttpError("Invalid old password", 401));
      }

      if (newPassword.length < 6) {
        return next(
          new HttpError("Password must be at least 6 characters", 400)
        );
      }

      let hashedPassword;
      try {
        hashedPassword = await bcrypt.hash(newPassword, 12);
      } catch (error) {
        const err = new HttpError(
          "Something went wrong, Please try again.",
          500
        );
        return next(err);
      }

      user.password = hashedPassword;
    } catch (error) {
      return next(new HttpError("Changing password failed.", 500));
    }
  }

  user.name = name;
  user.email = email;

  // Handle image upload
  if (req.file) {
    // Delete old image if it exists
    if (user.image) {
      const oldImagePath = path.join(__dirname, "..", user.image);
      fs.unlink(oldImagePath, (err) => {
        if (err) {
          console.error("Error deleting old image:", err);
        }
      });
    }
    user.image = req.file.path;
  }

  let updateUser;
  try {
    updateUser = await user.save();
  } catch (error) {
    if (error.code === 11000) {
      return next(new HttpError("Email already exists.", 400));
    }
    return next(new HttpError("Something went wrong.", 500));
  }

  let createdTasksCount;
  let assignedTasksCount;
  try {
    createdTasksCount = await Task.countDocuments({ creator: userId });
    assignedTasksCount = await Task.countDocuments({
      assignedUsers: userId,
      creator: { $ne: userId },
    });
  } catch (error) {
    const err = new HttpError("Getting task count failed.", 500);
    return next(err);
  }

  let token;
  try {
    token = jwt.sign(
      { userId: updateUser.id, email: updateUser.email },
      process.env.JWT_KEY,
      { expiresIn: "1h" }
    );
  } catch (error) {
    const err = new HttpError("Something went wrong, please try again.", 500);
    return next(err);
  }

  res.json({
    name: updateUser.name,
    email: updateUser.email,
    token: token,
    createdTasksCount,
    assignedTasksCount,
    totalTasksCount: createdTasksCount + assignedTasksCount,
    image: updateUser.image,
  });
};

const userSignup = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError(
        "Invalid inputs passed, Please double-check your inputs.",
        422
      )
    );
  }

  const { name, email, password } = req.body;

  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (error) {
    const err = new HttpError("Signing up failed, Please try again.", 500);
    return next(err);
  }

  if (existingUser) {
    const err = new HttpError(
      "Could not create user, email already exists.",
      500
    );
    return next(err);
  }

  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (error) {
    const err = new HttpError("Something went wrong, Please try again.", 500);
    return next(err);
  }

  const createdUser = new User({
    name,
    email,
    password: hashedPassword,
    image: req.file.path,
    tasks: [],
  });

  try {
    await createdUser.save();
  } catch (error) {
    const err = new HttpError("Could not create User, Try again.", 500);
    return next(err);
  }

  let token;
  try {
    token = jwt.sign(
      { userId: createdUser.id, email: createdUser.email },
      process.env.JWT_KEY,
      { expiresIn: "1h" }
    );
  } catch (error) {
    const err = new HttpError("Something went wrong, please try again.", 500);
    return next(err);
  }

  res
    .status(201)
    .json({ userId: createdUser.id, email: createdUser.email, token: token });
};

const userLogin = async (req, res, next) => {
  const { email, password } = req.body;

  let signedupUser;
  try {
    signedupUser = await User.findOne({ email: email });
  } catch (error) {
    const err = new HttpError("Something went wrong.", 401);
    return next(err);
  }

  if (!signedupUser) {
    return next(
      new HttpError(
        "Could not identify user, credentials seem to be wrong.",
        401
      )
    );
  }

  let isValidPassword = false;
  try {
    isValidPassword = await bcrypt.compare(password, signedupUser.password);
  } catch (error) {
    const err = new HttpError("Something went wrong.", 500);
    return next(err);
  }

  if (!isValidPassword) {
    return next(new HttpError("Credentials seem to be wrong.", 401));
  }

  let token;
  try {
    token = jwt.sign(
      { userId: signedupUser.id, email: signedupUser.email },
      process.env.JWT_KEY,
      { expiresIn: "1h" }
    );
  } catch (error) {
    const err = new HttpError("Logging is failed, Please try again.", 500);
    return next(err);
  }

  res.status(201).json({
    userId: signedupUser.id,
    email: signedupUser.email,
    token: token,
  });
};

exports.getAllUsers = getAllUsers;
exports.getUserProfile = getUserProfile;
exports.updateUserProfile = updateUserProfile;
exports.userSignup = userSignup;
exports.userLogin = userLogin;
