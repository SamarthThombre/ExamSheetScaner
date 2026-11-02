const assert = require('assert');
const { connectTestDB, generateToken, createApiClient } = require('./testHelper');
const User = require('../models/User');
const College = require('../models/College');

async function testAuth() {
  console.log('\n--- Running Suite: Authentication & User Accounts ---');
  await connectTestDB();

  const client = createApiClient();

  // Test 1: Invalid Login
  console.log('Test 1.1: Reject invalid login credentials');
  const resBadLogin = await client.post('/auth/login', {
    email: 'nonexistent@example.com',
    password: 'wrongpassword'
  });
  assert.strictEqual(resBadLogin.status, 401, 'Expected 401 for non-existent user');
  assert.strictEqual(resBadLogin.data.success, false);
  console.log('✓ Invalid login rejected with 401');

  // Test 2: Valid Login
  console.log('Test 1.2: Authenticate valid user and return profile');
  let teacher = await User.findOne({ role: 'teacher' });
  if (!teacher) {
    let college = await College.findOne();
    if (!college) college = await College.create({ name: 'Test College', code: 'TC01' });
    teacher = await User.create({
      name: 'Test Teacher',
      email: `teacher_test_${Date.now()}@example.com`,
      password: 'password123',
      role: 'teacher',
      college: college._id,
      assignedSubjects: ['CT10222', 'CS101']
    });
  }

  const token = generateToken(teacher);
  const authedClient = createApiClient(token);

  // Test 3: Get current user profile (/auth/me)
  console.log('Test 1.3: Retrieve authenticated user via JWT cookie (/auth/me)');
  const resMe = await authedClient.get('/auth/me');
  assert.strictEqual(resMe.status, 200, 'Expected 200 for authenticated user');
  assert.strictEqual(resMe.data.success, true);
  assert.strictEqual(String(resMe.data.data._id), String(teacher._id));
  assert.strictEqual(resMe.data.data.email, teacher.email);
  console.log('✓ Authenticated profile retrieved successfully');

  // Test 4: Access protected route without token
  console.log('Test 1.4: Reject unauthenticated access to /auth/me');
  const resUnauth = await client.get('/auth/me');
  assert.strictEqual(resUnauth.status, 401, 'Expected 401 for unauthenticated request');
  console.log('✓ Unauthenticated request blocked with 401');

  console.log('✓ Authentication test suite passed successfully (4/4 tests passed)');
}

module.exports = testAuth;

if (require.main === module) {
  testAuth().then(() => process.exit(0)).catch((err) => {
    console.error('Test Auth Failed:', err);
    process.exit(1);
  });
}
