import * as XLSX from 'xlsx';

/**
 * Clean string for safe file names
 */
const sanitizeFileName = (str) => {
  return (str || 'Exam')
    .replace(/[/\\?%*:|"<>]/g, '_')
    .replace(/\s+/g, '_');
};

/**
 * Builds table rows data for Marks Report
 */
const buildMarksData = (batch, sheets = []) => {
  const nameMap = new Map();
  if (batch?.studentList && Array.isArray(batch.studentList)) {
    batch.studentList.forEach((s) => {
      if (s.enrolmentNo) nameMap.set(s.enrolmentNo.toUpperCase(), s.name);
    });
  }

  const headers = [
    'Enrolment No',
    'Student Name',
    'Q1',
    'Q2',
    'Q3',
    'Q4',
    'Q5',
    'Total',
    'Status',
    'CO1',
    'CO2',
    'CO3',
    'CO4',
    'CO5'
  ];

  const rows = [];
  let sumQ1 = 0;
  let sumQ2 = 0;
  let sumQ3 = 0;
  let sumQ4 = 0;
  let sumQ5 = 0;
  let sumTotal = 0;
  let sumCO1 = 0, countCO1 = 0;
  let sumCO2 = 0, countCO2 = 0;
  let sumCO3 = 0, countCO3 = 0;
  let sumCO4 = 0, countCO4 = 0;
  let sumCO5 = 0, countCO5 = 0;

  sheets.forEach((s) => {
    const q1 = s.q1 != null ? Number(s.q1) : 0;
    const q2 = s.q2 != null ? Number(s.q2) : 0;
    const q3 = s.q3 != null ? Number(s.q3) : 0;
    const q4 = s.q4 != null ? Number(s.q4) : 0;
    const q5 = s.q5 != null ? Number(s.q5) : 0;
    const total = s.totalMarks != null ? Number(s.totalMarks) : (q1 + q2 + q3 + q4 + q5);

    sumQ1 += q1;
    sumQ2 += q2;
    sumQ3 += q3;
    sumQ4 += q4;
    sumQ5 += q5;
    sumTotal += total;

    if (s.co1AT != null) { sumCO1 += Number(s.co1AT); countCO1++; }
    if (s.co2AT != null) { sumCO2 += Number(s.co2AT); countCO2++; }
    if (s.co3AT != null) { sumCO3 += Number(s.co3AT); countCO3++; }
    if (s.co4AT != null) { sumCO4 += Number(s.co4AT); countCO4++; }
    if (s.co5AT != null) { sumCO5 += Number(s.co5AT); countCO5++; }

    const studentName = (s.enrolment && nameMap.get(s.enrolment.toUpperCase())) || s.studentName || 'Student';

    rows.push([
      s.enrolment || 'N/A',
      studentName,
      q1,
      q2,
      q3,
      q4,
      q5,
      total,
      s.statusLabel || 'OK',
      s.co1AT != null ? s.co1AT : '-',
      s.co2AT != null ? s.co2AT : '-',
      s.co3AT != null ? s.co3AT : '-',
      s.co4AT != null ? s.co4AT : '-',
      s.co5AT != null ? s.co5AT : '-'
    ]);
  });

  const n = sheets.length || 1;
  const avgRow = [
    'AVERAGE',
    '',
    Math.round((sumQ1 / n) * 100) / 100,
    Math.round((sumQ2 / n) * 100) / 100,
    Math.round((sumQ3 / n) * 100) / 100,
    Math.round((sumQ4 / n) * 100) / 100,
    Math.round((sumQ5 / n) * 100) / 100,
    Math.round((sumTotal / n) * 100) / 100,
    '',
    countCO1 > 0 ? Math.round((sumCO1 / countCO1) * 100) / 100 : '-',
    countCO2 > 0 ? Math.round((sumCO2 / countCO2) * 100) / 100 : '-',
    countCO3 > 0 ? Math.round((sumCO3 / countCO3) * 100) / 100 : '-',
    countCO4 > 0 ? Math.round((sumCO4 / countCO4) * 100) / 100 : '-',
    countCO5 > 0 ? Math.round((sumCO5 / countCO5) * 100) / 100 : '-'
  ];

  return { headers, rows, avgRow };
};

/**
 * Generates and downloads an Excel file (.xlsx) with one sheet called "Marks Report"
 * @param {Object} batch
 * @param {Array<Object>} sheets
 */
export const exportMarksReport = (batch, sheets = []) => {
  const { headers, rows, avgRow } = buildMarksData(batch, sheets);
  const data = [headers, ...rows, avgRow];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(data);

  // Column widths
  ws['!cols'] = [
    { wch: 18 }, // Enrolment No
    { wch: 22 }, // Student Name
    { wch: 8 },  // Q1
    { wch: 8 },  // Q2
    { wch: 8 },  // Q3
    { wch: 8 },  // Q4
    { wch: 8 },  // Q5
    { wch: 10 }, // Total
    { wch: 12 }, // Status
    { wch: 8 },  // CO1
    { wch: 8 },  // CO2
    { wch: 8 },  // CO3
    { wch: 8 },  // CO4
    { wch: 8 }   // CO5
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Marks Report');

  const baseName = sanitizeFileName(`${batch?.examName || 'Batch'}_${batch?.subjectCode || 'Marks'}`);
  const fileName = `${baseName}_Marks_Report.xlsx`;

  XLSX.writeFile(wb, fileName);
};

/**
 * Generates and downloads a plain CSV file of the marks report
 * Formats strictly as: S.No, Enrollment No, Total, Q1, Q2, Q3, Q4, Q5
 * @param {Object} batch
 * @param {Array<Object>} sheets
 */
export const exportMarksCSV = (batch, sheets = []) => {
  const headers = [
    'S.No',
    'Enrollment No',
    'Total',
    'Q1',
    'Q2',
    'Q3',
    'Q4',
    'Q5'
  ];

  const escapeCSV = (val) => {
    if (val === null || val === undefined) return '""';
    const stringVal = String(val).replace(/"/g, '""');
    return `"${stringVal}"`;
  };

  const rows = sheets.map((s, index) => {
    const q1 = s.q1 != null && s.q1 !== '' ? s.q1 : '0';
    const q2 = s.q2 != null && s.q2 !== '' ? s.q2 : '0';
    const q3 = s.q3 != null && s.q3 !== '' ? s.q3 : '0';
    const q4 = s.q4 != null && s.q4 !== '' ? s.q4 : '0';
    const q5 = s.q5 != null && s.q5 !== '' ? s.q5 : '0';
    const total = s.totalMarks != null && s.totalMarks !== ''
      ? s.totalMarks
      : (parseFloat(q1) + parseFloat(q2) + parseFloat(q3) + parseFloat(q4) + parseFloat(q5));

    return [
      escapeCSV(index + 1),
      escapeCSV(s.enrolment || 'N/A'),
      escapeCSV(total),
      escapeCSV(q1),
      escapeCSV(q2),
      escapeCSV(q3),
      escapeCSV(q4),
      escapeCSV(q5)
    ];
  });

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  const baseName = sanitizeFileName(`${batch?.examName || 'Batch'}_${batch?.subjectCode || 'Marks'}`);
  link.setAttribute('href', url);
  link.setAttribute('download', `${baseName}_marks.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
