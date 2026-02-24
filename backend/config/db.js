const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Debug: Show what URI is being used (mask password)
    const uri = process.env.MONGODB_URI;
    const maskedUri = uri ? uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@') : 'undefined';
    console.log('Attempting to connect with URI:', maskedUri);
    
    // Connection options for MongoDB Atlas
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds
      socketTimeoutMS: 45000, // Socket timeout
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    console.log(`Database: ${conn.connection.name}`);
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    console.error('Full error:', error);
    process.exit(1);
  }
};

// Handle mongoose connection events
mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error(`MongoDB Error: ${err.message}`);
});

module.exports = connectDB;
