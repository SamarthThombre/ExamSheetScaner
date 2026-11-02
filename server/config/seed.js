const College = require('../models/College');
const Department = require('../models/Department');
const User = require('../models/User');
const StudentRoster = require('../models/StudentRoster');

const seedInitialData = async () => {
  try {
    console.log('[Seed] Checking database initialization status...');

    // 1. Seed Default College: SGSITS
    let college = await College.findOne({ code: 'SGS' });
    if (!college) {
      college = await College.create({
        name: 'Shri Govindram Seksaria Institute of Technology and Science (SGSITS)',
        code: 'SGS',
        address: '23 Sir M. Visvesvaraya Marg, Vallabh Nagar, Indore, Madhya Pradesh 452003',
        isActive: true
      });
      console.log(`[Seed] Created default college: ${college.name} (${college.code})`);
    }

    // 2. Seed Departments
    let mcaDept = await Department.findOne({ college: college._id, code: 'MCA' });
    if (!mcaDept) {
      mcaDept = await Department.create({
        name: 'Master of Computer Applications',
        code: 'MCA',
        college: college._id,
        subjects: [
          { name: 'Computer Network & Data Communication', code: 'CT10716' },
          { name: 'Database Management Systems', code: 'CT10222' },
          { name: 'Operating Systems', code: 'CT10444' },
          { name: 'Software Engineering', code: 'CT10666' },
          { name: 'Data Structures & Algorithms', code: 'CT10888' }
        ]
      });
      console.log(`[Seed] Created department: MCA with ${mcaDept.subjects.length} subjects`);
    }

    let cseDept = await Department.findOne({ college: college._id, code: 'CSE' });
    if (!cseDept) {
      cseDept = await Department.create({
        name: 'Computer Science and Engineering',
        code: 'CSE',
        college: college._id,
        subjects: [
          { name: 'Design & Analysis of Algorithms', code: 'CS101' },
          { name: 'Compiler Design', code: 'CS102' },
          { name: 'Cloud Computing', code: 'CS103' }
        ]
      });
      console.log(`[Seed] Created department: CSE with ${cseDept.subjects.length} subjects`);
    }

    // 3. Seed Users
    const usersToSeed = [
      {
        name: 'Super Admin',
        email: 'superadmin@examscanweb.local',
        password: 'password123',
        role: 'super_admin',
        college: null,
        department: null
      },
      {
        name: 'SGSITS College Admin',
        email: 'admin@sgsits.ac.in',
        password: 'password123',
        role: 'college_admin',
        college: college._id,
        department: mcaDept._id
      },
      {
        name: 'Sam Admin',
        email: 'sam@gmail.com',
        password: 'password123',
        role: 'college_admin',
        college: college._id,
        department: mcaDept._id
      },
      {
        name: 'Prof. Sharma (Faculty)',
        email: 'faculty@sgsits.ac.in',
        password: 'password123',
        role: 'teacher',
        college: college._id,
        department: mcaDept._id,
        assignedSubjects: ['CT10716', 'CT10222', 'CT10444', 'CT10666', 'CT10888']
      },
      {
        name: 'Samarth Thombre',
        email: 'samthombre91@gmail.com',
        password: 'password123',
        role: 'student',
        college: college._id,
        department: mcaDept._id,
        rollNumber: '0801CA231001',
        enrolmentNo: '0801CA231001',
        enrolledSubjects: ['CT10716', 'CT10222', 'CT10444', 'CT10666', 'CT10888']
      },
      {
        name: 'Rahul Verma (Student)',
        email: 'student@sgsits.ac.in',
        password: 'password123',
        role: 'student',
        college: college._id,
        department: mcaDept._id,
        rollNumber: '0801CA231002',
        enrolmentNo: '0801CA231002',
        enrolledSubjects: ['CT10716', 'CT10222', 'CT10444', 'CT10666', 'CT10888']
      }
    ];

    for (const u of usersToSeed) {
      const existing = await User.findOne({ email: u.email.toLowerCase() });
      if (!existing) {
        await User.create(u);
        console.log(`[Seed] Seeded user: ${u.email} (${u.role})`);
      }
    }

    // 4. Seed Student Roster
    const rosterEntries = [
      {
        enrolmentNo: '0801CA231001',
        name: 'Samarth Thombre',
        email: 'samthombre91@gmail.com',
        college: college._id,
        department: mcaDept._id,
        session: '2023-2026',
        isRegistered: true
      },
      {
        enrolmentNo: '0801CA231002',
        name: 'Rahul Verma',
        email: 'student@sgsits.ac.in',
        college: college._id,
        department: mcaDept._id,
        session: '2023-2026',
        isRegistered: true
      },
      {
        enrolmentNo: '0801CA231003',
        name: 'Aarav Patel',
        email: 'aarav@sgsits.ac.in',
        college: college._id,
        department: mcaDept._id,
        session: '2023-2026',
        isRegistered: false
      },
      {
        enrolmentNo: '0801CA231004',
        name: 'Priya Sharma',
        email: 'priya@sgsits.ac.in',
        college: college._id,
        department: mcaDept._id,
        session: '2023-2026',
        isRegistered: false
      },
      {
        enrolmentNo: '0801CA231005',
        name: 'Ananya Gupta',
        email: 'ananya@sgsits.ac.in',
        college: college._id,
        department: mcaDept._id,
        session: '2023-2026',
        isRegistered: false
      }
    ];

    for (const r of rosterEntries) {
      const existing = await StudentRoster.findOne({
        enrolmentNo: r.enrolmentNo,
        college: r.college
      });
      if (!existing) {
        await StudentRoster.create(r);
        console.log(`[Seed] Seeded student roster: ${r.enrolmentNo} - ${r.name}`);
      }
    }

    console.log('[Seed] Database initialization check complete.');
  } catch (error) {
    console.error('[Seed Error] Failed to complete database seed:', error.message);
  }
};

module.exports = seedInitialData;
