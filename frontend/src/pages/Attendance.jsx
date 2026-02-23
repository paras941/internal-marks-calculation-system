import { useState, useEffect } from 'react';
import { attendanceAPI, schemesAPI, usersAPI } from '../services/api';
import { Plus, Save, X } from 'lucide-react';

const Attendance = () => {
  const [attendance, setAttendance] = useState([]);
  const [schemes, setSchemes] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filters, setFilters] = useState({ subjectId: '', month: '', year: '' });
  const [formData, setFormData] = useState({
    subjectId: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    records: []
  });

  useEffect(() => {
    fetchSchemes();
    fetchStudents();
  }, []);

  useEffect(() => {
    if (filters.subjectId && filters.month && filters.year) {
      fetchAttendance();
    }
  }, [filters]);

  const fetchSchemes = async () => {
    try {
      const response = await schemesAPI.getAll({});
      setSchemes(response.data.data);
    } catch (error) {
      console.error('Error fetching schemes:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await usersAPI.getStudents({});
      setStudents(response.data.data);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const response = await attendanceAPI.getAll(filters);
      setAttendance(response.data.data);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubjectChange = (subjectId) => {
    setFilters({ ...filters, subjectId });
    setFormData({
      ...formData,
      subjectId,
      records: students.map(student => ({
        studentId: student._id,
        studentName: `${student.firstName} ${student.lastName}`,
        enrollmentNumber: student.enrollmentNumber || '',
        totalClasses: 0,
        attendedClasses: 0
      }))
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const validRecords = formData.records.filter(r => r.totalClasses > 0);
      await attendanceAPI.bulkCreate({
        subjectId: formData.subjectId,
        month: parseInt(formData.month),
        year: parseInt(formData.year),
        records: validRecords
      });
      setShowModal(false);
      fetchAttendance();
    } catch (error) {
      console.error('Error saving attendance:', error);
      alert(error.response?.data?.message || 'Error saving attendance');
    }
  };

  const updateRecord = (index, field, value) => {
    const newRecords = [...formData.records];
    newRecords[index] = { ...newRecords[index], [field]: value };
    setFormData({ ...formData, records: newRecords });
  };

  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1];
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div>
      <div className="page-header">
        <h1>Attendance Management</h1>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <select
              className="form-select"
              value={filters.subjectId}
              onChange={(e) => handleSubjectChange(e.target.value)}
              style={{ width: 'auto', minWidth: '200px' }}
            >
              <option value="">Select Subject</option>
              {schemes.map(scheme => (
                <option key={scheme._id} value={scheme._id}>
                  {scheme.subjectCode} - {scheme.subjectName}
                </option>
              ))}
            </select>
            <select
              className="form-select"
              value={filters.month}
              onChange={(e) => setFilters({ ...filters, month: e.target.value })}
              style={{ width: 'auto' }}
            >
              <option value="">Select Month</option>
              {months.map((month, index) => (
                <option key={index + 1} value={index + 1}>{month}</option>
              ))}
            </select>
            <select
              className="form-select"
              value={filters.year}
              onChange={(e) => setFilters({ ...filters, year: e.target.value })}
              style={{ width: 'auto' }}
            >
              <option value="">Select Year</option>
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          {filters.subjectId && filters.month && filters.year && (
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <Plus size={20} /> Mark Attendance
            </button>
          )}
        </div>

        {loading ? (
          <div className="loading"><div className="spinner"></div></div>
        ) : filters.subjectId && filters.month && filters.year ? (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Enrollment No.</th>
                  <th>Total Classes</th>
                  <th>Attended</th>
                  <th>Percentage</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {attendance.length > 0 ? attendance.map(record => (
                  <tr key={record._id}>
                    <td>{record.studentId?.firstName} {record.studentId?.lastName}</td>
                    <td>{record.studentId?.enrollmentNumber || '-'}</td>
                    <td>{record.totalClasses}</td>
                    <td>{record.attendedClasses}</td>
                    <td>{record.percentage}%</td>
                    <td>
                      <span className={`badge badge-${record.percentage >= 75 ? 'success' : 'danger'}`}>
                        {record.percentage >= 75 ? 'Present' : 'Short'}
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center' }}>
                      No attendance records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">Please select subject, month, and year to view attendance</div>
        )}
      </div>

      {/* Attendance Entry Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: '800px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Mark Attendance - {months[formData.month - 1]} {formData.year}</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Enrollment</th>
                      <th>Total Classes</th>
                      <th>Attended</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.records.map((record, index) => (
                      <tr key={index}>
                        <td>{record.studentName}</td>
                        <td>{record.enrollmentNumber}</td>
                        <td>
                          <input
                            type="number"
                            className="form-input"
                            value={record.totalClasses}
                            onChange={(e) => updateRecord(index, 'totalClasses', parseInt(e.target.value) || 0)}
                            min={0}
                            style={{ width: '80px' }}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="form-input"
                            value={record.attendedClasses}
                            onChange={(e) => updateRecord(index, 'attendedClasses', parseInt(e.target.value) || 0)}
                            min={0}
                            max={record.totalClasses}
                            style={{ width: '80px' }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="submit" className="btn btn-primary">
                  <Save size={20} /> Save Attendance
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Attendance;
