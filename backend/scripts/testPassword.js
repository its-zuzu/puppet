const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/cyberctf')
  .then(async () => {
    const user = await User.findOne({ email: 'admin@pwngrid.com' }).select('+password');
    if (user) {
      console.log('User found');
      const isMatch = await user.matchPassword('SuperAdmin');
      console.log('Password match:', isMatch);
      
      const manualMatch = await bcrypt.compare('SuperAdmin', user.password);
      console.log('Manual bcrypt match:', manualMatch);
    } else {
      console.log('User not found');
    }
    mongoose.disconnect();
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
