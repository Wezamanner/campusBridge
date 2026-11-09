import mongoose from 'mongoose';
import { config } from '../config/env.js';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';

const DEMO_USERS = [
  {
    name: 'Sabrin Abdu',
    email: 'student@campusbridge.edu',
    passwordHash: 'StudentPass123!',
    role: 'student',
    program: 'Computer Science & Engineering',
    year: 4,
    skills: ['React', 'Node.js', 'MongoDB', 'Python'],
    preferences: { theme: 'dark' },
  },
  {
    name: 'Dr. Jane Smith',
    email: 'instructor@campusbridge.edu',
    passwordHash: 'InstructorPass123!',
    role: 'instructor',
    department: 'Software Engineering',
    preferences: { theme: 'dark' },
  },
  {
    name: 'Alex Coordinator',
    email: 'coordinator@campusbridge.edu',
    passwordHash: 'CoordinatorPass123!',
    role: 'coordinator',
    department: 'Career & Internship Office',
    preferences: { theme: 'dark' },
  },
  {
    name: 'Platform Administrator',
    email: 'admin@campusbridge.edu',
    passwordHash: 'AdminPass123!',
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
      console.log(`✅ Seeded ${userData.role} user: ${userData.email}`);
    } else {
      console.log(`ℹ️ User already exists: ${userData.email}`);
    }
  }

  console.log('--- Demo Users Seed Complete ---');
  await mongoose.connection.close();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed Error:', err);
  process.exit(1);
});
