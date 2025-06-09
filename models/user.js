const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const HttpError = require("./http-error");

const userSchema = new mongoose.Schema({
  name: { type: String, require: true },
  email: { type: String, require: true, unique: true },
  password: { type: String, require: true, minlength: 6 },
  image: { type: String, require: true },
  tasks: [{ type: mongoose.Types.ObjectId, require: true, ref: "Task" }],
});

userSchema.methods.comparePassword = async (candidatePassword) => {
  let compare;
  try {
    compare = await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    const err = new HttpError("Something went wrong.", 500);
    return err;
  }

  return compare;
};

module.exports = mongoose.model("User", userSchema);
