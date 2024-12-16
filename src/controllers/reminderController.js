const catchAsync = require('../utils/catchAsync');
const schedule = require('node-schedule');
const AppError = require("../utils/AppError");
const Reminder = require("../models/reminderModel");
const moment = require('moment');



//create reminders
exports.createReminder = catchAsync(async (req, res, next) => {
    try {
        const userID = req.user._id;

        const {title, reminderDateTime, notes} = req.body;
        const files = req.files;
        console.log(files);

        // Validate required fields
        if (!title || !reminderDateTime || !userID) {
            return next(new AppError("Title, reminder date, and user ID are required", 400));
        }

        // Parse reminderDateTime using moment (auto detects many formats)
        const date = moment(reminderDateTime).toDate();

        // Check if the parsed date is valid
        if (isNaN(date)) {
            return next(new AppError("Invalid date format for reminderDateTime", 400));
        }

        console.log(date.toString());
        console.log(date.toLocaleString());

        // Convert image URLs
        const imageUrls = files.map(
            (file) => `${req.protocol}://${req.get('host')}/images/display-${file.filename}`
        );

        // Create the reminder
        const reminder = await Reminder.create({
            title,
            reminderDateTime,
            notes,
            images: imageUrls,
            userID,
        });

        // Schedule the job at the parsed date and time
        schedule.scheduleJob(date, async function () {
            console.log(`Reminder: ${title} time ${date}`);
            // Mark the reminder as completed and set execution time
            await markReminderAsCompleted(reminder?._id, next);
            // Trigger your Firebase notification here
        });

        res.status(201).json({
            status: "success",
            message: "Reminder scheduled successfully",
            data: reminder
        });

    } catch (error) {
        next(error);
    }
});

exports.deleteReminder = catchAsync(async (req, res, next) => {
    try {
        const userID = req.user._id;
        const reminderID = req.params.id;

        const reminder = await Reminder.findOne({ _id: reminderID, userID: userID });

        if (!reminder) {
            return next(new AppError("Reminder not found or you do not have access", 404));
        }

        await Reminder.deleteOne({ _id: reminderID });

        res.status(200).json({
            status: "success",
            message: "Reminder deleted successfully",
        });
    } catch (error) {
        next(error);
    }
});


// Get a single Reminder
exports.getSingleReminder = catchAsync(async (req, res, next) => {
    try {
        const reminderID = req.params.id;

        // Check if reminder exists
        const reminder = await Reminder.findById(reminderID);
        if (!reminder) {
            return next(new AppError("Reminder not found", 404));
        }

        res.status(200).json({
            status: "success",
            data: reminder
        });
    } catch (error) {
        next(error);
    }
});

// Get all Reminders
exports.getAllReminders = catchAsync(async (req, res, next) => {
    try {
        const userID = req.user._id;
        const reminders = await Reminder.find({userID:userID});

        res.status(200).json({
            status: "success",
            data: reminders
        });
    } catch (error) {
        next(error);
    }
});

// Helper function to mark reminder as completed
const markReminderAsCompleted = async (reminderID, next) => {
    const reminder = await Reminder.findById({_id: reminderID});
    if (!reminder) {
        return next(new AppError("Reminder not found", 404));
    }

    // Update reminder status and execution time
    reminder.isComplete = true;
    reminder.executionTime = new Date();

    try {
        await reminder.save();
    } catch (error) {
        return next(new AppError("Failed to save reminder", 500));
    }
};

//active reminders
exports.activeReminders = catchAsync(async (req, res, next) => {
    try {
        let userID = req.user._id;
        let activeReminders = await Reminder.find({userID: userID, isComplete: false});
        if (!activeReminders) {
            return next(new AppError("Reminder not found", 404));
        }
        res.status(200).json({status: "success", data: activeReminders});
    } catch (error) {
        next(error);
    }
})

//completed reminders
exports.completedReminder = catchAsync(async (req, res, next) => {
    try {
        let userID = req.user._id;
        let activeReminders = await Reminder.find({userID: userID, isComplete: true});
        if (!activeReminders) {
            return next(new AppError("Reminder not found", 404));
        }
        res.status(200).json({status: "success", data: activeReminders});
    } catch (error) {
        next(error);
    }
})

//snoozed reminder
exports.snoozeReminder = catchAsync(async (req, res, next) => {
    try {
        const reminderID = req.params.id;
        const userID = req.user._id;
        const reminder = await Reminder.findOne({ _id: reminderID, userID: userID });

        if (!reminder) {
            return next(new AppError("Reminder not found or you do not have access", 404));
        }

        // Update the isSnoozeActive field
        reminder.isSnoozeActive = true;
        await reminder.save();

        // Send success response
        res.status(200).json({
            status: 'success',
            message: 'Reminder snoozed successfully',
            data: {
                reminder,
            },
        });
    } catch (error) {
        next(error);
    }
});

//snoozed list
exports.snoozedList = catchAsync(async (req, res, next) => {
    try {
        const userID = req.user._id;
        const data = await Reminder.find({userID:userID,isSnoozeActive: true });
        if(!data) {
            return next(new AppError("Snoozed Reminder not found", 404));
        }
        res.status(200).json({
            status: 'success',
            results: data.length,
            data:data,
        });
    } catch (error) {
        next(error);
    }
});

//update snoozed time
exports.updateSnoozedTime = catchAsync(async (req, res, next) => {
    try {
        const userID = req.user._id;
        const reminderID = req.params.id;
        const { snoozedTime } = req.body;

        if (!snoozedTime) {
            return next(new AppError("Snoozed time is required", 400));
        }

        const reminder = await Reminder.findOne({ _id: reminderID, userID: userID });

        if (!reminder) {
            return next(new AppError("Reminder not found or you do not have access", 404));
        }

        reminder.snoozedTime = snoozedTime;
        await reminder.save();

        res.status(200).json({
            status: 'success',
            message: 'Snoozed time updated successfully',
            data: {
                reminder,
            },
        });
    } catch (error) {
        next(error);
    }
});

