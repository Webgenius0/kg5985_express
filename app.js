const express = require('express');
const app = express();

// Importing security middlewares
const cors = require("cors");
const hpp = require('hpp');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const { rateLimit } = require('express-rate-limit');
require('dotenv').config();

const limiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 1000,
    standardHeaders: "draft-7",
    legacyHeaders: false,
});

// Importing router
const router = require("./src/routes/api");

//importing utility
const AppError = require("./src/utils/AppError");

// importing database
const connectToMongoDB = require("./src/db/connectToMongoDB");

// Implementing security middlewares
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
}));
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: true, limit: "100mb" }));
app.use(hpp());
app.use(helmet());
app.use(mongoSanitize());
app.use(limiter);

// Connecting to router
app.use("/api/v1", router);

// Handling undefined routes
app.all("*", (req, res, next) => {
    next(new AppError(`Cannot find ${req.originalUrl} on this server`, 404));
});

// Global error handling middleware
app.use((err, req, res, next) => {
    res.status(err.statusCode || 500).json({
        status: err.status || 'error',
        message: err.message || 'An unexpected error occurred',
    });
});

// Call the async function to connect to MongoDB
connectToMongoDB();

module.exports = app;
