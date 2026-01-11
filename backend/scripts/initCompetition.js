#!/usr/bin/env node

/**
 * Initialize Competition for CTFd-Style Graph
 * Creates or updates the active competition with a start time
 */

const mongoose = require('mongoose');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const Competition = require('../models/Competition');

async function initCompetition() {
  try {
    console.log('==============================================');
    console.log('  Initialize Competition');
    console.log('==============================================\n');

    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✓ Connected\n');

    // Check for existing active competition
    const existing = await Competition.findOne({ isActive: true });

    if (existing) {
      console.log('Found existing active competition:');
      console.log(`  Name: ${existing.name}`);
      console.log(`  Start Time: ${existing.startTime}`);
      console.log(`  Created: ${existing.createdAt}\n`);

      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const answer = await new Promise(resolve => {
        readline.question('Update start time to NOW? (y/n): ', resolve);
      });
      readline.close();

      if (answer.toLowerCase() === 'y') {
        existing.startTime = new Date();
        await existing.save();
        console.log('\n✓ Updated start time to:', existing.startTime);
      } else {
        console.log('\nKeeping existing start time.');
      }
    } else {
      // Create new competition
      const competition = await Competition.create({
        name: 'CTF Competition 2026',
        startTime: new Date(),
        isActive: true
      });

      console.log('✓ Created new competition:');
      console.log(`  Name: ${competition.name}`);
      console.log(`  Start Time: ${competition.startTime}`);
      console.log(`  ID: ${competition._id}\n`);
    }

    await mongoose.connection.close();
    console.log('✓ Competition initialized successfully\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run the script
initCompetition();
