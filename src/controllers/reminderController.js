const catchAsync = require('../utils/catchAsync');
const AppError = require("../utils/AppError");
const moment = require('moment-timezone');
const User = require("../models/userModel");
const cron = require('node-cron');
const admin = require('firebase-admin');
const FCM = require("../models/fcmTokenModel");
const Reminder = require("../models/reminderModel");

// Firebase Admin Initialization
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);


admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

// Firebase Messaging Instance
const messaging = admin.messaging();


// exports.createReminder = catchAsync(async (req, res, next) => {
//     try {
//         const { title, reminderDateTime, notes, timeZone } = req.body;
//         const userID = req.user._id;
//
//         // Validate required fields
//         if (!title || !reminderDateTime || !userID || !timeZone) {
//             return next(new AppError("Title, reminder date, user ID, and time zone are required", 400));
//         }
//
//         // Convert reminderDateTime to the user's time zone
//         const date = moment.tz(reminderDateTime, "DD MMM YYYY, h:mm A", timeZone).toDate();
//         console.log('Parsed Date in User Time Zone:', date);
//
//         // Validate parsed date
//         if (isNaN(date)) {
//             return next(new AppError("Invalid date format for reminderDateTime", 400));
//         }
//
//         // Handle uploaded files (req.files is an array from upload.array middleware)
//         let imageUrls = [];
//         if (req.files && req.files.length > 0) {
//             imageUrls = req.files.map(
//                 (file) => `${req.protocol}://${req.get('host')}/images/display-${file.filename}`
//             );
//         }
//
//         // Create the reminder in the database
//         const reminder = await Reminder.create({
//             title,
//             reminderDateTime: date,
//             notes,
//             userID,
//             images: imageUrls,
//         });
//
//         // Schedule the reminder
//         await scheduleReminder(reminder, date);
//
//         // Send response back
//         res.status(201).json({
//             status: "success",
//             message: "Reminder scheduled successfully",
//             data: reminder,
//         });
//     } catch (error) {
//         next(error);
//     }
// });

exports.createReminder = catchAsync(async (req, res, next) => {
    try {
        const { title, reminderDateTime, notes, timeZone } = req.body;
        const userID = req.user._id;

        if (!title || !reminderDateTime || !userID || !timeZone) {
            return next(new AppError("Title, reminder date, user ID, and time zone are required", 400));
        }

        // Parse the reminderDateTime with the provided timeZone
        const userDate = moment.tz(reminderDateTime, "DD MMM YYYY, h:mm A", timeZone);

        console.log(`User Date: ${userDate.format()}`); // Debugging user's date in their local timezone

        if (!userDate.isValid()) {
            return next(new AppError("Invalid date format for reminderDateTime", 400));
        }

        // Convert to UTC for database storage
        const utcDate = userDate.utc();

        console.log(`UTC Date for storage: ${utcDate.format()}`); // Debugging the UTC date for storage

        // Handle uploaded images if any
        let imageUrls = [];
        if (req.files && req.files.length > 0) {
            imageUrls = req.files.map(
                (file) => `${req.protocol}://${req.get('host')}/images/display-${file.filename}`
            );
        }

        // Save the reminder in the database
        const reminder = await Reminder.create({
            title,
            reminderDateTime: utcDate.toDate(),
            notes,
            userID,
            images: imageUrls,
            timeZone,
        });

        // Schedule the reminder (using UTC time for consistency)
        await scheduleReminder(reminder, utcDate.toDate());

        res.status(201).json({
            status: "success",
            message: "Reminder scheduled successfully",
            data: reminder,
        });
    } catch (error) {
        next(error);
    }
});

const scheduleReminder = async (reminder, date, isUpdate = false) => {
    console.log("enter to schedule");
    const cronTime = moment(date).format('m H D M *');
    console.log(`${isUpdate ? 'Generated New' : 'Generated'} Cron Time for UTC:`, cronTime);

    if (isUpdate) {
        cron.getTasks().forEach(task => task.stop());
        console.log('Canceled existing cron jobs for update.');
    }

    console.log(`${isUpdate ? 'Scheduling updated' : 'Scheduling'} reminder for cron job...`);
    cron.schedule(cronTime, async () => {
        console.log(`Cron job triggered at: ${new Date().toISOString()}`); // Debugging when the cron job is triggered
        try {
            await sendPushNotification(reminder);
            await markReminderAsCompleted(reminder._id);
            console.log('Reminder marked as completed');
        } catch (error) {
            console.error('Error executing reminder:', error);
        }
    });
};




