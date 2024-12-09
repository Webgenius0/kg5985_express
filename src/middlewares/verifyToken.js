const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const User = require("../models/userModel");

// Verify Middleware
const verifyToken = catchAsync(async (req, res, next) => {
    const token = req.headers.token;

    // If no token, send unauthorized error
    if (!token) {
        return next(new AppError('You are not logged in! Please log in to get access.', 401));
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if the user still exists in the database
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
        return next(new AppError('The user belonging to this token no longer exists.', 401));
    }
    // Grant access to the user
    req.user = currentUser;
    next();
});

module.exports = verifyToken;
