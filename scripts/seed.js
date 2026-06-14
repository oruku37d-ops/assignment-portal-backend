require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('../src/config/database');
const { User, LecturerStudent } = require('../src/models');

async function main() {
  await connectDB();

  const adminPass = await bcrypt.hash('Admin123!', 10);
  const lecturerPass = await bcrypt.hash('Lecturer123!', 10);
  const studentPass = await bcrypt.hash('Student123!', 10);

  const admin = await User.findOneAndUpdate(
    { email: 'admin@academic.edu' },
    { email: 'admin@academic.edu', password: adminPass, name: 'Demo Admin', role: 'ADMIN' },
    { upsert: true, new: true },
  );

  const lecturer = await User.findOneAndUpdate(
    { email: 'lecturer@academic.edu' },
    { email: 'lecturer@academic.edu', password: lecturerPass, name: 'Demo Lecturer', role: 'LECTURER' },
    { upsert: true, new: true },
  );

  const student = await User.findOneAndUpdate(
    { email: 'student@academic.edu' },
    { email: 'student@academic.edu', password: studentPass, name: 'Demo Student', role: 'STUDENT' },
    { upsert: true, new: true },
  );

  await LecturerStudent.findOneAndUpdate(
    { lecturerId: lecturer._id, studentId: student._id },
    { lecturerId: lecturer._id, studentId: student._id, assignedAt: new Date() },
    { upsert: true },
  );

  console.log('Seeded admin: admin@academic.edu / Admin123!');
  console.log('Seeded lecturer: lecturer@academic.edu / Lecturer123!');
  console.log('Seeded student: student@academic.edu / Student123!');
  console.log(`Admin ID: ${admin._id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
