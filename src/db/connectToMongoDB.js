const mongoose = require("mongoose");
const AppError = require("../utils/AppError");

async function connectToMongoDB(req,res,next) {
    try {
        const uri = process.env.MONGODB_URI;

        if (!uri) {
             next(new AppError("MONGODB_URI is not defined in the environment variables.", 500));
        }

        await mongoose.connect(`${uri}/reminder_app`);

        console.log("Connected to MongoDB");
    } catch (error) {
        // If it's an AppError, log its message and exit
        if (error instanceof AppError) {
            console.error(`AppError: ${error.message}`);
        } else {
            // Log other unexpected errors
            console.error("Unexpected Error connecting to MongoDB:", error.message);
        }

        // Pass the error to a global error handler or exit the process
        process.exit(1); // Stops the app if connection fails
    }
}

module.exports = connectToMongoDB;
