import { useState, useEffect } from 'react';
import { marksAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Download, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const StudentMarks = () => {
  const { user } = useAuth();
  const [marks, setMarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState(null);

  useEffect(() => {
    fetchMyMarks();
  }, []);

  const fetchMyMarks = async () => {
    try {
      const response = await marksAPI.getAll({ studentId: user?._id });
      setMarks(response.data.data);
    } catch (error) {
      console.error('Error fetching marks:', error);
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(18);
    doc.text('Internal Marks Report', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Student: ${user?.firstName} ${user?.lastName}`, 20, 35);
    doc.text(`Enrollment: ${user?.enrollmentNumber || 'N/A'}`, 20, 42);
    doc.text(`Department: ${user?.department || 'N/A'}`, 20, 49);
    doc.text(`Semester: ${user?.semester || 'N/A'}`, 20, 56);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 63);

    let yPos = 75;

    marks.forEach((mark, index) => {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.setTextColor(37, 99, 235);
      doc.text(`${mark.subjectId?.subjectCode} - ${mark.subjectId?.subjectName}`, 20, yPos);
      yPos += 8;

      const tableData = mark.marks.map(m => [
        m.componentName,
        m.isAbsent ? 'Absent' : m.marksObtained,
        m.maxMarks,
        m.isAbsent ? '0%' : `${((m.marksObtained / m.maxMarks) * 100).toFixed(1)}%`
      ]);

      doc.autoTable({
        startY: yPos,
        head: [['Component', 'Obtained', 'Max Marks', 'Percentage']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235] },
        margin: { left: 20 }
      });

      yPos = doc.lastAutoTable.finalY + 10;

      // Summary
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text(`Total Marks: ${mark.totalMarks}`, 20, yPos);
      doc.text(`Weighted Marks: ${mark.weightedMarks?.toFixed(2)}`, 80, yPos);
      doc.text(`Grace Applied: ${mark.graceMarksApplied}`, 130, yPos);
      doc.text(`Final Marks: ${mark.finalMarks?.toFixed(2)}`, 170, yPos);
      
      yPos += 15;
    });

    // Overall summary
    const totalFinal = marks.reduce((sum, m) => sum + (m.finalMarks || 0), 0);
    const average = marks.length > 0 ? (totalFinal / marks.length).toFixed(2) : 0;

    doc.setFontSize(12);
    doc.text(`Overall Average: ${average}%`, 20, yPos);

    doc.save(`marks-report-${user?.enrollmentNumber || 'report'}.pdf`);
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>My Marks</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            {user?.firstName} {user?.lastName} - {user?.enrollmentNumber}
          </p>
        </div>
        {marks.length > 0 && (
          <button className="btn btn-primary" onClick={generatePDF}>
            <Download size={20} /> Download PDF Report
          </button>
        )}
      </div>

      {marks.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <FileText size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <p>No marks available yet</p>
          </div>
        </div>
      ) : (
        <div>
          {marks.map((mark, index) => (
            <div key={index} className="card">
              <div className="card-header">
                <div>
                  <h3 className="card-title">
                    {mark.subjectId?.subjectCode} - {mark.subjectId?.subjectName}
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    Department: {mark.department} | Semester: {mark.semester}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary-color)' }}>
                    {mark.finalMarks?.toFixed(1)}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Final Marks</div>
                </div>
              </div>

              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Component</th>
                      <th>Marks Obtained</th>
                      <th>Max Marks</th>
                      <th>Percentage</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mark.marks.map((m, idx) => (
                      <tr key={idx}>
                        <td>{m.componentName}</td>
                        <td>
                          {m.isAbsent ? (
                            <span style={{ color: 'var(--danger-color)' }}>Absent</span>
                          ) : (
                            m.marksObtained
                          )}
                        </td>
                        <td>{m.maxMarks}</td>
                        <td>
                          {m.isAbsent ? '0%' : `${((m.marksObtained / m.maxMarks) * 100).toFixed(1)}%`}
                        </td>
                        <td>
                          {m.isGraceApplied && (
                            <span className="badge badge-warning">Grace Applied</span>
                          )}
                          {m.isAbsent && (
                            <span className="badge badge-danger">Absent</span>
                          )}
                          {!m.isAbsent && !m.isGraceApplied && (
                            <span className="badge badge-success">Recorded</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>Total: </span>
                  <strong>{mark.totalMarks}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>Weighted: </span>
                  <strong>{mark.weightedMarks?.toFixed(2)}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>Grace: </span>
                  <strong>+{mark.graceMarksApplied}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>Attendance Bonus: </span>
                  <strong>+{mark.attendanceBonus || 0}</strong>
                </div>
              </div>
            </div>
          ))}

          {/* Overall Summary */}
          <div className="card" style={{ background: 'var(--primary-color)', color: 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3>Overall Performance</h3>
                <p style={{ opacity: 0.9 }}>Based on {marks.length} subjects</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 700 }}>
                  {(marks.reduce((sum, m) => sum + (m.finalMarks || 0), 0) / marks.length).toFixed(1)}%
                </div>
                <div style={{ opacity: 0.9 }}>Average</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentMarks;
