const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const UserSchema = new mongoose.Schema(
    {
        firstName: { type: String, required: [true, "First name is required"], trim: true },
        lastName: { type: String, required: [true, "Last name is required"], trim: true },
        avatar:{type:String,trim:true},
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


// Hide sensitive data like password when returning user data
UserSchema.methods.toJSON = function () {
    const user = this.toObject();
    delete user.password;
    return user;
};

const User = mongoose.model("users", UserSchema);

module.exports = User;
