const catchAsync = require('../utils/catchAsync');
const AppError = require("../utils/AppError");
const Reminder = require("../models/reminderModel");
const moment = require('moment');
const User = require("../models/userModel");
const cron = require('node-cron');
const admin = require('firebase-admin');
const FCM = require("../models/fcmTokenModel");

// Firebase Admin Initialization
const serviceAccount = require('../utils/serviceAccount.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

// Firebase Messaging Instance
const messaging = admin.messaging();

// // Function to send push notification
// const sendPushNotification = async (reminder) => {
//     const { userID, title, notes, images } = reminder;
//
//     const fcmToken = await FCM.find({userID:userID});
//     // Assuming user has an `fcmToken` stored in the database
//     const user = await User.findById(userID);
//     if (!user || fcmToken) {
//         console.log(`No FCM token found for user: ${userID}`);
//         return;
//     }
//
//     const message = {
//         token: fcmToken,
//         notification: {
//             title: `Reminder: ${title}`,
//             body: notes || "You have a scheduled reminder!",
//         },
//         // Optional: Include image in the notification
//         ...(images.length > 0 && { image: images[0] }),
//     };
//
//     try {
//         const response = await messaging.send(message);
//         console.log('Notification sent successfully:', response);
//     } catch (error) {
//         console.error('Error sending notification:', error);
//     }
// };


exports.createReminder = catchAsync(async (req, res, next) => {
    try {
        const {title, reminderDateTime, notes} = req.body;
        const userID = req.user._id;

        // Validate required fields
        if (!title || !reminderDateTime || !userID) {
            return next(new AppError("Title, reminder date, and user ID are required", 400));
        }

        // Parse the reminderDateTime into a valid Date object using Moment.js (in BST)
        // Adding 6 hours to convert from BST to UTC
        const date = moment(reminderDateTime, "DD MMM YYYY, h:mm A").add(6, 'hours').toDate();
        console.log('Parsed Date in BST:', date);

        // Validate parsed date
        if (isNaN(date)) {
            return next(new AppError("Invalid date format for reminderDateTime", 400));
        }

        // Create the reminder in the database
        const reminder = await Reminder.create({
            title, reminderDateTime: date, notes, userID,
        });

        // Generate cron time based on the parsed date (in UTC for cron job)
        const cronTime = moment(date).utc().format('m H D M *');
        console.log('Generated Cron Time for UTC:', cronTime);

        // Scheduling the reminder with detailed logging
        console.log('Scheduling reminder for cron job...');
        cron.schedule(cronTime, async () => {
            console.log(`Cron job triggered at: ${new Date().toISOString()}`);
            try {
                // Send push notification (when you're ready to enable this)
                // await sendPushNotification(reminder);
                // Mark reminder as completed
                await markReminderAsCompleted(reminder._id);
                console.log('Reminder marked as completed');
            } catch (error) {
                console.error('Error executing reminder:', error);
            }
        });

        // Send response back
        res.status(201).json({
            status: "success", message: "Reminder scheduled successfully", data: reminder,
        });
    } catch (error) {
        next(error);
    }
});


//update reminder

exports.updateReminderTime = catchAsync(async (req, res, next) => {
    const { reminderDateTime,snoozedTime } = req.body;
    const reminderID = req.params.id;

    // Validate required fields
    if (!reminderDateTime) {
        return next(new AppError('Reminder date and time are required', 400));
    }

    // Parse the reminderDateTime into a valid Date object (in BST)
    const date = moment(reminderDateTime, "DD MMM YYYY, h:mm A").add(6, 'hours').toDate();
    console.log('Parsed Date in BST:', date);

    // Validate parsed date
    if (isNaN(date)) {
        return next(new AppError('Invalid date format for reminderDateTime', 400));
    }

    // Find the reminder to update by its ID
    const reminder = await Reminder.findById(reminderID);
    if (!reminder) {
        return next(new AppError('Reminder not found', 404));
    }

    // Update the reminder date in the database
    reminder.reminderDateTime = date;
    reminder.snoozedTime = snoozedTime;
    await reminder.save();

    // Generate new cron time based on the updated date (in UTC for cron job)
    const cronTime = moment(date).utc().format('m H D M *');
    console.log('Generated New Cron Time for UTC:', cronTime);

    // Cancel the existing cron job before scheduling the new one (if any)
    cron.getTasks().forEach(task => task.stop());

    // Schedule the reminder with the new time
    console.log('Scheduling updated reminder for cron job...');
    cron.schedule(cronTime, async () => {
        console.log(`Cron job triggered at: ${new Date().toISOString()}`);
        try {
            // Send push notification (when you're ready to enable this)
            // await sendPushNotification(reminder);
            // Mark reminder as completed
            await markReminderAsCompleted(reminder._id);
            console.log('Reminder marked as completed');
        } catch (error) {
            console.error('Error executing reminder:', error);
        }
    });

    // Send response back
    res.status(200).json({
        status: 'success',
        message: 'Reminder time updated and reminder rescheduled successfully',
        data: reminder,
    });
});



// Function to mark reminder as completed
const markReminderAsCompleted = async (reminderID) => {
    try {
        await Reminder.findByIdAndUpdate(reminderID, {
            isComplete: true, executionTime: new Date().toISOString(),
            isSnoozeActive:true
        });
        console.log(`Reminder ${reminderID} marked as completed.`);
    } catch (error) {
        console.error('Error marking reminder as completed:', error);
    }
};

//delete reminders
exports.deleteReminder = catchAsync(async (req, res, next) => {
    try {
        const userID = req.user._id;
        const reminderID = req.params.id;

        const reminder = await Reminder.findOne({_id: reminderID, userID: userID});

        if (!reminder) {
            return next(new AppError("Reminder not found or you do not have access", 404));
        }

        await Reminder.deleteOne({_id: reminderID});

        res.status(200).json({
            status: "success", message: "Reminder deleted successfully",
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
            status: "success", data: reminder
        });
    } catch (error) {
        next(error);
    }
});

// Get all Reminders
exports.getAllReminders = catchAsync(async (req, res, next) => {
    try {
        const userID = req.user._id;
        const reminders = await Reminder.find({userID: userID});

        res.status(200).json({
            status: "success", data: reminders
        });
    } catch (error) {
        next(error);
    }
});


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
        const reminder = await Reminder.findOne({_id: reminderID, userID: userID});

        if (!reminder) {
            return next(new AppError("Reminder not found or you do not have access", 404));
        }

        // Update the isSnoozeActive field
        reminder.isSnoozeActive = true;
        await reminder.save();

        // Send success response
        res.status(200).json({
            status: 'success', message: 'Reminder snoozed successfully', data: {
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
        const data = await Reminder.find({userID: userID, isSnoozeActive: true});
        if (!data) {
            return next(new AppError("Snoozed Reminder not found", 404));
        }
        res.status(200).json({
            status: 'success', results: data.length, data: data,
        });
    } catch (error) {
        next(error);
    }
});

// //update snoozed time
// exports.updateSnoozedTime = catchAsync(async (req, res, next) => {
//     try {
//         const userID = req.user._id;
//         const reminderID = req.params.id;
//         const {snoozedTime} = req.body;
//
//         if (!snoozedTime) {
//             return next(new AppError("Snoozed time is required", 400));
//         }
//
//         const reminder = await Reminder.findOne({_id: reminderID, userID: userID});
//
//         if (!reminder) {
//             return next(new AppError("Reminder not found or you do not have access", 404));
//         }
//
//         reminder.snoozedTime = snoozedTime;
//         await reminder.save();
//
//         res.status(200).json({
//             status: 'success', message: 'Snoozed time updated successfully', data: {
//                 reminder,
//             },
//         });
//     } catch (error) {
//         next(error);
//     }
// });


// // Create Reminder Handler
// exports.createReminder = catchAsync(async (req, res, next) => {
//     try {
//         const userID = req.user._id;
//
//         const { title, reminderDateTime, notes } = req.body;
//         const files = req.files;
//
//         // Validate required fields
//         if (!title || !reminderDateTime || !userID) {
//             return next(new AppError("Title, reminder date, and user ID are required", 400));
//         }
//
//         // Parse reminderDateTime (assuming it's in UTC or can be converted to UTC)
//         const date = new Date(reminderDateTime); // Directly converting to Date
//
//         // Validate parsed date
//         if (isNaN(date)) {
//             return next(new AppError("Invalid date format for reminderDateTime", 400));
//         }
//
//         // Convert image URLs
//         const imageUrls = files.map(
//             (file) => `${req.protocol}://${req.get('host')}/images/display-${file.filename}`
//         );
//
//         // Create the reminder in the database
//         const reminder = await Reminder.create({
//             title,
//             reminderDateTime: date, // Storing as Date
//             notes,
//             images: imageUrls,
//             userID,
//         });
//
//         // Schedule the notification using node-cron
//         const reminderCronTime = moment(date).utc().format('m H D M *'); // Cron format: "m H D M *"
//         console.log(`Cron time for reminder: ${reminderCronTime}`);
//
//         console.log('Scheduling reminder for cron job...');
//         cron.schedule(reminderCronTime, async () => {
//             console.log(`Executing Reminder: ${reminder.title} at ${new Date().toISOString()}`);
//
//             // Send push notification (when you're ready to enable this)
//             // await sendPushNotification(reminder);
//
//             // Mark reminder as completed
//             await markReminderAsCompleted(reminder._id);
//         });
//
//         res.status(201).json({
//             status: "success",
//             message: "Reminder scheduled successfully",
//             data: reminder,
//         });
//     } catch (error) {
//         next(error);
//     }
// });
