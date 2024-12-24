const catchAsync = require('../utils/catchAsync');
const AppError = require("../utils/AppError");
const Reminder = require("../models/reminderModel");
const moment = require('moment');
const User = require("../models/userModel");
const cron = require('node-cron');
const admin = require('firebase-admin');
const FCM = require("../models/fcmTokenModel");

// Firebase Admin Initialization
const serviceAccount = require('../../serviceAccount.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

// Firebase Messaging Instance
const messaging = admin.messaging();


exports.createReminder = catchAsync(async (req, res, next) => {
    try {
        const { title, reminderDateTime, notes } = req.body;
        const userID = req.user._id;

        // Validate required fields
        if (!title || !reminderDateTime || !userID) {
            return next(new AppError("Title, reminder date, and user ID are required", 400));
        }

        // Parse the reminderDateTime into a valid Date object (in BST)
        const date = moment(reminderDateTime, "DD MMM YYYY, h:mm A").add(6, 'hours').toDate();
        console.log('Parsed Date in BST:', date);

        // Validate parsed date
        if (isNaN(date)) {
            return next(new AppError("Invalid date format for reminderDateTime", 400));
        }

        // Handle uploaded files (req.files is an array from upload.array middleware)
        let imageUrls = [];
        if (req.files && req.files.length > 0) {
            imageUrls = req.files.map(
                (file) => `${req.protocol}://${req.get('host')}/images/display-${file.filename}`
            );
        }

        // Create the reminder in the database
        const reminder = await Reminder.create({
            title,
            reminderDateTime: date,
            notes,
            userID,
            images: imageUrls, // Save array of image URLs
        });

        // Schedule the reminder
        await scheduleReminder(reminder, date);

        // Send response back
        res.status(201).json({
            status: "success",
            message: "Reminder scheduled successfully",
            data: reminder,
        });
    } catch (error) {
        next(error);
    }
});




//update reminder

exports.updateReminderTime = catchAsync(async (req, res, next) => {
    try {
        const { reminderDateTime, snoozedTime } = req.body;
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
            return next(new AppError('Reminder not found', 200));
        }

        // Update the reminder date in the database
        reminder.reminderDateTime = date;
        reminder.snoozedTime = snoozedTime;
        await reminder.save();

        // Schedule the updated reminder
        await scheduleReminder(reminder, date, true);

        // Send response back
        res.status(200).json({
            status: 'success',
            message: 'Reminder time updated and reminder rescheduled successfully',
            data: reminder,
        });
    } catch (error) {
        next(error);
    }
});




//schedule
const scheduleReminder = async (reminder, date, isUpdate = false) => {
    // Generate cron time based on the parsed date (in UTC for cron job)
    const cronTime = moment(date).utc().format('m H D M *');
    console.log(`${isUpdate ? 'Generated New' : 'Generated'} Cron Time for UTC:`, cronTime);

    // Cancel existing cron jobs if it's an update
    if (isUpdate) {
        cron.getTasks().forEach(task => task.stop());
        console.log('Canceled existing cron jobs for update.');
    }

    // Schedule the reminder with the new time
    console.log(`${isUpdate ? 'Scheduling updated' : 'Scheduling'} reminder for cron job...`);
    cron.schedule(cronTime, async () => {
        console.log(`Cron job triggered at: ${new Date().toISOString()}`);
        try {
            // Send push notification (when you're ready to enable this)
            await sendPushNotification(reminder);
            // Mark reminder as completed
            await markReminderAsCompleted(reminder._id);
            console.log('Reminder marked as completed');
        } catch (error) {
            console.error('Error executing reminder:', error);
        }
    });
};


