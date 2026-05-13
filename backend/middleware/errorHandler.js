function errorHandler(err, req, res, next) {
    console.error(`[${new Date().toISOString()}] Error:`, err.message);
    console.error(err.stack);

    const statusCode = err.statusCode || 500;
    const message = statusCode === 500 ? 'Error interno del servidor' : err.message;

    res.status(statusCode).json({
        error: message,
        ...(process.env.NODE_ENV === 'development' && { detalle: err.message })
    });
}

function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

module.exports = { errorHandler, asyncHandler };
