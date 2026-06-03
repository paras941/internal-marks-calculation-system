require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const mongoose = require('mongoose');

const PORT = process.env.PORT || 5000;
let server;

// Validate required env vars
if (!process.env.JWT_SECRET) {
  console.error(' JWT_SECRET is required. Please check backend/.env');
  process.exit(1);
}
if (!process.env.MONGODB_URI) {
  console.error(' MONGODB_URI is required. Please check backend/.env');
  process.exit(1);
}

const startServer = async () => {
  await connectDB();

  server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('✅ JWT_SECRET loaded:', !!process.env.JWT_SECRET);
    console.log('✅ MongoDB URI configured');
  });

  const shutdown = async (signal) => {
    console.log(`Received ${signal}, shutting down gracefully...`);

    server.close(async () => {
      try {
        await mongoose.connection.close();
      } catch (error) {
        console.error('Error while closing MongoDB connection:', error.message);
      } finally {
        process.exit(0);
      }
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  return server;
};

startServer().catch((error) => {
  console.error('Failed to start server:', error.message);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error(`❌ Unhandled Rejection: ${err.message}`);
  console.error('Stack:', err.stack);
  // Close server & exit process
  if (server) {
    server.close(() => process.exit(1));
    return;
  }

  process.exit(1);
});

