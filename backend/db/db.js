// Backend/db/db.js
const mongoose = require('mongoose');

// Prefer environment variable; fallback to localhost for dev.
const getUri = () => {
  const envUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (envUri && typeof envUri === 'string' && envUri.trim().length > 0) return envUri.trim();
  // Local dev default (adjust if needed)
  return 'mongodb://127.0.0.1:27017/order_tracking_db';
};

const connectDB = async () => {
  try {
    const uri = getUri();
    await mongoose.connect(uri);
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection failed:', error && error.message ? error.message : error);
    throw error; // Surface error to platform (don’t hard-exit in serverless)
  }
};

module.exports = connectDB;
