const catchAsync = require('../utils/catchAsync');
const schedule = require('node-schedule');
const AppError = require("../utils/AppError");
const Reminder = require("../models/reminderModel");
const moment = require('moment');


exports.createReminder = catchAsync(async (req, res, next) => {
    try {
        const userID = req.user._id;

        const { title, reminderDateTime, notes } = req.body;
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





// Update Reminder
exports.updateReminder = catchAsync(async (req, res, next) => {
    try{
        const reminderID = req.params.id;
        const updatedData = req.body;

        // Check if reminder exists
        const reminder = await Reminder.findById(reminderID);
        if (!reminder) {
            return next(new AppError("Reminder not found", 404));
        }

        // Check if reminder date is in the future
        if (updatedData.reminderDateTime && new Date(updatedData.reminderDateTime) <= Date.now()) {
            return next(new AppError("Reminder date must be in the future", 400));
        }

        // Update the reminder
        const updatedReminder = await Reminder.findByIdAndUpdate(reminderID, updatedData, { new: true });

        res.status(200).json({
            status: "success",
            message: "Reminder updated successfully",
            data: updatedReminder
        });
    }
    catch (error) {
        next(error);
    }
});

// Delete Reminder
exports.deleteReminder = catchAsync(async (req, res, next) => {
   try{
       const reminderID = req.params.id;
       // Check if reminder exists
       const reminder = await Reminder.findByIdAndDelete(reminderID);
       if (!reminder) {
           return next(new AppError("Reminder not found", 404));
       }

       res.status(200).json({
           status: "success",
           message: "Reminder deleted successfully",
       });
   }
   catch(error) {
       next(error);
   }
});

// Get a single Reminder
exports.getSingleReminder = catchAsync(async (req, res, next) => {
  try{
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
  }
  catch (error) {
      next(error);
  }
});

// Get all Reminders
exports.getAllReminders = catchAsync(async (req, res, next) => {
    try{
        const reminders = await Reminder.find();

        res.status(200).json({
            status: "success",
            data: reminders
        });
    }
    catch (error) {
        next(error);
    }
});


// Schedule Reminder
exports.scheduleReminder = catchAsync(async (req, res, next) => {
    const reminderID = req.params.id;

    // Find the reminder
    const reminder = await Reminder.findById({_id: reminderID});
    if (!reminder) {
        return next(new AppError("Reminder not found", 404));
    }

    // Check if reminder is already complete
    if (reminder.isComplete) {
        return next(new AppError("Reminder has already been completed", 400));
    }

    // Schedule the reminder
    try {
        schedule.scheduleJob(reminder.reminderDateTime, async function () {
            console.log(`Reminder: ${reminder.title}`);

            // Mark the reminder as completed and set execution time
            await markReminderAsCompleted(reminderID, next);
            //from here my firebase notification will set
        });

        res.status(200).json({
            status: "success",
            message: "Reminder scheduled successfully",
        });
    } catch (error) {
        next(new AppError("Failed to schedule reminder", 500));
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
    try{
        let userID = req.user._id;
        let activeReminders = await Reminder.find({userID:userID,isComplete:false});
        if (!activeReminders) {
            return next(new AppError("Reminder not found", 404));
        }
        res.status(200).json({status: "success", data: activeReminders});
    }
    catch (error) {
        next(error);
    }
})

