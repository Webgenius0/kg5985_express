const AppError = require("../utils/AppError");
const User = require("../models/userModel");
const jwt = require("jsonwebtoken");
const catchAsync = require('../utils/catchAsync');
const {hash} = require("bcrypt");


//user registration
exports.registerUser = catchAsync(async (req, res, next) => {
    try {
        const { firstName, lastName, email, password, role } = req.body;

        // Validate required fields
        if (!firstName || !lastName || !email || !password) {
            return next(new AppError("All fields are required", 400));
        }

        // Check if email already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return next(new AppError("This email is already registered. Please log in.", 400));
        }

        // Create a new user
        await User.create({
            firstName,
            lastName,
            email,
            password,
            role,
        });

        // Send success response without sensitive data
        res.status(201).json({
            status: "success",
            message: "User registered successfully"
        });
    } catch (error) {
        if (error.name === "ValidationError") {
            const messages = Object.values(error.errors).map((err) => err.message);
            return next(new AppError(messages.join(", "), 400));
        }
        next(error);
    }
});



//user login
exports.loginUser = catchAsync(async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return next(new AppError("Email and password are required", 400));
        }

        const user = await User.findOne({ email });
        if (!user) {
            return next(new AppError("Invalid email or password", 401));
        }

        const isPasswordCorrect = await user.isPasswordCorrect(password);
        if (!isPasswordCorrect) {
            return next(new AppError("Invalid email or password", 401));
        }

        // Create JWT token
        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_IN || '1h',
        });

        // Send token to client
        res.status(200).json({
            status: 'success',
            token,
            data: { user: user.toJSON() },
        });
    } catch (error) {
        next(error);
    }
});



// Logout Controller
exports.logout = (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'Successfully logged out. Clear the token on the client.',
    });
};



// Update Password
exports.updatePassword = catchAsync(async (req, res, next) => {
    try {
        // Ensure user is logged in
        const { email } = req.user;
        let { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return next(new AppError("Both current password and new password are required", 400));
        }

        // Fetch the user from the database
        const user = await User.findOne({ email });
        if (!user) {
            return next(new AppError("User not found", 404));
        }

        // Validate the current password
        const isPasswordCorrect = await user.isPasswordCorrect(currentPassword);
        if (!isPasswordCorrect) {
            return next(new AppError("Incorrect current password", 401));
        }

        // Validate the new password (you can add custom validation here like length, strength, etc.)
        if (newPassword.length < 8) {
            return next(new AppError("New password must be at least 8 characters long", 400));
        }

        // Update the user's password
        user.password = await hash(newPassword, 12);
        await user.save();

        // Send success response
        res.status(200).json({
            status: 'success',
            message: 'Password updated successfully',
        });
    } catch (error) {
        next(error);
    }
});