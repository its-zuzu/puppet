const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/cyberctf')
  .then(async () => {
    const user = await User.findOne({ email: 'admin@pwngrid.com' }).select('+password');
    if (user) {
      console.log('User found:');
      console.log('Username:', user.username);
      console.log('Email:', user.email);
      console.log('Role:', user.role);
      console.log('Has password:', !!user.password);
    } else {
      console.log('User not found');
    }
    mongoose.disconnect();
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
