const PDFDocument = require('pdfkit');
const fs = require('fs');
const User = require('../models/User');
const StudentMarks = require('../models/StudentMarks');
const EvaluationScheme = require('../models/EvaluationScheme');
const Attendance = require('../models/Attendance');

/**
 * Generate PDF report card for a student
 */
const generateReportCard = async (studentId, semester, res) => {
  try {
    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      throw new Error('Student not found');
    }

    const marks = await StudentMarks.find({ 
      studentId, 
      semester 
    }).populate('subjectId');

    if (marks.length === 0) {
      throw new Error('No marks found for this semester');
    }

    // Create PDF document
    const doc = new PDFDocument({ margin: 50 });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=report_card_${student.enrollmentNumber}_sem${semester}.pdf`);
    
    doc.pipe(res);

    // Header
    doc.fontSize(20).font('Helvetica-Bold').text('INTERNAL MARKS REPORT CARD', { align: 'center' });
    doc.moveDown(0.5);
    
    // Student Details
    doc.fontSize(12).font('Helvetica');
    doc.text(`Name: ${student.firstName} ${student.lastName}`, { align: 'left' });
    doc.text(`Enrollment Number: ${student.enrollmentNumber || 'N/A'}`);
    doc.text(`Department: ${student.department}`);
    doc.text(`Semester: ${semester}`);
    doc.text(`Section: ${student.section || 'N/A'}`);
    doc.moveDown(2);

    // Marks Table
    const tableTop = doc.y;
    const columns = {
      subject: 50,
      component: 150,
      maxMarks: 300,
      obtained: 370,
      grade: 430
    };

    // Table Header
    doc.font('Helvetica-Bold').fontSize(11);
    doc.text('Subject', columns.subject, tableTop);
    doc.text('Component', columns.component, tableTop);
    doc.text('Max', columns.maxMarks, tableTop);
    doc.text('Obtained', columns.obtained, tableTop);
    doc.text('Grade', columns.grade, tableTop);

    // Draw line under header
    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
    
    let currentY = tableTop + 25;
    doc.font('Helvetica').fontSize(10);

    let totalObtained = 0;
    let totalMax = 0;

    for (const mark of marks) {
      if (mark.subjectId) {
        const subjectName = `${mark.subjectId.subjectCode} - ${mark.subjectId.subjectName}`;
        
        // Calculate grade
        let grade = 'F';
        if (mark.finalMarks >= 90) grade = 'O';
        else if (mark.finalMarks >= 80) grade = 'A+';
        else if (mark.finalMarks >= 70) grade = 'A';
        else if (mark.finalMarks >= 60) grade = 'B+';
        else if (mark.finalMarks >= 50) grade = 'B';
        else if (mark.finalMarks >= 40) grade = 'C';
        else if (mark.finalMarks >= 35) grade = 'P';

        doc.text(subjectName, columns.subject, currentY);
        doc.text('Total', columns.component, currentY);
        doc.text('100', columns.maxMarks, currentY);
        doc.text(mark.finalMarks.toString(), columns.obtained, currentY);
        doc.text(grade, columns.grade, currentY);

        totalObtained += mark.finalMarks;
        totalMax += 100;

        currentY += 20;
      }
    }

    // Draw line before total
    doc.moveTo(50, currentY).lineTo(550, currentY).stroke();
    currentY += 10;

    // Total
    doc.font('Helvetica-Bold');
    doc.text('Total', columns.subject, currentY);
    doc.text('100', columns.maxMarks, currentY);
    doc.text(totalObtained.toString(), columns.obtained, currentY);
    
    const percentage = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(2) : 0;
    doc.text(`${percentage}%`, columns.grade, currentY);

    // Footer
    doc.fontSize(10).font('Helvetica');
    const pageHeight = doc.page.height;
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 50, pageHeight - 50);
    doc.text('Internal Marks Calculation System', 50, pageHeight - 35);

    doc.end();

  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

/**
 * Generate PDF for audit logs
 */
const generateAuditLogsPDF = async (logs, res) => {
  try {
    const doc = new PDFDocument({ margin: 50 });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=audit_logs_${Date.now()}.pdf`);
    
    doc.pipe(res);

    // Header
    doc.fontSize(18).font('Helvetica-Bold').text('AUDIT LOG REPORT', { align: 'center' });
    doc.moveDown();
    
    doc.fontSize(10).font('Helvetica');
    doc.text(`Generated on: ${new Date().toLocaleString()}`);
    doc.moveDown(2);

    let currentY = doc.y;

    for (const log of logs) {
      if (currentY > doc.page.height - 100) {
        doc.addPage();
        currentY = 50;
      }

      doc.fontSize(9).font('Helvetica-Bold');
      doc.text(`Timestamp: ${new Date(log.timestamp).toLocaleString()}`, 50, currentY);
      
      doc.font('Helvetica');
      doc.text(`Action: ${log.action}`, 50, currentY + 12);
      doc.text(`Entity: ${log.entityType}`, 50, currentY + 24);
      doc.text(`User: ${log.description || 'System'}`, 50, currentY + 36);
      
      if (log.oldValue || log.newValue) {
        doc.text(`Old Value: ${JSON.stringify(log.oldValue)}`, 50, currentY + 48);
        doc.text(`New Value: ${JSON.stringify(log.newValue)}`, 50, currentY + 60);
      }

      currentY += 80;
      doc.moveTo(50, currentY).lineTo(550, currentY).stroke();
      currentY += 10;
    }

    doc.end();

  } catch (error) {
    console.error('Error generating audit PDF:', error);
    throw error;
  }
};

module.exports = {
  generateReportCard,
  generateAuditLogsPDF
};
