const mongoose = require('mongoose');


const ReminderSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            trim: true,
            index: true,
        },
        reminderDateTime: {
            type: Date,
            required: [true, "Reminder date and time is required"],

        },
        notes: {
            type: String,
            trim: true,
        },
        timeZone: {type: String, required: [true, "Reminder time zone is required"], index: true, trim: true},
        images: {
            type: [String],
            validate: {
                validator: function (v) {
                    return v.every((url) =>
                        /^https?:\/\/.*\.(jpeg|jpg|png|gif)$/.test(url)
                    );
                },
                message: "Please provide valid image URLs",
            },
        },
        userID: {
            type: mongoose.Schema.Types.ObjectId,
            required: [true, "User ID is required"],
            ref: "User",
        },
        isComplete: {
            type: Boolean,
            default: false,
        },
        executionTime: {
            type: Date,
            default: null,
        },
        isSnoozeActive: {type: Boolean, default: false},
        snoozedTime: {type: String, default: null},
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

const Reminder = mongoose.model("Reminder", ReminderSchema);

module.exports = Reminder;
