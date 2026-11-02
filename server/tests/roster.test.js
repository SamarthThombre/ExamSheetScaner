const assert = require('assert');
const { connectTestDB, generateToken, createApiClient } = require('./testHelper');
const User = require('../models/User');
const Batch = require('../models/Batch');

async function testRoster() {
  console.log('\n--- Running Suite: Student Roster & Reconciliation ---');
  await connectTestDB();

  const teacher = await User.findOne({ role: 'teacher' });
  const batch = await Batch.findOne({ teacher: teacher._id });
  assert.ok(batch, 'Test requires an active batch');

  const token = generateToken(teacher);
  const authedClient = createApiClient(token);

  // Test 1: Upload / save student list
  console.log('Test 4.1: Save student list to batch');
  const testList = [
    { enrolmentNo: '0801CA251001', name: 'Aanand Kushwah' },
    { enrolmentNo: '0801CA251002', name: 'Aashish Chouhan' },
    { enrolmentNo: '0801CA259998', name: 'Missing Student Test Alpha' },
    { enrolmentNo: '0801CA259999', name: 'Missing Student Test Beta' }
  ];

  const resSave = await authedClient.put(`/batches/${batch._id}/student-list`, {
    studentList: testList
  });
  assert.strictEqual(resSave.status, 200);
  assert.strictEqual(resSave.data.success, true);
  assert.strictEqual(resSave.data.data.totalRoster, testList.length);
  console.log(`✓ Saved ${testList.length} students to batch roster`);

  // Test 2: Fetch student list & reconciliation
  console.log('Test 4.2: Retrieve student list and detect missing sheets');
  const resGet = await authedClient.get(`/batches/${batch._id}/student-list`);
  assert.strictEqual(resGet.status, 200);
  assert.strictEqual(resGet.data.success, true);
  const recon = resGet.data.data;

  assert.strictEqual(recon.totalRoster, testList.length);
  assert.ok(recon.missingCount >= 2, 'Expected at least the 2 test missing students to be flagged as missing');
  const hasMissingAlpha = recon.missingStudents.some((s) => s.enrolmentNo === '0801CA259998');
  const hasMissingBeta = recon.missingStudents.some((s) => s.enrolmentNo === '0801CA259999');
  assert.ok(hasMissingAlpha && hasMissingBeta, 'Both missing students should be present in missingStudents array');
  console.log(`✓ Reconciliation verified: ${recon.totalRoster} in roster, ${recon.evaluatedCount} evaluated, ${recon.missingCount} missing sheets identified`);

  console.log('✓ Student Roster test suite passed successfully (2/2 tests passed)');
}

module.exports = testRoster;

if (require.main === module) {
  testRoster().then(() => process.exit(0)).catch((err) => {
    console.error('Test Roster Failed:', err);
    process.exit(1);
  });
}
