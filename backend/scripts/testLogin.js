const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/cyberctf')
  .then(async () => {
    const user = await User.findOne({ email: 'admin@pwngrid.com' }).select('+password');
    if (user) {
      console.log('User found:', user.email);
      console.log('Password field selected:', !!user.password);
      console.log('Password length:', user.password?.length);
    } else {
      console.log('User not found with findOne');
      const users = await User.find({ email: /pwngrid/i }).select('+password');
      console.log('Case-insensitive search found:', users.length);
      users.forEach(u => console.log('  -', u.email));
    }
    mongoose.disconnect();
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
