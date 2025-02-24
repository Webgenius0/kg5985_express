const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const UserSchema = new mongoose.Schema(
    {
        firstName: { type: String, required: [true, "First name is required"], trim: true },
        lastName: { type: String, required: [true, "Last name is required"], trim: true },
        avatar: { type: String },
        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            lowercase: true,
            match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"]
        },
        password: {
            type: String,
            required: [true, "Password is required"],
            minlength: [8, "Password must be at least 8 characters long"]
        },
        role: {
            type: String,
            enum: ["user", "admin", "moderator"],
            default: "user",
            required: [true, "Role is required"]
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

// Hash password before saving
UserSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Hide sensitive data like password when returning user data
UserSchema.methods.toJSON = function () {
    const user = this.toObject();
    delete user.password;
    return user;
};

const User = mongoose.model("users", UserSchema);

module.exports = User;
