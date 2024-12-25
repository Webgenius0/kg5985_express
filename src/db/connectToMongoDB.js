const mongoose = require("mongoose");
const AppError = require("../utils/AppError");

async function connectToMongoDB(req, res, next) {
    try {
        const uri = process.env.MONGODB_URI;

        if (!uri) {
            return next(new AppError("MONGODB_URI is not defined in the environment variables.", 500));
        }

        const fullUri = `${uri}/reminderApp?retryWrites=true&w=majority`;

        await mongoose.connect(fullUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log("Connected to MongoDB");

    } catch (error) {
        if (error instanceof AppError) {
            console.error(`AppError: ${error.message}`);
        } else {
            console.error("Unexpected Error connecting to MongoDB:", error.message);
        }

        process.exit(1);
    }
}

module.exports = connectToMongoDB;
