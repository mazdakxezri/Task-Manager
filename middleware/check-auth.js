const jwt = require("jsonwebtoken");

const HttpError = require("../models/http-error");

module.exports = (req, res, next) => {
  if (req.method === "OPTION") {
    return next();
  }

  try {
    const token = req.headers.authorization.split(" ")[1];
    if (!token) {
      throw new Error("Authentication failed!");
    }

    const decodedToken = jwt.verify(token, process.env.JWT_KEY);

    req.userData = { userId: decodedToken.userId };
    next();
  } catch (error) {
    const err = new HttpError("Authentication Failed!", 401);
    return next(err);
  }
};
