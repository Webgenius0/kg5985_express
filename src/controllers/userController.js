const AppError = require("../utils/AppError");
const User = require("../models/userModel");
const jwt = require("jsonwebtoken");
const catchAsync = require('../utils/catchAsync');
const bcrypt = require("bcrypt");
const OTP = require("../models/otpModel");
const sendOtpEmail = require("../utils/sendOtpEmail");
const crypto = require('crypto');


//user registration
exports.registerUser = catchAsync(async (req, res, next) => {

    let {firstName, lastName, email, password, role, avatar} = req.body;

    if (!firstName || !lastName || !email || !password) {
        return next(new AppError("All fields are required", 400));
    }

    const existingUser = await User.findOne({email});
    if (existingUser) {
        return next(new AppError("This email is already registered. Please log in.", 400));
    }

    await User.create({
        firstName,
        lastName,
        email,
        password,
        role,
        avatar
    });

    res.status(201).json({
        status: "success",
        message: "User registered successfully"
    });
});


//user login
exports.loginUser = catchAsync(async (req, res, next) => {
    try {
        const {email, password} = req.body;

        if (!email || !password) {
            return next(new AppError("Email and password are required", 400));
        }

        const user = await User.findOne({email});
        if (!user) {
            return next(new AppError("Invalid email or password", 401));
        }



        if (password !== user.password) {
            return next(new AppError("Incorrect current password", 401));
        }

        // Create JWT token
        const token = jwt.sign({id: user._id, role: user.role}, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_IN || "7300d",
        });

        // Send token to client
        res.status(200).json({
            status: 'success',
            token,
            data: {user: user.toJSON()},
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
        const {email} = req.user;
        let {currentPassword, newPassword} = req.body;

        if (!currentPassword || !newPassword) {
            return next(new AppError("Both current password and new password are required", 400));
        }

        const user = await User.findOne({email});

        if (!user) {
            return next(new AppError("User not found", 404));
        }

        if (currentPassword !== user.password) {
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


//update Profile
exports.updateProfile = catchAsync(async (req, res, next) => {
    try {
        const userID = req.user._id;
        const user = await User.findById({_id: userID});
        if (!userID || !user) {
            return next(new AppError("User not found", 401));
        }
        const {firstName, lastName, avatar, email} = req.body;
        let updateFields = {};
        if (firstName !== undefined) updateFields.firstName = firstName;
        if (lastName !== undefined) updateFields.lastName = lastName;
        if (avatar !== undefined) updateFields.avatar = avatar;
        if (email !== undefined) updateFields.email = email;
        const updateProfile = await User.findByIdAndUpdate(userID, updateFields, {new: true});
        res.status(200).json({data: updateProfile, message: "Profile updated"});
    } catch (error) {
        next(error);
    }
});


//Forgot password controller

exports.forgotPassword = catchAsync(async (req, res, next) => {
    const {email} = req.body;

    const user = await User.findOne({email});
    if (!user) {
        return res.status(400).json({message: "User not found"});
    }

    const otp = crypto.randomBytes(3).toString("hex");

    const existingOtp = await OTP.findOne({email, isVerified: false});

    if (existingOtp) {
        existingOtp.otp = otp;
        await existingOtp.save();
    } else {
        await OTP.create({email, otp});
    }

    const options = {
        to: email,
        subject: "Verification for Forgot Password!",
        html: `
        <html>
        <head>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    background-color: #f4f4f4;
                    margin: 0;
                    padding: 0;
                }
                .container {
                    width: 100%;
                    max-width: 600px;
                    margin: 40px auto;
                    padding: 20px;
                    background-color: #ffffff;
                    border-radius: 8px;
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                }
                .header {
                    text-align: center;
                    padding-bottom: 20px;
                }
                .header h1 {
                    font-size: 24px;
                    color: #333;
                    margin: 0;
                }
                .content {
                    font-size: 16px;
                    color: #555;
                    line-height: 1.6;
                }
                .footer {
                    text-align: center;
                    font-size: 14px;
                    color: #888;
                    margin-top: 20px;
                }
                .footer p {
                    margin: 0;
                    font-weight: 500;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Your OTP for Password Reset</h1>
                </div>
                <div class="content">
                    <p>Hi,</p>
                    <p>
                        Welcome to the Best Reminder App! Below is your OTP verification code for resetting your password. 
                        Please keep it secure and do not share it with anyone.
                    </p>
                    <p>
                        Your OTP Code is: <strong>${otp}</strong>
                    </p>
                    <p>
                        If you have any questions or face any issues, feel free to reach out to our support team.
                    </p>
                </div>
                <div class="footer">
                    <p>Thank you,</p>
                    <p>The Best Reminder App Team</p>
                </div>
            </div>
        </body>
        </html>
        `,
    };

    await sendOtpEmail(options, next);

    res.status(200).json({message: "OTP sent to your email"});
});


// Controller to verify OTP and reset the password
exports.resetPassword = async (req, res) => {
    try {
        const {otp, newPassword, email} = req.body;

        // Check if the OTP is valid and matches the email
        const otpRecord = await OTP.findOne({otp, email});
        if (!otpRecord) {
            return res.status(400).json({message: 'Invalid OTP'});
        }

        // Find user by email
        const user = await User.findOne({email});
        if (!user) {
            return res.status(400).json({message: 'User not found'});
        }

        user.password = newPassword;
        await user.save();

        // Delete OTP record after successful password reset
        await OTP.deleteOne({_id: otpRecord._id});
        res.status(200).json({message: 'Password reset successful'});
    } catch (error) {
        console.error(error);
        res.status(500).json({message: 'Server error'});
    }
};