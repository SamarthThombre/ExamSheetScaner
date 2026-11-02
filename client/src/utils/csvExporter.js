/**
 * Export evaluation sheets data to CSV format
 * Formats strictly as: S.No, Enrollment No, Total, Q1, Q2, Q3, Q4, Q5
 * @param {Array} sheets - Array of sheet objects
 * @param {string} examName - Name of the exam for filename
 */
export const exportSheetsToCSV = (sheets = [], examName = 'exam_results') => {
  if (!sheets || sheets.length === 0) {
    alert('No sheet data available to export.');
    return;
  }

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
    const q1 = s.q1 !== null && s.q1 !== undefined && s.q1 !== '' ? s.q1 : '0';
    const q2 = s.q2 !== null && s.q2 !== undefined && s.q2 !== '' ? s.q2 : '0';
    const q3 = s.q3 !== null && s.q3 !== undefined && s.q3 !== '' ? s.q3 : '0';
    const q4 = s.q4 !== null && s.q4 !== undefined && s.q4 !== '' ? s.q4 : '0';
    const q5 = s.q5 !== null && s.q5 !== undefined && s.q5 !== '' ? s.q5 : '0';
    const total = s.totalMarks !== null && s.totalMarks !== undefined && s.totalMarks !== ''
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

  const safeFileName = examName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  link.setAttribute('href', url);
  link.setAttribute('download', `${safeFileName}_marks.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
