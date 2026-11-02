const assert = require('assert');
const { connectTestDB, generateToken, createApiClient } = require('./testHelper');
const User = require('../models/User');
const College = require('../models/College');
const Issue = require('../models/Issue');
const Batch = require('../models/Batch');

async function testIssues() {
  console.log('\n--- Running Suite: Student Grievances & Resolution ---');
  await connectTestDB();

  let college = await College.findOne();
  assert.ok(college, 'College required for test');

  let student = await User.findOne({ role: 'student' });
  if (!student) {
    student = await User.create({
      name: 'Test Student',
      email: `student_test_${Date.now()}@example.com`,
      password: 'password123',
      role: 'student',
      rollNumber: '0801CA251001',
      college: college._id
    });
  } else if (!student.rollNumber) {
    student.rollNumber = '0801CA251001';
    await student.save();
  }

  const teacher = await User.findOne({ role: 'teacher' });
  const studentToken = generateToken(student);
  const teacherToken = generateToken(teacher);

  const studentClient = createApiClient(studentToken);
  const teacherClient = createApiClient(teacherToken);

  // Test 1: Fetch student grievances
  console.log('Test 5.1: Student fetches own grievances (/api/issues/my)');
  const resMy = await studentClient.get('/issues/my');
  assert.strictEqual(resMy.status, 200);
  assert.strictEqual(resMy.data.success, true);
  assert.ok(Array.isArray(resMy.data.data));
  console.log(`✓ Student fetched ${resMy.data.data.length} personal grievances`);

  // Test 2: Teacher fetches grievances
  console.log('Test 5.2: Teacher fetches college grievances (/api/issues/teacher)');
  const resTeacher = await teacherClient.get('/issues/teacher');
  assert.strictEqual(resTeacher.status, 200);
  assert.strictEqual(resTeacher.data.success, true);
  assert.ok(Array.isArray(resTeacher.data.data));
  console.log(`✓ Teacher fetched ${resTeacher.data.data.length} college grievances`);

  // Test 3: If an issue exists, test status update
  const sampleIssue = await Issue.findOne();
  if (sampleIssue) {
    console.log(`Test 5.3: Teacher reviews grievance ${sampleIssue._id}`);
    const resUpdate = await teacherClient.put(`/issues/${sampleIssue._id}`, {
      status: 'in_review',
      teacherResponse: 'The paper is under verification by the evaluator.'
    });
    assert.strictEqual(resUpdate.status, 200);
    assert.strictEqual(resUpdate.data.success, true);
    assert.strictEqual(resUpdate.data.data.status, 'in_review');
    console.log('✓ Grievance status transitioned to in_review');
  }

  console.log('✓ Issues test suite passed successfully');
}

module.exports = testIssues;

if (require.main === module) {
  testIssues().then(() => process.exit(0)).catch((err) => {
    console.error('Test Issues Failed:', err);
    process.exit(1);
  });
}
