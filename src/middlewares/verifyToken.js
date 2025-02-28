const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const User = require("../models/userModel");
const Guest = require("../models/guestModel");
const Reminder = require('../models/reminderModel');

const verifyToken = catchAsync(async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Unauthorized. No token provided." });
    }

    const token = authHeader.split(" ")[1];

    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token expired, please log in again.' });
        }
        return res.status(401).json({ message: 'Invalid or expired token.' });
    }

    try {
        const currentUser = await User.findById(decoded.id);
        if (!currentUser) {
            const currentGuest = await Guest.findById(decoded.id);
            if (!currentGuest) {
                return next(new AppError('The user belonging to this token no longer exists.', 401));
            }

            const reminderCount = await Reminder.countDocuments({ userID: currentGuest._id });
            if (reminderCount >= 5) {
                return res.status(200).json({
                    status: "error",
                    message: "Guest users can only create up to 5 reminders. Please sign up for more.",
                });
            }

            req.user = currentGuest;
            return next();
        }

        req.user = currentUser;
        next();
    } catch (err) {
        return next(new AppError('There was an error while verifying the token.', 500));
    }
});

module.exports = verifyToken;
