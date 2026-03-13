const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/cyberctf')
  .then(async () => {
    const users = await User.find({ role: 'admin' }).select('email').lean();
    console.log('Raw admin emails:');
    users.forEach(u => {
      const email = u.email;
      console.log('Email:', email);
      console.log('Lowercase:', email.toLowerCase());
      console.log('Matches:', email === email.toLowerCase());
    });
    mongoose.disconnect();
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
