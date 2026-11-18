export const notFound = (req, res, next) => {
  const error = new Error(`Resource not found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

export const errorHandler = (err, req, res, next) => {
  // Mongoose validation errors (invalid field values, failed schema validators)
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors || {})
      .map(e => e.message)
      .join(' ');
    return res.status(400).json({
      success: false,
      message: messages || 'Validation failed. Please check your input.',
      stack: null,
    });
  }

  // Mongoose duplicate key (unique index violation → email already exists)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({
      success: false,
      message: `An account with this ${field} already exists.`,
      stack: null,
    });
  }

  // Mongoose CastError (invalid ObjectId etc.)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: `Invalid value for field '${err.path}'.`,
      stack: null,
    });
  }

  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};