// Function to send push notification
const sendPushNotification = async (reminder) => {
    const { userID, title, notes, images } = reminder;

    try {
        // Fetch FCM tokens and user data
        const fcmDataArray = await FCM.find({ userID: userID });
        console.log("fcmData", fcmDataArray);
        const user = await User.findById(userID);

        // Check for valid user and FCM token
        if (!user || fcmDataArray.length === 0) {
            console.log(`No FCM token found for user: ${userID}`);
            return;
        }

        // Loop through FCM tokens and send notifications
        for (const fcmData of fcmDataArray) {
            const message = {
                token: fcmData.fcmToken,
                notification: {
                    title: `Reminder: ${title}`,
                    body: notes || "You have a scheduled reminder!",
                    image: images && images.length > 0 ? images[0] : undefined,
                },
            };

            try {
                const response = await messaging.send(message);
                console.log('Notification sent successfully:', response);
            } catch (error) {
                // Handle token errors (invalid or expired tokens)
                if (error.code === 'messaging/registration-token-not-registered') {
                    console.log('FCM token expired or invalid. Removing from database.');
                    // Optionally, you can remove invalid token from the database or mark it as expired
                    await FCM.deleteOne({ fcmToken: fcmData.fcmToken });
                }
                console.error('Error sending notification:', error);
            }
        }
    } catch (error) {
        console.error('Error in sendPushNotification:', error);
    }
};







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
            return next(new AppError("Reminder not found", 200));
        }

        // Adjust the reminderDateTime field
        const adjustedDate = moment(reminder.reminderDateTime).subtract(6, 'hours').toDate();

        // Send the adjusted reminder
        res.status(200).json({
            status: "success", data: { ...reminder.toObject(), reminderDateTime: adjustedDate }
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

        const adjustedReminders = reminders.map(reminder => {
            const adjustedDate = moment(reminder.reminderDateTime).subtract(6, 'hours').toDate();
            return {
                ...reminder.toObject(),
                reminderDateTime: adjustedDate
            };
        });

        res.status(200).json({
            status: "success",
            data: adjustedReminders
        });
    } catch (error) {
        next(error);
    }
});



//active reminders
exports.activeReminders = catchAsync(async (req, res, next) => {
    try {
        let userID = req.user._id;
        let activeReminders = await Reminder.find({ userID: userID, isComplete: false });

        if (!activeReminders || activeReminders.length === 0) {
            return next(new AppError("Reminder not found", 200));
        }

        // Adjust the reminderDateTime for each reminder
        const adjustedReminders = activeReminders.map(reminder => {
            const adjustedDate = moment(reminder.reminderDateTime).subtract(6, 'hours').toDate();
            return {
                ...reminder.toObject(),
                reminderDateTime: adjustedDate
            };
        });

        res.status(200).json({ status: "success", data: adjustedReminders });
    } catch (error) {
        next(error);
    }
});


//completed reminders
exports.completedReminder = catchAsync(async (req, res, next) => {
    try {
        let userID = req.user._id;
        let completedReminders = await Reminder.find({ userID: userID, isComplete: true });

        if (!completedReminders || completedReminders.length === 0) {
            return next(new AppError("Reminder not found", 200));
        }

        // Adjust the reminderDateTime for each reminder
        const adjustedReminders = completedReminders.map(reminder => {
            const adjustedDate = moment(reminder.reminderDateTime).subtract(6, 'hours').toDate();
            return {
                ...reminder.toObject(),
                reminderDateTime: adjustedDate
            };
        });

        res.status(200).json({ status: "success", data: adjustedReminders });
    } catch (error) {
        next(error);
    }
});


//snoozed reminder
exports.snoozeReminder = catchAsync(async (req, res, next) => {
    try {
        const reminderID = req.params.id;
        const userID = req.user._id;
        const reminder = await Reminder.findOne({ _id: reminderID, userID: userID });

        if (!reminder) {
            return next(new AppError("Reminder not found or you do not have access", 200));
        }

        // Adjust the reminderDateTime for the reminder being snoozed
        // Update the reminder date and snooze status
        reminder.reminderDateTime = moment(reminder.reminderDateTime).subtract(6, 'hours').toDate();
        reminder.isSnoozeActive = true;
        await reminder.save();

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
        const data = await Reminder.find({ userID: userID, isSnoozeActive: true });

        if (!data || data.length === 0) {
            return next(new AppError("Snoozed Reminder not found", 200));
        }

        // Adjust the reminderDateTime for each snoozed reminder
        const adjustedReminders = data.map(reminder => {
            const adjustedDate = moment(reminder.reminderDateTime).subtract(6, 'hours').toDate();
            return {
                ...reminder.toObject(),
                reminderDateTime: adjustedDate
            };
        });

        res.status(200).json({
            status: 'success', results: adjustedReminders.length, data: adjustedReminders,
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
