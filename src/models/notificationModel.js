const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema(
    {
        userID: {type: mongoose.Schema.Types.ObjectId, required: [true, "User ID is required"], ref: 'users',},
        reminderID: {
            type: mongoose.Schema.Types.ObjectId,
            required: [true, "Reminder ID is required"],
            ref: 'reminders'
        },
        message: {type: String, required: [true, "Message is required"], trim: true},
        isRead: {type: Boolean, default: false},
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

const Notification = mongoose.model('notifications', NotificationSchema);
module.exports = Notification;
