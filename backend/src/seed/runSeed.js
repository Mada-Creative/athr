// Optional helper: creates one demo account so the app can be explored
// immediately after `npm run dev`. Safe to run multiple times.
require('dotenv').config();
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');
const User = require('../models/User');
const CustomTask = require('../models/CustomTask');

async function run() {
  await connectDB();

  const email = 'demo@athr.app';
  const existing = await User.findOne({ email });
  if (existing) {
    console.log('Demo user already exists:', email);
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash('athr1234', 10);
  const user = await User.create({ name: 'مستخدم تجريبي', email, passwordHash });

  await CustomTask.create({
    user: user._id,
    group: 'dailyDeeds',
    title: 'صلاة الضحى',
    description: 'من 2 إلى 8 ركعات بعد شروق الشمس',
    icon: 'sun',
  });

  console.log('Created demo user -> email: demo@athr.app / password: athr1234');
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
