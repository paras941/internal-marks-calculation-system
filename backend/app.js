const express = require('express');
const cors = require('cors');
const path = require('path');
const { mapErrorToHttp } = require('./utils/controllerError');

// Route files
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const schemeRoutes = require('./routes/schemeRoutes');
const marksRoutes = require('./routes/marksRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const auditRoutes = require('./routes/auditRoutes');

const app = express();

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable CORS
app.use(cors());

// Create uploads directory for file uploads
const fs = require('fs');
if (!fs.existsSync('./uploads')) {
  fs.mkdirSync('./uploads');
}

// Mount routers
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/schemes', schemeRoutes);
app.use('/api/marks', marksRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/audit-logs', auditRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Internal Marks API is running' });
});

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  // Prevent duplicate responses
  if (res.headersSent) {
    console.error('[GLOBAL_ERROR_HANDLER] Response already sent, error suppressed:', {
      errorMessage: err.message,
      url: req.originalUrl
    });
    return;
  }

  console.error('[GLOBAL_ERROR_HANDLER] Caught error', {
    path: req.originalUrl,
    method: req.method,
    errorName: err.name,
    errorCode: err.code,
    errorMessage: err.message,
    stack: err.stack,
    userId: req.user?._id || 'unknown'
  });

  const mapped = mapErrorToHttp(err);
  const statusCode = err.statusCode || mapped.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message: err.message || mapped.message || 'Internal server error'
  });
};

app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

module.exports = app;
