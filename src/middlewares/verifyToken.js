const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const User = require("../models/userModel");

// Verify Middleware
const verifyToken = catchAsync(async (req, res, next) => {
    const authHeader = req.headers.authorization;

    console.log(authHeader);

    // Check if the header exists and starts with "Bearer"

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Unauthorized. No token provided." });
    }

    // Extract the token from the header

    const token = authHeader.split(" ")[1];

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
