/**
 * seedUsers.js — Demo account seeder
 *
 * Passwords are taken from environment variables so no credentials
 * are hardcoded in source or git history.
 *
 * Usage:
 *   STUDENT_PASS=... INSTRUCTOR_PASS=... node src/utils/seedUsers.js
 *
 * If env vars are not set the script refuses to run, preventing
 * accidental seeding with predictable passwords.
 */
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';

const required = ['STUDENT_PASS', 'INSTRUCTOR_PASS', 'COORDINATOR_PASS', 'ADMIN_PASS'];
const missing = required.filter(k => !process.env[k]);
if (missing.length) {
  console.error('Missing required env vars:', missing.join(', '));
  console.error('Set them before running this script.');
  process.exit(1);
}

const DEMO_USERS = [
  {
    name: 'Demo Student',
    email: 'student@campusbridge.edu',
    passwordHash: process.env.STUDENT_PASS,
    role: 'student',
    program: 'Computer Science & Engineering',
    year: 3,
    skills: ['React', 'Node.js', 'MongoDB'],
    preferences: { theme: 'dark' },
  },
  {
    name: 'Demo Instructor',
    email: 'instructor@campusbridge.edu',
    passwordHash: process.env.INSTRUCTOR_PASS,
    role: 'instructor',
    department: 'Software Engineering',
    preferences: { theme: 'dark' },
  },
  {
    name: 'Demo Coordinator',
    email: 'coordinator@campusbridge.edu',
    passwordHash: process.env.COORDINATOR_PASS,
    role: 'coordinator',
    department: 'Career & Internship Office',
    preferences: { theme: 'dark' },
  },
  {
    name: 'Demo Administrator',
    email: 'admin@campusbridge.edu',
    passwordHash: process.env.ADMIN_PASS,
    role: 'admin',
    preferences: { theme: 'dark' },
  },
];

async function seed() {
  console.log('--- Seeding CampusBridge Demo Accounts ---');
  await connectDB();
  for (const userData of DEMO_USERS) {
    const existing = await User.findOne({ email: userData.email });
    if (!existing) {
      const user = new User(userData);
      await user.save();
      console.log(`✅ Seeded ${userData.role}: ${userData.email}`);
    } else {
      console.log(`ℹ️  Already exists: ${userData.email}`);
    }
  }
  console.log('--- Seed complete ---');
  await mongoose.connection.close();
  process.exit(0);
}

seed().catch(err => { console.error('Seed error:', err); process.exit(1); });