//update reminder

exports.updateReminderTime = catchAsync(async (req, res, next) => {
    try {
        const { reminderDateTime, snoozedTime, timeZone } = req.body;
        const reminderID = req.params.id;

        if (!reminderDateTime || !timeZone) {
            return next(new AppError('Reminder date and time, and time zone are required', 400));
        }

        const date = moment.tz(reminderDateTime, "DD MMM YYYY, h:mm A", timeZone);

        if (isNaN(date)) {
            return next(new AppError('Invalid date format for reminderDateTime', 400));
        }

        const utcDate = date.utc();

        const reminder = await Reminder.findById(reminderID);
        if (!reminder) {
            return next(new AppError('Reminder not found', 404));
        }

        reminder.reminderDateTime = utcDate.toDate();
        reminder.snoozedTime = snoozedTime;
        reminder.isSnoozeActive=true;
        await reminder.save();

        const cronTime = date.format('m H D M *');
        console.log('Generated Cron Time for User Time Zone:', cronTime);

        const cronTimeUTC = utcDate.format('m H D M *');
        console.log('Generated Cron Time for UTC:', cronTimeUTC);

        await scheduleReminder(reminder, utcDate.toDate(), true);

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
// const scheduleReminder = async (reminder, date, isUpdate = false) => {
//     console.log("enter to schedule");
//     const cronTime = moment(date).format('m H D M *');
//     console.log(`${isUpdate ? 'Generated New' : 'Generated'} Cron Time for UTC:`, cronTime);
//
//     if (isUpdate) {
//         cron.getTasks().forEach(task => task.stop());
//         console.log('Canceled existing cron jobs for update.');
//     }
//
//     console.log(`${isUpdate ? 'Scheduling updated' : 'Scheduling'} reminder for cron job...`);
//     cron.schedule(cronTime, async () => {
//         console.log(`Cron job triggered at: ${new Date().toISOString()}`);
//         try {
//             await sendPushNotification(reminder);
//             await markReminderAsCompleted(reminder._id);
//             console.log('Reminder marked as completed');
//         } catch (error) {
//             console.error('Error executing reminder:', error);
//         }
//     });
// };


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
            isSnoozeActive:false
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

        const reminder = await Reminder.findById(reminderID);
        if (!reminder) {
            return next(new AppError("Reminder not found", 200));
        }

        const { reminderDateTime, timeZone } = reminder;

        if (!reminderDateTime || !timeZone) {
            return next(new AppError("Reminder date or time zone is missing", 400));
        }

        const adjustedDate = moment(reminderDateTime).tz(timeZone, true).format();

        res.status(200).json({
            status: "success",
            data: { ...reminder.toObject(), reminderDateTime: adjustedDate }
        });
    } catch (error) {
        next(error);
    }
});



// Get all Reminders
exports.getAllReminders = catchAsync(async (req, res, next) => {
    try {
        const userID = req.user._id;
        const reminders = await Reminder.find({ userID });

        const adjustedReminders = reminders.map(reminder => {
            const reminderDateTime = reminder.reminderDateTime;
            const timeZone = reminder.timeZone;

            if (!reminderDateTime || !timeZone) {
                return {
                    ...reminder.toObject(),
                    reminderDateTime: null
                };
            }

            const date = moment(reminderDateTime).tz(timeZone, true);

            if (!date.isValid()) {
                return {
                    ...reminder.toObject(),
                    reminderDateTime: null
                };
            }

            const adjustedDate = date.format();

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
            return next(new AppError("No active reminders found", 200));
        }

        const adjustedReminders = activeReminders.map(reminder => {
            const { reminderDateTime, timeZone } = reminder;

            if (!reminderDateTime || !timeZone) {
                return next(new AppError("Reminder date or time zone is missing", 400));
            }

            const adjustedDate = moment(reminderDateTime).tz(timeZone, true).format();

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
