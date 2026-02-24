require('dotenv').config();
const mongoose = require('mongoose');

console.log("Testing URI:", process.env.MONGODB_URI);

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("✅ Connected Successfully");
    process.exit(0);
  })
  .catch(err => {
    console.error("❌ Connection Failed");
    console.error(err);
    process.exit(1);
  });