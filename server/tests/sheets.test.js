const assert = require('assert');
const { connectTestDB, generateToken, createApiClient } = require('./testHelper');
const User = require('../models/User');
const Batch = require('../models/Batch');
const Sheet = require('../models/Sheet');

async function testSheets() {
  console.log('\n--- Running Suite: Answer Sheets, Evaluation & Search ---');
  await connectTestDB();

  const teacher = await User.findOne({ role: 'teacher' });
  const batch = await Batch.findOne({ teacher: teacher._id });
  assert.ok(batch, 'Test requires an active batch');

  const token = generateToken(teacher);
  const authedClient = createApiClient(token);

  // Test 1: Fetch paginated sheets
  console.log('Test 3.1: Fetch paginated sheets');
  const resSheets = await authedClient.get(`/batches/${batch._id}/sheets?page=1&limit=20`);
  assert.strictEqual(resSheets.status, 200);
  assert.strictEqual(resSheets.data.success, true);
  assert.ok(Array.isArray(resSheets.data.data));
  console.log(`✓ Fetched ${resSheets.data.data.length} sheets (Total: ${resSheets.data.total})`);

  const sampleSheet = await Sheet.findOne({ batch: batch._id, enrolment: { $ne: null } });
  if (!sampleSheet) {
    console.log('Skipping sheet specific update and search tests (no sheet with enrollment found)');
    return;
  }

  // Test 2: Search by exact enrollment number
  console.log(`Test 3.2: Search sheets by enrollment number (${sampleSheet.enrolment})`);
  const resSearch = await authedClient.get(`/batches/${batch._id}/sheets?search=${encodeURIComponent(sampleSheet.enrolment)}`);
  assert.strictEqual(resSearch.status, 200);
  assert.strictEqual(resSearch.data.success, true);
  assert.ok(resSearch.data.data.length > 0, 'Search should return at least one sheet');
  const found = resSearch.data.data.some((s) => s.enrolment === sampleSheet.enrolment);
  assert.ok(found, `Expected to find sheet with enrollment ${sampleSheet.enrolment}`);
  console.log(`✓ Search by enrollment verified (${resSearch.data.data.length} matches)`);

  // Test 3: Search by orderIndex (numeric)
  console.log(`Test 3.3: Search sheets by sheet order index (${sampleSheet.orderIndex})`);
  const resOrderSearch = await authedClient.get(`/batches/${batch._id}/sheets?search=${sampleSheet.orderIndex}`);
  assert.strictEqual(resOrderSearch.status, 200);
  assert.ok(resOrderSearch.data.data.length > 0);
  console.log('✓ Numeric search by sheet index verified');

  // Test 4: Search non-existent enrollment returns 0
  console.log('Test 3.4: Search with non-existent query returns 0 matches');
  const resEmptySearch = await authedClient.get(`/batches/${batch._id}/sheets?search=NONEXISTENT_QUERY_9999`);
  assert.strictEqual(resEmptySearch.status, 200);
  assert.strictEqual(resEmptySearch.data.total, 0);
  assert.strictEqual(resEmptySearch.data.data.length, 0);
  console.log('✓ Empty search results handled gracefully');

  // Test 5: Update marks, verify auto-transition to Verified (OK)
  console.log(`Test 3.5: User evaluation save transitions status to Verified (OK)`);
  const resUpdate = await authedClient.put(`/batches/${batch._id}/sheets/${sampleSheet._id}`, {
    enrolment: sampleSheet.enrolment,
    totalMarks: '50',
    q1: '10',
    q2: '10',
    q3: '10',
    q4: '10',
    q5: '10'
  });
  assert.strictEqual(resUpdate.status, 200);
  assert.strictEqual(resUpdate.data.success, true);
  const updated = resUpdate.data.data;
  assert.strictEqual(updated.statusLabel, 'OK', 'Human save must transition statusLabel to OK');
  assert.strictEqual(updated.needsReview, false, 'Human save must clear needsReview');
  assert.strictEqual(updated.rescanRecommended, false, 'Human save must clear rescanRecommended');
  assert.strictEqual(updated.sumCheck, 'AGREE', 'Sum check should be AGREE when sum matches total');
  console.log('✓ Evaluation marks saved, status auto-transitioned to Verified (OK), and sum agreement confirmed');

  console.log('✓ Sheets test suite passed successfully (5/5 tests passed)');
}

module.exports = testSheets;

if (require.main === module) {
  testSheets().then(() => process.exit(0)).catch((err) => {
    console.error('Test Sheets Failed:', err);
    process.exit(1);
  });
}
