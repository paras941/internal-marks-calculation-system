require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

// Validate required env vars
if (!process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET is required. Please check backend/.env');
  process.exit(1);
}
if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI is required. Please check backend/.env');
  process.exit(1);
}

// Connect to database
connectDB();

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('✅ JWT_SECRET loaded:', !!process.env.JWT_SECRET);
  console.log('✅ MongoDB URI configured');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error(`❌ Unhandled Rejection: ${err.message}`);
  console.error('Stack:', err.stack);
  // Close server & exit process
  server.close(() => process.exit(1));
});

