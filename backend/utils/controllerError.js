const mongoose = require('mongoose');

const normalizeValidationMessages = (errorsObj = {}) => {
  return Object.values(errorsObj).map((val) => val.message);
};

const mapErrorToHttp = (error) => {
  // Invalid ObjectId / cast issues
  if (error.name === 'CastError') {
    return {
      statusCode: 400,
      message: 'Invalid ObjectId in request'
    };
  }

  // Duplicate key (Mongo unique index)
  if (error.code === 11000) {
    const duplicateField = error.keyPattern ? Object.keys(error.keyPattern)[0] : 'field';
    return {
      statusCode: 409,
      message: `Duplicate value for ${duplicateField}`
    };
  }

  // Schema validation failures
  if (error.name === 'ValidationError') {
    const messages = normalizeValidationMessages(error.errors);
    return {
      statusCode: 400,
      message: messages.length ? messages.join(', ') : 'Validation error'
    };
  }

  // DB connection/readiness failures
  const dbConnectivityError =
    error.name === 'MongooseServerSelectionError' ||
    /ECONNREFUSED|timed out|server selection/i.test(error.message || '');

  if (dbConnectivityError) {
    return {
      statusCode: 500,
      message: 'Database connection error'
    };
  }

  return {
    statusCode: 500,
    message: 'Internal server error'
  };
};

const validateObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const requireFields = (body, fields) => {
  const missing = [];
  for (const field of fields) {
    const value = body ? body[field] : undefined;
    if (value === undefined || value === null || value === '') {
      missing.push(field);
    }
  }
  return missing;
};

// Validate req.user is set (for use in controllers)
const requireUser = (req) => {
  if (!req.user) {
    throw new Error('User not authenticated - req.user is undefined');
  }
  if (!req.user._id) {
    throw new Error('User authentication incomplete - req.user._id is missing');
  }
  return req.user;
};

module.exports = {
  mapErrorToHttp,
  validateObjectId,
  requireFields,
  requireUser
};