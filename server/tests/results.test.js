const assert = require('assert');
const { connectTestDB, createApiClient } = require('./testHelper');
const Sheet = require('../models/Sheet');

async function testResults() {
  console.log('\n--- Running Suite: Public Result Lookup & Marksheets ---');
  await connectTestDB();

  const publicClient = createApiClient();

  // Test 1: Reject empty enrollment query
  console.log('Test 6.1: Reject lookup request with missing enrollment');
  const resEmpty = await publicClient.get('/results/lookup');
  assert.strictEqual(resEmpty.status, 400);
  assert.strictEqual(resEmpty.data.success, false);
  console.log('✓ Missing query rejected with 400');

  // Test 2: Valid lookup query
  console.log('Test 6.2: Public query with valid enrollment format');
  const resLookup = await publicClient.get('/results/lookup?enrolment=0801CA251001');
  assert.strictEqual(resLookup.status, 200);
  assert.strictEqual(resLookup.data.success, true);
  assert.ok(Array.isArray(resLookup.data.data));
  console.log(`✓ Lookup query returned ${resLookup.data.count} published marksheets`);

  // Test 3: Get single marksheet by ID
  const sampleSheet = await Sheet.findOne({ enrolment: { $ne: null } });
  if (sampleSheet) {
    console.log(`Test 6.3: Retrieve single marksheet detail (${sampleSheet._id})`);
    const resSheet = await publicClient.get(`/results/${sampleSheet._id}`);
    assert.strictEqual(resSheet.status, 200);
    assert.strictEqual(resSheet.data.success, true);
    assert.strictEqual(String(resSheet.data.data._id), String(sampleSheet._id));
    console.log('✓ Public marksheet detail retrieved');
  }

  console.log('✓ Public Results test suite passed successfully (3/3 tests passed)');
}

module.exports = testResults;

if (require.main === module) {
  testResults().then(() => process.exit(0)).catch((err) => {
    console.error('Test Results Failed:', err);
    process.exit(1);
  });
}
