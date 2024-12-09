const globalErrorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.isOperational ? err.message : "Internal Server Error";
    console.error("Error: ", err);
    res.status(statusCode).json({
        success: false,
        message,
    });
};

module.exports = globalErrorHandler;
