import { jsPDF } from 'jspdf';
import { formatDateTime, formatTime } from './utils.js';
import { ELIGIBILITY } from './constants.js';

export function generatePdfReport(user, result) {
  const doc = new jsPDF();
  
  // DIU Header
  doc.setFillColor(30, 64, 175); // blue-800
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('DIU Admission', 20, 20);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Daffodil International University - Spring 2026', 20, 30);
  
  // Candidate Info
  doc.setTextColor(30, 41, 59); // slate-800
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Candidate Performance Report', 20, 55);
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Name: ${user.name}`, 20, 70);
  doc.text(`Candidate ID: ${user.id}`, 20, 78);
  doc.text(`Email: ${user.email}`, 20, 86);
  doc.text(`Test Date: ${formatDateTime(result.submittedAt)}`, 20, 94);
  doc.text(`Time Taken: ${formatTime(result.timeTaken)}`, 20, 102);

  // Overall Score Box
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setFillColor(248, 250, 252); // slate-50
  doc.roundedRect(120, 65, 70, 40, 3, 3, 'FD');
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Overall Score', 130, 78);
  
  doc.setFontSize(24);
  doc.setTextColor(30, 64, 175); // blue-800
  doc.text(`${result.percentage}%`, 130, 92);
  
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(`(${result.totalScore} / ${result.totalQuestions} correct)`, 130, 100);

  // Eligibility Status
  const statusDef = ELIGIBILITY[result.eligibility];
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Eligibility Status', 20, 125);
  
  // Draw Status Badge background
  if (result.eligibility === 'ELIGIBLE') {
    doc.setFillColor(220, 252, 231); // green-100
    doc.setTextColor(22, 101, 52); // green-800
  } else if (result.eligibility === 'NOT_ELIGIBLE') {
    doc.setFillColor(254, 226, 226); // red-100
    doc.setTextColor(153, 27, 27); // red-800
  } else {
    doc.setFillColor(254, 243, 199); // amber-100
    doc.setTextColor(146, 64, 14); // amber-800
  }
  
  doc.roundedRect(20, 130, 170, 25, 2, 2, 'F');
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(statusDef.label, 30, 140);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(statusDef.description, 30, 148);

  // Section Breakdown
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Section-wise Breakdown', 20, 175);

  let y = 185;
  doc.setFontSize(11);
  Object.entries(result.sectionPercentages).forEach(([secId, pct]) => {
    const isFailed = result.failedSections?.includes(secId);
    
    doc.setFont('helvetica', 'bold');
    doc.text(secId, 20, y);
    
    // Progress bar BG
    doc.setFillColor(226, 232, 240);
    doc.rect(70, y - 4, 100, 6, 'F');
    
    // Progress bar Fill
    if (isFailed) {
      doc.setFillColor(220, 38, 38); // red-600
    } else if (pct >= 80) {
      doc.setFillColor(22, 163, 74); // green-600
    } else {
      doc.setFillColor(37, 99, 235); // blue-600
    }
    doc.rect(70, y - 4, pct, 6, 'F');
    
    // Text value
    doc.setFont('helvetica', isFailed ? 'bold' : 'normal');
    if (isFailed) doc.setTextColor(220, 38, 38);
    else doc.setTextColor(100, 116, 139);
    
    doc.text(`${pct}%`, 175, y);
    
    doc.setTextColor(30, 41, 59); // reset
    y += 12;
  });

  // Footer
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('Generated automatically by DIU Admission Portal', 105, 280, { align: 'center' });

  doc.save(`DIU_Admission_Report_${user.id.slice(0, 8)}.pdf`);
}
