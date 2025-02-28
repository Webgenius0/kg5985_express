const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const User = require("../models/userModel");
const Guest = require("../models/guestModel");

const verifyToken = catchAsync(async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
        return next(new AppError("Unauthorized. No token provided.", 401));
    }

    const token = authHeader.split(" ")[1];

    try {
        const { id } = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(id) || await Guest.findById(id);

        if (!req.user) {
            return next(new AppError("User not found or no longer exists.", 401));
        }

        next();
    } catch (err) {
        const message = err.name === "TokenExpiredError" ? "Token expired, please log in again." : "Invalid or expired token.";
        return next(new AppError(message, 401));
    }
});

module.exports = verifyToken;
