const AppError = require("../utils/AppError");
const User = require("../models/userModel");
const jwt = require("jsonwebtoken");
const catchAsync = require('../utils/catchAsync');
const bcrypt = require("bcrypt");


//user registration
exports.registerUser = catchAsync(async (req, res, next) => {
    try {
        let { firstName, lastName, email, password, role,avatar } = req.body;

        // Validate required fields
        if (!firstName || !lastName || !email || !password) {
            return next(new AppError("All fields are required", 400));
        }

        // Check if email already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return next(new AppError("This email is already registered. Please log in.", 400));
        }

        password = await bcrypt.hash(password, 12);
        // Create a new user
        await User.create({
            firstName,
            lastName,
            email,
            password,
            role,
            avatar
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

        // Validate the current password
        const isPasswordCorrect = await bcrypt.compare(password, user.password);

        console.log(isPasswordCorrect);

        if (!isPasswordCorrect) {
            return next(new AppError("Incorrect current password", 401));
        }

        // Create JWT token
        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_IN,
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

        const user = await User.findOne({ email });

        if (!user) {
            return next(new AppError("User not found", 404));
        }

        // Validate the current password
        const isPasswordCorrect = await bcrypt.compare(currentPassword, user.password);
        if (!isPasswordCorrect) {
            return next(new AppError("Incorrect current password", 401));
        }

        // Validate the new password (e.g., length, strength)
        if (newPassword.length < 8) {
            return next(new AppError("New password must be at least 8 characters long", 400));
        }

        // Update the user's password
        user.password = await bcrypt.hash(newPassword, 12);
        await user.save();


        // Send success response along with the new token
        res.status(200).json({
            status: 'success',
            message: 'Password updated successfully',
        });
    } catch (error) {
        next(error);
    }
});


exports.updateProfile = catchAsync(async (req, res, next) => {
    try{
       const userID = req.user._id;
       const user = await User.findById({_id:userID});
       if(!userID || !user) {
           return next(new AppError("User not found", 401));
       }
      const {firstName,lastName,avatar} = req.body;
      let updateFields = {};
      if(firstName !== undefined) updateFields.firstName = firstName;
      if(lastName !== undefined) updateFields.lastName = lastName;
      if(avatar !== undefined) updateFields.avatar = avatar;
      const updateProfile = await User.findByIdAndUpdate(userID,updateFields,{new:true});
      res.status(200).json({data:updateProfile,message:"Profile updated"});
    }
    catch (error) {
     next(error);
    }
});
