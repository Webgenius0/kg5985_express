const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const User = require("../models/userModel");

// Verify Middleware
const verifyToken = catchAsync(async (req, res, next) => {
    const authHeader = req.headers.authorization;

    // Check if the header exists and starts with "Bearer"
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Unauthorized. No token provided." });
    }

    // Extract the token from the header
    const token = authHeader.split(" ")[1];

    let decoded;
    // Verify the token
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token expired, please log in again.' });
        }
        return res.status(401).json({ message: 'Invalid or expired token.' });
    }
    
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
