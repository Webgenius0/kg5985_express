const mongoose = require("mongoose");
const AppError = require("../utils/AppError");

async function connectToMongoDB(req, res, next) {
    try {
        const uri = process.env.MONGODB_URI;

        if (!uri) {
            return next(new AppError("MONGODB_URI is not defined in the environment variables.", 500));
        }

        const options = {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
        };

        await mongoose.connect(`${uri}/reminderApp`, options);
        console.log("Connected to MongoDB");
    } catch (error) {
        if (error instanceof AppError) {
            console.error(`AppError: ${error.message}`);
        } else {
            console.error("Unexpected Error connecting to MongoDB:", error.message);
        }

        // Retry logic or graceful shutdown
        setTimeout(() => process.exit(1), 5000);
    }
}

module.exports = connectToMongoDB;

