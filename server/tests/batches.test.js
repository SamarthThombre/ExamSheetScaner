const assert = require('assert');
const { connectTestDB, generateToken, createApiClient } = require('./testHelper');
const User = require('../models/User');
const Batch = require('../models/Batch');

async function testBatches() {
  console.log('\n--- Running Suite: Batches & Examination Administration ---');
  await connectTestDB();

  const teacher = await User.findOne({ role: 'teacher' });
  assert.ok(teacher, 'Teacher user required for testing batches');

  const token = generateToken(teacher);
  const authedClient = createApiClient(token);

  // Test 1: Fetch batches
  console.log('Test 2.1: Fetch batches scoped to instructor');
  const resBatches = await authedClient.get('/batches');
  assert.strictEqual(resBatches.status, 200, 'Expected 200 from GET /batches');
  assert.strictEqual(resBatches.data.success, true);
  assert.ok(Array.isArray(resBatches.data.data), 'Expected array of batches');
  console.log(`✓ Fetched ${resBatches.data.data.length} scoped batches`);

  const batch = await Batch.findOne({ teacher: teacher._id });
  if (!batch) {
    console.log('Skipping specific batch detail tests (no batch created for teacher yet)');
    return;
  }

  // Test 2: Fetch specific batch detail
  console.log(`Test 2.2: Fetch batch details for ${batch.examName} (${batch._id})`);
  const resDetail = await authedClient.get(`/batches/${batch._id}`);
  assert.strictEqual(resDetail.status, 200);
  assert.strictEqual(resDetail.data.success, true);
  assert.strictEqual(String(resDetail.data.data._id), String(batch._id));
  console.log('✓ Batch details retrieved');

  // Test 3: Fetch batch statistics
  console.log(`Test 2.3: Retrieve batch aggregate stats`);
  const resStats = await authedClient.get(`/batches/${batch._id}/stats`);
  assert.strictEqual(resStats.status, 200);
  assert.strictEqual(resStats.data.success, true);
  assert.ok(resStats.data.data.totalSheets !== undefined, 'Stats must include totalSheets');
  assert.ok(resStats.data.data.okCount !== undefined, 'Stats must include okCount');
  console.log(`✓ Aggregate stats verified (Total: ${resStats.data.data.totalSheets}, Verified: ${resStats.data.data.okCount})`);

  // Test 4: Update CO parameters
  console.log(`Test 2.4: Update CO attainment settings`);
  const resCO = await authedClient.post(`/batches/${batch._id}/compute-co`, {
    coMaxMarks: 14,
    coThresholdHigh: 65,
    coThresholdMid: 50
  });
  assert.strictEqual(resCO.status, 200);
  assert.strictEqual(resCO.data.success, true);
  assert.strictEqual(resCO.data.data.batch.coMaxMarks, 14);
  console.log('✓ CO parameters updated and attainment recomputed');

  console.log('✓ Batches test suite passed successfully (4/4 tests passed)');
}

module.exports = testBatches;

if (require.main === module) {
  testBatches().then(() => process.exit(0)).catch((err) => {
    console.error('Test Batches Failed:', err);
    process.exit(1);
  });
}
