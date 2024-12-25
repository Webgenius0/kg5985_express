const mongoose = require("mongoose");
const AppError = require("../utils/AppError");

async function connectToMongoDB() {
    try {
        const uri = `mongodb+srv://sholaymanbdcalling:fEc9arInegLKkoWo@cluster0.zpzeg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0/reminderApp`;
        await mongoose.connect(uri);
        console.log("Connected to MongoDB");
    } catch (error) {
        if (error instanceof AppError) {
            console.error(`AppError: ${error.message}`);
        } else {
            console.error("Unexpected Error connecting to MongoDB:", error.message);
        }
    }
}

module.exports = connectToMongoDB;
