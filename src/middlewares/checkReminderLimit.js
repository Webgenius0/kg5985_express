const Reminder = require('../models/reminderModel');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

const checkReminderLimit = catchAsync(async (req, res, next) => {
    if (req.user?.role === "guest") {
        const reminderCount = await Reminder.countDocuments({ userID: req.user._id });
        if (reminderCount >= 5) {
            return next(new AppError("Guest users can only create up to 5 reminders.", 200));
        }
    }
    next();
});

module.exports = checkReminderLimit;
