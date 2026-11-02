const testAuth = require('./auth.test');
const testBatches = require('./batches.test');
const testSheets = require('./sheets.test');
const testRoster = require('./roster.test');
const testIssues = require('./issues.test');
const testResults = require('./results.test');

async function runAll() {
  const startTime = Date.now();
  console.log('====================================================');
  console.log('   ExamScanWeb Backend Automated Test Runner        ');
  console.log('====================================================');

  const suites = [
    { name: 'Auth & Accounts', fn: testAuth },
    { name: 'Batches & Scoping', fn: testBatches },
    { name: 'Sheets & Evaluation Search', fn: testSheets },
    { name: 'Roster & Missing Sheets', fn: testRoster },
    { name: 'Grievance Redressal', fn: testIssues },
    { name: 'Public Results Lookup', fn: testResults }
  ];

  let passed = 0;
  let failed = 0;
  const errors = [];

  for (const suite of suites) {
    try {
      await suite.fn();
      passed++;
    } catch (err) {
      failed++;
      errors.push({ name: suite.name, error: err });
      console.error(`\n❌ Suite Failed: ${suite.name}`);
      console.error(err);
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('\n====================================================');
  console.log('                  TEST SUMMARY                      ');
  console.log('====================================================');
  console.log(`Suites Passed: ${passed} / ${suites.length}`);
  console.log(`Suites Failed: ${failed}`);
  console.log(`Total Duration: ${duration}s`);

  if (failed > 0) {
    console.log('\nFailed Suites:');
    errors.forEach((e) => console.log(` - ${e.name}: ${e.error.message}`));
    console.log('====================================================\n');
    process.exit(1);
  } else {
    console.log('\n✅ All automated backend test suites passed cleanly!');
    console.log('====================================================\n');
    process.exit(0);
  }
}

runAll();
