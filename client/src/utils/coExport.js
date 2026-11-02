import * as XLSX from 'xlsx';

/**
 * Generates and downloads a two-sheet CO Attainment Excel workbook matching university accreditation format.
 *
 * Sheet 1: Detailed per-student question marks and CO breakdown (OB, T, %, AT level).
 * Sheet 2: Summary CO Attainment levels (1, 2, or 3) per student with class-level averages.
 *
 * @param {Object} batch - The evaluation batch object
 * @param {Array<Object>} sheets - Evaluated sheets list in the batch
 */
export const exportCOAttainmentExcel = (batch, sheets = []) => {
  const wb = XLSX.utils.book_new();

  const T = batch.coMaxMarks || 14;
  const highThresh = batch.coThresholdHigh || 65;
  const midThresh = batch.coThresholdMid || 50;

  // Filter sheets that have marks or enrolment
  const validSheets = sheets.filter(
    (s) => s.enrolment || s.totalMarks != null || s.q1 != null
  );

  // Map student names from batch.studentList
  const nameMap = new Map();
  if (batch.studentList && Array.isArray(batch.studentList)) {
    batch.studentList.forEach((s) => {
      if (s.enrolmentNo) {
        nameMap.set(s.enrolmentNo.toUpperCase().trim(), s.name ? s.name.trim() : '');
      }
    });
  }

  // Identify missing sheets (students in roster who have no evaluated sheet)
  const evaluatedSet = new Set(
    sheets.map((s) => (s.enrolment ? s.enrolment.toUpperCase().trim() : '')).filter(Boolean)
  );
  const missingStudents = (batch.studentList || []).filter(
    (student) => student.enrolmentNo && !evaluatedSet.has(student.enrolmentNo.toUpperCase().trim())
  );

  // Helper to calculate or read CO metrics for a single question
  const getSheetCO = (sheet, qIndex) => {
    const qKey = `q${qIndex}`;
    const rawVal = sheet[qKey];
    let ob = 0;
    if (rawVal != null && rawVal !== '') {
      const parsed = parseFloat(rawVal);
      if (!isNaN(parsed)) ob = parsed;
    }
    const pct = T > 0 ? (ob / T) * 100 : 0;
    let at = 1;
    if (pct > highThresh) at = 3;
    else if (pct >= midThresh) at = 2;
    else at = 1;

    return {
      ob: sheet[`co${qIndex}OB`] != null ? sheet[`co${qIndex}OB`] : Math.round(ob * 100) / 100,
      t: T,
      pct: sheet[`co${qIndex}Pct`] != null ? sheet[`co${qIndex}Pct`] : Math.round(pct * 100) / 100,
      at: sheet[`co${qIndex}AT`] != null ? sheet[`co${qIndex}AT`] : at
    };
  };

  // ==========================================
  // SHEET 1: DETAILED CO ATTAINMENT
  // ==========================================
  const sheet1Rows = [];

  // Title rows
  sheet1Rows.push([
    `${batch.subjectCode || 'SUBJECT'} - CO ATTAINMENT OF MAIN EXAM - ${batch.examName || 'EXAMINATION'}`
  ]);
  sheet1Rows.push([
    `Course: ${batch.subjectName || batch.subjectCode} | Target Marks (T): ${T} | High Threshold: >${highThresh}% (Lvl 3) | Mid Threshold: >=${midThresh}% (Lvl 2)`
  ]);
  sheet1Rows.push([]); // Empty row

  // Header Row 1
  sheet1Rows.push([
    'ENT-NO',
    'STUDENT NAME',
    'Q:01',
    'Q:02',
    'Q:03',
    'Q:04',
    'Q:05',
    'Total',
    '',
    'CO1',
    '',
    '',
    '',
    'CO2',
    '',
    '',
    '',
    'CO3',
    '',
    '',
    '',
    'CO4',
    '',
    '',
    '',
    'CO5',
    '',
    '',
    ''
  ]);

  // Header Row 2: Sub-columns
  sheet1Rows.push([
    '',
    '',
    'CO1',
    'CO2',
    'CO3',
    'CO4',
    'CO5',
    'SUM',
    '',
    'OB',
    'T',
    '%',
    'AT',
    'OB',
    'T',
    '%',
    'AT',
    'OB',
    'T',
    '%',
    'AT',
    'OB',
    'T',
    '%',
    'AT',
    'OB',
    'T',
    '%',
    'AT'
  ]);

  // Sum accumulators for average row
  let q1Sum = 0, q2Sum = 0, q3Sum = 0, q4Sum = 0, q5Sum = 0, totalSum = 0;
  const coAccum = {
    co1: { obSum: 0, pctSum: 0, atSum: 0 },
    co2: { obSum: 0, pctSum: 0, atSum: 0 },
    co3: { obSum: 0, pctSum: 0, atSum: 0 },
    co4: { obSum: 0, pctSum: 0, atSum: 0 },
    co5: { obSum: 0, pctSum: 0, atSum: 0 }
  };

  validSheets.forEach((sheet) => {
    const q1 = parseFloat(sheet.q1) || 0;
    const q2 = parseFloat(sheet.q2) || 0;
    const q3 = parseFloat(sheet.q3) || 0;
    const q4 = parseFloat(sheet.q4) || 0;
    const q5 = parseFloat(sheet.q5) || 0;
    const total = parseFloat(sheet.totalMarks) || (q1 + q2 + q3 + q4 + q5);

    q1Sum += q1;
    q2Sum += q2;
    q3Sum += q3;
    q4Sum += q4;
    q5Sum += q5;
    totalSum += total;

    const co1 = getSheetCO(sheet, 1);
    const co2 = getSheetCO(sheet, 2);
    const co3 = getSheetCO(sheet, 3);
    const co4 = getSheetCO(sheet, 4);
    const co5 = getSheetCO(sheet, 5);

    coAccum.co1.obSum += co1.ob;
    coAccum.co1.pctSum += co1.pct;
    coAccum.co1.atSum += co1.at;

    coAccum.co2.obSum += co2.ob;
    coAccum.co2.pctSum += co2.pct;
    coAccum.co2.atSum += co2.at;

    coAccum.co3.obSum += co3.ob;
    coAccum.co3.pctSum += co3.pct;
    coAccum.co3.atSum += co3.at;

    coAccum.co4.obSum += co4.ob;
    coAccum.co4.pctSum += co4.pct;
    coAccum.co4.atSum += co4.at;

    coAccum.co5.obSum += co5.ob;
    coAccum.co5.pctSum += co5.pct;
    coAccum.co5.atSum += co5.at;

    const mappedName = (sheet.enrolment && nameMap.get(sheet.enrolment.toUpperCase().trim())) || sheet.studentName || 'Candidate';

    sheet1Rows.push([
      sheet.enrolment || 'N/A',
      mappedName,
      q1,
      q2,
      q3,
      q4,
      q5,
      total,
      '',
      co1.ob,
      co1.t,
      co1.pct,
      co1.at,
      co2.ob,
      co2.t,
      co2.pct,
      co2.at,
      co3.ob,
      co3.t,
      co3.pct,
      co3.at,
      co4.ob,
      co4.t,
      co4.pct,
      co4.at,
      co5.ob,
      co5.t,
      co5.pct,
      co5.at
    ]);
  });

  // Calculate Averages
  const count = validSheets.length || 1;
  const round2 = (num) => Math.round((num / count) * 100) / 100;

  sheet1Rows.push([
    'AVERAGE',
    `Total Students: ${validSheets.length}`,
    round2(q1Sum),
    round2(q2Sum),
    round2(q3Sum),
    round2(q4Sum),
    round2(q5Sum),
    round2(totalSum),
    '',
    round2(coAccum.co1.obSum),
    T,
    round2(coAccum.co1.pctSum),
    round2(coAccum.co1.atSum),
    round2(coAccum.co2.obSum),
    T,
    round2(coAccum.co2.pctSum),
    round2(coAccum.co2.atSum),
    round2(coAccum.co3.obSum),
    T,
    round2(coAccum.co3.pctSum),
    round2(coAccum.co3.atSum),
    round2(coAccum.co4.obSum),
    T,
    round2(coAccum.co4.pctSum),
    round2(coAccum.co4.atSum),
    round2(coAccum.co5.obSum),
    T,
    round2(coAccum.co5.pctSum),
    round2(coAccum.co5.atSum)
  ]);

  const ws1 = XLSX.utils.aoa_to_sheet(sheet1Rows);

  // Set column widths for readability in Sheet 1
  ws1['!cols'] = [
    { wch: 16 }, // ENT-NO
    { wch: 22 }, // STUDENT NAME
    { wch: 8 },  // Q1
    { wch: 8 },  // Q2
    { wch: 8 },  // Q3
    { wch: 8 },  // Q4
    { wch: 8 },  // Q5
    { wch: 9 },  // Total
    { wch: 3 },  // separator
    { wch: 8 }, { wch: 6 }, { wch: 8 }, { wch: 6 }, // CO1
    { wch: 8 }, { wch: 6 }, { wch: 8 }, { wch: 6 }, // CO2
    { wch: 8 }, { wch: 6 }, { wch: 8 }, { wch: 6 }, // CO3
    { wch: 8 }, { wch: 6 }, { wch: 8 }, { wch: 6 }, // CO4
    { wch: 8 }, { wch: 6 }, { wch: 8 }, { wch: 6 }  // CO5
  ];

  XLSX.utils.book_append_sheet(wb, ws1, 'CO Attainment Detailed');

  // ==========================================
  // SHEET 2: SUMMARY CO ATTAINMENT
  // ==========================================
  const sheet2Rows = [];

  sheet2Rows.push([
    `${batch.subjectCode || 'SUBJECT'} - SUMMARY CO ATTAINMENT - ${batch.examName || 'EXAMINATION'}`
  ]);
  sheet2Rows.push([
    `Formula: AT = 3 if %>${highThresh}, 2 if %>=${midThresh}, else 1 (Max Target T = ${T})`
  ]);
  sheet2Rows.push([]);

  sheet2Rows.push([
    'S.NO.',
    'ENROLLMENT NO.',
    'STUDENT NAME',
    'CO1 ATTAINMENT',
    'CO2 ATTAINMENT',
    'CO3 ATTAINMENT',
    'CO4 ATTAINMENT',
    'CO5 ATTAINMENT',
    'STUDENT AVG'
  ]);

  validSheets.forEach((sheet, idx) => {
    const co1 = getSheetCO(sheet, 1);
    const co2 = getSheetCO(sheet, 2);
    const co3 = getSheetCO(sheet, 3);
    const co4 = getSheetCO(sheet, 4);
    const co5 = getSheetCO(sheet, 5);

    const studentAvg = Math.round(((co1.at + co2.at + co3.at + co4.at + co5.at) / 5) * 100) / 100;
    const mappedName = (sheet.enrolment && nameMap.get(sheet.enrolment.toUpperCase().trim())) || sheet.studentName || 'Candidate';

    sheet2Rows.push([
      idx + 1,
      sheet.enrolment || 'N/A',
      mappedName,
      co1.at,
      co2.at,
      co3.at,
      co4.at,
      co5.at,
      studentAvg
    ]);
  });

  const avgCO1 = round2(coAccum.co1.atSum);
  const avgCO2 = round2(coAccum.co2.atSum);
  const avgCO3 = round2(coAccum.co3.atSum);
  const avgCO4 = round2(coAccum.co4.atSum);
  const avgCO5 = round2(coAccum.co5.atSum);
  const overallClassAvg = Math.round(((avgCO1 + avgCO2 + avgCO3 + avgCO4 + avgCO5) / 5) * 100) / 100;

  sheet2Rows.push([]);
  sheet2Rows.push([
    'CLASS AVERAGE',
    '',
    `Students: ${validSheets.length}`,
    avgCO1,
    avgCO2,
    avgCO3,
    avgCO4,
    avgCO5,
    overallClassAvg
  ]);

  const ws2 = XLSX.utils.aoa_to_sheet(sheet2Rows);

  ws2['!cols'] = [
    { wch: 8 },  // S.NO
    { wch: 18 }, // ENROLLMENT NO
    { wch: 24 }, // NAME
    { wch: 16 }, // CO1
    { wch: 16 }, // CO2
    { wch: 16 }, // CO3
    { wch: 16 }, // CO4
    { wch: 16 }, // CO5
    { wch: 14 }  // AVG
  ];

  XLSX.utils.book_append_sheet(wb, ws2, 'CO Attainment Summary');

  // ==========================================
  // SHEET 3: MISSING SHEETS & ABSENTEES (IF ROSTER PROVIDED)
  // ==========================================
  if (missingStudents.length > 0) {
    const sheet3Rows = [];
    sheet3Rows.push([
      `${batch.subjectCode || 'SUBJECT'} - MISSING ANSWER SHEETS / UNACCOUNTED ROSTER STUDENTS`
    ]);
    sheet3Rows.push([
      `Batch Exam: ${batch.examName || 'Exam'} | Total Roster: ${batch.studentList.length} | Evaluated Sheets: ${validSheets.length} | Missing: ${missingStudents.length}`
    ]);
    sheet3Rows.push([]);
    sheet3Rows.push([
      'S.NO.',
      'ENROLLMENT NO.',
      'STUDENT NAME',
      'STATUS',
      'REMARKS'
    ]);

    missingStudents.forEach((student, idx) => {
      sheet3Rows.push([
        idx + 1,
        student.enrolmentNo,
        student.name || 'Candidate',
        'MISSING SHEET',
        'In course roster but no evaluated answer sheet was detected'
      ]);
    });

    const ws3 = XLSX.utils.aoa_to_sheet(sheet3Rows);
    ws3['!cols'] = [
      { wch: 8 },  // S.NO
      { wch: 18 }, // ENROLLMENT NO
      { wch: 26 }, // STUDENT NAME
      { wch: 18 }, // STATUS
      { wch: 45 }  // REMARKS
    ];

    XLSX.utils.book_append_sheet(wb, ws3, 'Missing Sheets & Absentees');
  }

  // Trigger Excel file download in the browser
  const safeSubject = (batch.subjectCode || 'Exam').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeExam = (batch.examName || 'Batch').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${safeSubject}_CO_Attainment_${safeExam}.xlsx`;

  XLSX.writeFile(wb, filename);
  return filename;
};
