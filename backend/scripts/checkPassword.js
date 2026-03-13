const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const User = require('../models/User');

// Load environment variables
dotenv.config();

// Admin credentials to check
const adminCredentials = {
  email: 'admin@cyberctf.com',
  password: 'admin123'
};

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/cyberctf')
  .then(async () => {
    console.log('MongoDB connected successfully');
    
    try {
      // Find admin user with password
      const user = await User.findOne({ email: adminCredentials.email }).select('+password');
      
      if (!user) {
        console.log('User not found');
        return;
      }
      
      console.log('User found:', {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      });
      
      // Check password manually
      console.log('Password from request:', adminCredentials.password);
      console.log('Hashed password in DB:', user.password);
      
      // Try both the matchPassword method and direct bcrypt compare
      try {
        const isMatchMethod = await user.matchPassword(adminCredentials.password);
        console.log('Password match using method:', isMatchMethod);
      } catch (err) {
        console.error('Error using matchPassword method:', err.message);
      }
      
      try {
        const isMatchDirect = await bcrypt.compare(adminCredentials.password, user.password);
        console.log('Password match using direct bcrypt.compare:', isMatchDirect);
        
        if (!isMatchDirect) {
          // If password doesn't match, update it
          console.log('Updating password...');
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(adminCredentials.password, salt);
          
          user.password = hashedPassword;
          await user.save();
          
          console.log('Password updated successfully');
          console.log('New hashed password:', hashedPassword);
          
          // Verify the new password
          const verifyMatch = await bcrypt.compare(adminCredentials.password, hashedPassword);
          console.log('Verification of new password:', verifyMatch);
        }
      } catch (err) {
        console.error('Error using direct bcrypt.compare:', err.message);
      }
      
    } catch (error) {
      console.error('Error checking password:', error.message);
    } finally {
      mongoose.disconnect();
      process.exit(0);
    }
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
