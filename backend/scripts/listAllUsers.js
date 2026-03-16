const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ctfquest';

mongoose.connect(mongoUri)
  .then(async () => {
    const users = await User.find({}).select('username email role');
    console.log('Total users:', users.length);
    users.forEach(u => {
      console.log(`${u.username} (${u.email}) - ${u.role}`);
    });
    mongoose.disconnect();
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
