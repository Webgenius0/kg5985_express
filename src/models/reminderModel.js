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
            index: true,
        },
        emoji:{
            type: String,
            trim: true,
            index: true,
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
        location:{
            name:{type:String,index:true,trim:true},
            latitude:{type:String,index:true,trim:true},
            longitude:{type:String,index:true,trim:true}
        },
        isSnoozeActive: {type: Boolean, default: false},
        snoozedTime: {type: String, default: null},
        isActive: {type: Boolean, default: false},
        everSnoozed: {type: Boolean, default: false},
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

// ReminderSchema.pre("remove", async function (next) {
//     // Example: Delete related notifications or logs
//     await RelatedModel.deleteMany({ reminderID: this._id });
//     next();
// });


const Reminder = mongoose.model("reminders", ReminderSchema);

module.exports = Reminder;
