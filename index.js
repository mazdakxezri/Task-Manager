const fs = require("fs");
const path = require("path");
const cors = require("cors");

const bodyParser = require("body-parser");
const express = require("express");
const mongoose = require("mongoose");

const UserRoutes = require("./routes/users-routes");
const TaskRoutes = require("./routes/tasks-routes");
const NotificationsRoutes = require("./routes/notifications-routes");

const HttpError = require("./models/http-error");

const MONGODB_URL = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.MONGODB_CLUSTER}/${process.env.DB_NAME}?retryWrites=true&w=majority&appName=Cluster0`;

const app = express();

app.use(bodyParser.json());

app.use("/uploads/images", express.static(path.join("uploads", "images")));
app.use(express.static(path.join("public")));

app.use(cors());
app.use("/api/users", UserRoutes);
app.use("/api/tasks", TaskRoutes);
app.use("/api/notifications", NotificationsRoutes);

app.use((req, res, next) => {
  res.sendFile(path.resolve(__dirname, "public", "index.html"));
});

app.use((error, req, res, next) => {
  if (req.file) {
    fs.unlink(req.file.path, (err) => {
      console.error("Error deleting file:", err);
    });
  }

  if (res.headerSent) {
    return next(error);
  }

  res
    .status(error.code || 500)
    .json({ message: error.message || "An unknown error occurred!" });
});

const uploadDir = path.join(__dirname, "uploads", "images");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

mongoose
  .connect(MONGODB_URL)
  .then(() => {
    app.listen(process.env.PORT || 5001);
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });
