const mongoose = require('mongoose');

// Function to validate date and time
// const validateDate = (value) => {
//     const parsedDate = new Date(value);
//     return !isNaN(parsedDate); // Ensure the value is a valid date or date-time
// };

const ReminderSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, "Title is required"],
            trim: true,
            minlength: [5, "Title should be at least 5 characters long"],
            maxlength: [100, "Title should not exceed 100 characters"],
        },
        reminderDateTime: {
            type: Date,
            required: [true, "Reminder date and time is required"],

        },
        notes: {
            type: String,
            trim: true,
            maxlength: [500, "Notes should not exceed 500 characters"],
        },
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
        isSnoozeActive:{type:Boolean,default:false},
        snoozedTime:{type:String,default:null},
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

const Reminder = mongoose.model("Reminder", ReminderSchema);

module.exports = Reminder;
