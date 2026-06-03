const mongoose = require('mongoose');

let reconnectTimer = null;
let reconnectInProgress = false;

const scheduleReconnect = () => {
  if (reconnectInProgress || reconnectTimer) {
    return;
  }

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;

    if (mongoose.connection.readyState === 1 || reconnectInProgress) {
      return;
    }

    reconnectInProgress = true;
    connectDB({ exitOnFailure: false })
      .catch((error) => {
        console.error('[MONGO_RECONNECT] Reconnect attempt failed:', error.message);
      })
      .finally(() => {
        reconnectInProgress = false;
      });
  }, 5000);
};

const connectDB = async ({ exitOnFailure = true } = {}) => {
  try {
    // Debug: Show what URI is being used (mask password)
    const uri = process.env.MONGODB_URI;
    const maskedUri = uri ? uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@') : 'undefined';
    console.log('Attempting to connect with URI:', maskedUri);
    
    // Connection options for MongoDB Atlas
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 60000,
      maxPoolSize: 10,
      minPoolSize: 1,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    console.log(`Database: ${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    console.error('Full error:', error);
    if (exitOnFailure) {
      process.exit(1);
    }
    throw error;
  }
};

// Handle mongoose connection events
mongoose.connection.on('connected', () => {
  console.log('MongoDB connected');
});

mongoose.connection.on('reconnected', () => {
  console.log('MongoDB reconnected');
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
  scheduleReconnect();
});

mongoose.connection.on('error', (err) => {
  console.error(`MongoDB Error: ${err.message}`);
});

mongoose.connection.on('close', () => {
  console.log('MongoDB connection closed');
});

module.exports = connectDB;
