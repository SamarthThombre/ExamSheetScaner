import { jsPDF } from 'jspdf';

/**
 * Generate and download an official student exam marksheet PDF
 * @param {Object} sheet - Evaluated sheet object
 * @param {Object} batch - Batch and college metadata
 */
export const generateMarksheetPDF = (sheet, batch = {}) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const collegeName = batch.college?.name || 'Institution of Higher Education';
  const collegeCode = batch.college?.code || 'INST';
  const collegeAddress = batch.college?.address || 'Official Examination Center';
  const examName = batch.examName || 'Examination Evaluation';
  const subjectCode = batch.subjectCode || 'N/A';
  const enrolment = sheet.enrolment || 'N/A';
  const totalScore = sheet.totalMarks != null ? parseFloat(sheet.totalMarks) : 0;
  const isPass = totalScore >= 20;

  // Outer Border Box
  doc.setDrawColor(79, 70, 229); // Brand Indigo
  doc.setLineWidth(1);
  doc.rect(10, 10, pageWidth - 20, 277);

  // Inner Accent Border
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.setLineWidth(0.3);
  doc.rect(13, 13, pageWidth - 26, 271);

  // Institution Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59); // Slate 800
  doc.text(collegeName.toUpperCase(), pageWidth / 2, 28, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // Slate 500
  doc.text(`${collegeAddress} • Institution Code: ${collegeCode}`, pageWidth / 2, 34, {
    align: 'center'
  });

  // Dividing Line
  doc.setDrawColor(203, 213, 225);
  doc.line(25, 40, pageWidth - 25, 40);

  // Document Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(79, 70, 229); // Indigo
  doc.text('OFFICIAL EXAMINATION STATEMENT OF MARKS', pageWidth / 2, 48, { align: 'center' });

  // Student Details Box
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.roundedRect(25, 56, pageWidth - 50, 36, 3, 3, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(25, 56, pageWidth - 50, 36, 3, 3, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);

  doc.text('Student Roll / Enrolment:', 30, 66);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(enrolment, 80, 66);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Exam Description:', 30, 75);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(examName, 80, 75);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Subject Code:', 30, 84);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(subjectCode, 80, 84);

  // Marks Breakdown Table Header
  const startY = 104;
  doc.setFillColor(79, 70, 229);
  doc.rect(25, startY, pageWidth - 50, 10, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('SECTION / QUESTION', 32, startY + 6.5);
  doc.text('MAX MARKS', 105, startY + 6.5, { align: 'center' });
  doc.text('MARKS OBTAINED', 155, startY + 6.5, { align: 'center' });

  // Questions Rows
  const qList = [
    { label: 'Question 1', max: '10.0', val: sheet.q1 },
    { label: 'Question 2', max: '10.0', val: sheet.q2 },
    { label: 'Question 3', max: '10.0', val: sheet.q3 },
    { label: 'Question 4', max: '10.0', val: sheet.q4 },
    { label: 'Question 5', max: '10.0', val: sheet.q5 }
  ];

  let currentY = startY + 10;
  doc.setFontSize(9);

  qList.forEach((q, i) => {
    doc.setFillColor(i % 2 === 0 ? 255 : 248, i % 2 === 0 ? 255 : 250, i % 2 === 0 ? 255 : 252);
    doc.rect(25, currentY, pageWidth - 50, 9, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    doc.text(q.label, 32, currentY + 6);
    doc.text(q.max, 105, currentY + 6, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    const displayVal = q.val !== null && q.val !== undefined && q.val !== '' ? String(q.val) : '—';
    doc.text(displayVal, 155, currentY + 6, { align: 'center' });

    currentY += 9;
  });

  // Table Total Row
  doc.setFillColor(241, 245, 249);
  doc.rect(25, currentY, pageWidth - 50, 12, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('AGGREGATE TOTAL SCORE', 32, currentY + 7.5);
  doc.text('50.0', 105, currentY + 7.5, { align: 'center' });
  doc.setTextColor(79, 70, 229);
  doc.text(`${totalScore.toFixed(1)}`, 155, currentY + 7.5, { align: 'center' });

  currentY += 22;

  // Result Badge Box
  const badgeColor = isPass ? [16, 185, 129] : [239, 68, 68];
  doc.setDrawColor(...badgeColor);
  doc.setFillColor(isPass ? 236 : 254, isPass ? 253 : 242, isPass ? 245 : 242);
  doc.roundedRect(25, currentY, pageWidth - 50, 18, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...badgeColor);
  doc.text(
    isPass ? 'RESULT STATUS: PASSED' : 'RESULT STATUS: REQUIRES IMPROVEMENT',
    pageWidth / 2,
    currentY + 11.5,
    { align: 'center' }
  );

  // Security & Date Footer
  const dateStr = new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`Digitally Generated on ${dateStr} via ExamScanWeb OCR Evaluation Engine`, pageWidth / 2, 260, {
    align: 'center'
  });
  doc.text(`Sheet Record ID: ${sheet._id} • Verified Academic Document`, pageWidth / 2, 265, {
    align: 'center'
  });

  // Trigger browser download
  const cleanRoll = enrolment.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Marksheet_${cleanRoll}_${subjectCode}.pdf`);
};
