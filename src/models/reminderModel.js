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
            type: String,
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
                    // Ensure all entries in the array are valid image URLs
                    return v.every((url) =>
                        /^https?:\/\/.*\.(jpeg|jpg|png|gif)$/.test(url)
                    );
                },
                message: "Please provide valid image URLs",
            },
        },
        userID: {
            type: mongoose.Schema.Types.ObjectId, // Reference to a user
            required: [true, "User ID is required"],
            ref: "User", // Assuming a User model exists
        },
        isComplete: {
            type: Boolean,
            default: false, // Default to incomplete
        },
        executionTime: {
            type: Date, // ISO format for execution time
            default: null, // Optional
        },
    },
    {
        timestamps: true, // Automatically add createdAt and updatedAt fields
        versionKey: false, // Remove __v field from the document
    }
);

const Reminder = mongoose.model("Reminder", ReminderSchema);

module.exports = Reminder;
