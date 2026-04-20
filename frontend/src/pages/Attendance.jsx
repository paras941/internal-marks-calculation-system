import { useState, useEffect } from 'react';
import { attendanceAPI, schemesAPI, usersAPI } from '../services/api';
import { Plus, Save, X } from 'lucide-react';

const Attendance = () => {
  const [attendance, setAttendance] = useState([]);
  const [schemes, setSchemes] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
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
      fetchAttendance(filters);
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

  const fetchStudents = async (params = {}) => {
    try {
      const response = await usersAPI.getStudents(params);
      setStudents(response.data.data);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchAttendance = async (queryFilters = filters) => {
    setLoading(true);
    try {
      const response = await attendanceAPI.getAll({
        subjectId: queryFilters.subjectId,
        month: parseInt(queryFilters.month),
        year: parseInt(queryFilters.year)
      });
      setAttendance(response.data.data);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubjectChange = (subjectId) => {
    setFilters({ ...filters, subjectId });
    setAttendance([]);

    fetchStudents({});

    setFormData({
      ...formData,
      subjectId,
      month: filters.month ? parseInt(filters.month) : formData.month,
      year: filters.year ? parseInt(filters.year) : formData.year,
      records: []
    });
  };

  const openAttendanceModal = () => {
    if (!filters.subjectId) {
      alert('Please select a subject first.');
      return;
    }

    const month = filters.month ? parseInt(filters.month) : new Date().getMonth() + 1;
    const year = filters.year ? parseInt(filters.year) : new Date().getFullYear();

    if (!filters.month || !filters.year) {
      setFilters((prev) => ({
        ...prev,
        month: String(month),
        year: String(year)
      }));
    }

    const records = students.map(student => {
      const existing = attendance.find(
        record => record.studentId?._id === student._id
      );

      return {
        studentId: student._id,
        studentName: `${student.firstName} ${student.lastName}`,
        enrollmentNumber: student.enrollmentNumber || '',
        totalClasses: existing?.totalClasses || 0,
        attendedClasses: existing?.attendedClasses || 0
      };
    });

    setFormData({
      subjectId: filters.subjectId,
      month,
      year,
      records
    });

    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const selectedMonth = parseInt(formData.month);
      const selectedYear = parseInt(formData.year);

      const validRecords = formData.records.filter(r => r.totalClasses > 0);
      if (validRecords.length === 0) {
        alert('Enter total classes for at least one student before saving.');
        return;
      }

      const invalidRecord = validRecords.find(r => r.attendedClasses > r.totalClasses);
      if (invalidRecord) {
        alert(`Invalid attendance for ${invalidRecord.studentName}: attended classes cannot be greater than total classes.`);
        return;
      }

      const payload = {
        subjectId: filters.subjectId,
        month: selectedMonth,
        year: selectedYear,
        records: validRecords
      };

      setIsSaving(true);
      const response = await attendanceAPI.bulkCreate(payload);
      const { success = [], errors = [] } = response.data?.data || {};

      if (errors.length > 0) {
        alert(`Attendance saved for ${success.length} student(s), but ${errors.length} failed. Please retry failed records.`);
      }

      // Keep filters in sync with the saved month/year so the table refreshes immediately.
      setFilters((prev) => ({
        ...prev,
        month: String(selectedMonth),
        year: String(selectedYear)
      }));

      await fetchAttendance({
        subjectId: filters.subjectId,
        month: selectedMonth,
        year: selectedYear
      });
      setShowModal(false);
    } catch (error) {
      console.error('Error saving attendance:', error);
      alert(error.response?.data?.message || 'Error saving attendance');
    } finally {
      setIsSaving(false);
    }
  };

  const markAllPresent = () => {
    const newRecords = formData.records.map((record) => ({
      ...record,
      attendedClasses: record.totalClasses
    }));

    setFormData({ ...formData, records: newRecords });
  };

  const updateRecord = (index, field, value) => {
    const newRecords = [...formData.records];
    const updatedRecord = { ...newRecords[index], [field]: value };

    if (field === 'totalClasses' && updatedRecord.attendedClasses > updatedRecord.totalClasses) {
      updatedRecord.attendedClasses = updatedRecord.totalClasses;
    }

    newRecords[index] = updatedRecord;
    setFormData({ ...formData, records: newRecords });
  };

  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1];
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const attendanceByStudentId = attendance.reduce((acc, record) => {
    const id = record?.studentId?._id || record?.studentId;
    if (id) {
      acc[String(id)] = record;
    }
    return acc;
  }, {});

  const rowsToDisplay = students.map((student) => {
    const record = attendanceByStudentId[String(student._id)];
    return {
      student,
      record
    };
  });

  const hasAttendanceData = rowsToDisplay.some(({ record }) => Boolean(record));

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
          {filters.subjectId && (
            <button className="btn btn-primary" onClick={openAttendanceModal}>
              <Plus size={20} /> Mark Attendance
            </button>
          )}
        </div>

        {loading ? (
          <div className="loading"><div className="spinner"></div></div>
        ) : filters.subjectId && filters.month && filters.year ? (
          rowsToDisplay.length === 0 ? (
            <div className="empty-state">No students found for the selected subject.</div>
          ) : !hasAttendanceData ? (
            <div className="empty-state">
              No attendance allotted for the selected subject, month, and year.
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                <span className="badge badge-success">Present (&gt;= 75%)</span>
                <span className="badge badge-danger">Short (&lt; 75%)</span>
                <span className="badge badge-warning">Attendance Not Found (Not Submitted)</span>
              </div>
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
                  {rowsToDisplay.map(({ student, record }) => (
                    <tr key={student._id}>
                      <td>{student.firstName} {student.lastName}</td>
                      <td>{student.enrollmentNumber || '-'}</td>
                      <td>{record ? record.totalClasses : '-'}</td>
                      <td>{record ? record.attendedClasses : '-'}</td>
                      <td>{record ? `${record.percentage}%` : 'Attendance Not Found'}</td>
                      <td>
                        {record ? (
                          <span className={`badge badge-${record.percentage >= 75 ? 'success' : 'danger'}`}>
                            {record.percentage >= 75 ? 'Present' : 'Short'}
                          </span>
                        ) : (
                          <span className="badge badge-warning">Attendance Not Found</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </>
          )
        ) : (
          <div className="empty-state">Please select subject, month, and year to view attendance</div>
        )}
      </div>

      {/* Attendance Entry Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => !isSaving && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: '800px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Mark Attendance - {months[formData.month - 1]} {formData.year}</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)} disabled={isSaving}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={markAllPresent} disabled={isSaving}>
                  Mark All Present
                </button>
              </div>
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
                            disabled={isSaving}
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
                            disabled={isSaving}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="submit" className="btn btn-primary" disabled={isSaving}>
                  <Save size={20} /> {isSaving ? 'Saving...' : 'Save Attendance'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={isSaving}>
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
