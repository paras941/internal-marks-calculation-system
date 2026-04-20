import { useState, useEffect, useRef } from 'react';
import { marksAPI, schemesAPI, usersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Plus, Edit, Upload, X, Save, FileText, Download, Send, CheckCircle } from 'lucide-react';

const Marks = () => {
  const { user } = useAuth();
  const [marks, setMarks] = useState([]);
  const [schemes, setSchemes] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [editingMarks, setEditingMarks] = useState(null);
  const [filters, setFilters] = useState({ subjectId: '', section: '' });
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    studentId: '',
    subjectId: '',
    marks: [],
    graceMarksApplied: 0
  });

  useEffect(() => {
    fetchSchemes();
  }, []);

  useEffect(() => {
    if (filters.subjectId) {
      fetchMarks();
      fetchStudentsForSubject();
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

  const fetchStudentsForSubject = async () => {
    try {
      const response = await usersAPI.getStudents({});
      setStudents(response.data.data);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchMarks = async () => {
    setLoading(true);
    try {
      const response = await marksAPI.getAll(filters);
      setMarks(response.data.data);
    } catch (error) {
      console.error('Error fetching marks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubjectChange = (subjectId) => {
    const scheme = schemes.find(s => s._id === subjectId);
    setFilters({ ...filters, subjectId });

    if (scheme) {
      setFormData({
        studentId: '',
        subjectId,
        graceMarksApplied: 0,
        marks: scheme.components.map(comp => ({
          componentName: comp.name,
          componentId: comp._id,
          marksObtained: 0,
          maxMarks: comp.maxMarks,
          isAbsent: false,
          isGraceApplied: false
        }))
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.studentId) {
      alert('Please select a student');
      return;
    }

    // Check if at least one mark is entered
    const hasMarksEntered = formData.marks.some(m => m.marksObtained > 0 || m.isAbsent);
    if (!hasMarksEntered) {
      alert('Please enter marks for at least one component or mark as absent');
      return;
    }

    // Check grace marks range
    if (formData.graceMarksApplied < 0 || formData.graceMarksApplied > 10) {
      alert('Grace marks must be between 0 and 10');
      return;
    }

    try {
      if (editingMarks) {
        await marksAPI.update(editingMarks._id, formData);
      } else {
        await marksAPI.create(formData);
      }
      setShowModal(false);
      setEditingMarks(null);
      fetchMarks();
      alert('Marks saved successfully!');
    } catch (error) {
      console.error('Error saving marks:', error);
      alert(error.response?.data?.message || 'Error saving marks');
    }
  };

  const handleEdit = (mark) => {
    setEditingMarks(mark);
    setFormData({
      studentId: mark.studentId._id,
      subjectId: mark.subjectId._id,
      graceMarksApplied: mark.graceMarksApplied || 0,
      marks: mark.marks.map(m => ({
        componentName: m.componentName,
        componentId: m.componentId,
        marksObtained: m.marksObtained,
        maxMarks: m.maxMarks,
        isAbsent: m.isAbsent,
        isGraceApplied: m.isGraceApplied
      }))
    });
    setShowModal(true);
  };

  const handleCsvUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!filters.subjectId) {
      alert('Please select a subject first');
      fileInputRef.current.value = '';
      return;
    }

    const formDataUpload = new FormData();
    formDataUpload.append('file', file);
    formDataUpload.append('subjectId', filters.subjectId);

    try {
      await marksAPI.bulkUpload(formDataUpload);
      setShowCsvModal(false);
      fileInputRef.current.value = '';
      fetchMarks();
      alert('Marks uploaded successfully!');
    } catch (error) {
      console.error('Error uploading CSV:', error);
      fileInputRef.current.value = '';
      alert(error.response?.data?.message || 'Error uploading CSV');
    }
  };

  const handleSubmitForApproval = async (markId) => {
    try {
      await marksAPI.submit(markId);
      fetchMarks();
      alert('Marks submitted for approval!');
    } catch (error) {
      console.error('Error submitting marks:', error);
      alert(error.response?.data?.message || 'Error submitting marks');
    }
  };

  const handleApprove = async (markId) => {
    try {
      await marksAPI.approve(markId);
      fetchMarks();
      alert('Marks approved!');
    } catch (error) {
      console.error('Error approving marks:', error);
      alert(error.response?.data?.message || 'Error approving marks');
    }
  };

  const downloadTemplate = async () => {
    try {
      const response = await marksAPI.getTemplate(filters.subjectId);
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `marks_template_${filters.subjectId}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading template:', error);
      alert('Error downloading template');
    }
  };

  const updateMarkValue = (index, field, value) => {
    const newMarks = [...formData.marks];
    const mark = newMarks[index];

    if (field === 'marksObtained') {
      // Cap the value to max marks if not absent
      const numValue = parseFloat(value) || 0;
      if (!mark.isAbsent && numValue > mark.maxMarks) {
        alert(`Marks cannot exceed ${mark.maxMarks} for ${mark.componentName}`);
        return;
      }
      mark.marksObtained = numValue;
    } else {
      mark[field] = value;
      // If marking absent, clear marks obtained
      if (field === 'isAbsent' && value) {
        mark.marksObtained = 0;
      }
    }

    setFormData({ ...formData, marks: newMarks });
  };

  const selectedScheme = schemes.find(s => s._id === filters.subjectId);

  return (
    <div>
      <div className="page-header">
        <h1>Marks Management</h1>
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
            <input
              type="text"
              className="form-input"
              placeholder="Filter by section..."
              value={filters.section}
              onChange={(e) => setFilters({ ...filters, section: e.target.value })}
              style={{ width: 'auto' }}
            />
          </div>
          {filters.subjectId && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-secondary" onClick={() => setShowCsvModal(true)}>
                <Upload size={20} /> Upload CSV
              </button>
              <button className="btn btn-primary" onClick={() => { setEditingMarks(null); setShowModal(true); }}>
                <Plus size={20} /> Add Marks
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="loading"><div className="spinner"></div></div>
        ) : filters.subjectId ? (
          marks.length > 0 ? (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Enrollment No.</th>
                    {selectedScheme?.components.map(comp => (
                      <th key={comp._id}>{comp.name} ({comp.maxMarks})</th>
                    ))}
                    <th>Total</th>
                    <th>Weighted</th>
                    <th>Final</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {marks.map(mark => (
                    <tr key={mark._id}>
                      <td>{mark.studentId?.firstName} {mark.studentId?.lastName}</td>
                      <td>{mark.studentId?.enrollmentNumber || '-'}</td>
                      {selectedScheme?.components.map((comp) => {
                        const markData = mark.marks.find(m => m.componentName === comp.name);
                        return (
                          <td key={comp._id}>
                            {markData?.isAbsent ? 'AB' : markData?.marksObtained || 0}
                          </td>
                        );
                      })}
                      <td>{mark.totalMarks || 0}</td>
                      <td>{mark.weightedMarks?.toFixed(1) || 0}</td>
                      <td style={{ fontWeight: 600 }}>{mark.finalMarks?.toFixed(1) || 0}</td>
                      <td>
                        <span className={`badge badge-${mark.status === 'approved' ? 'success' : mark.status === 'submitted' ? 'warning' : 'info'}`}>
                          {mark.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(mark)} title="Edit">
                            <Edit size={16} />
                          </button>
                          {mark.status === 'calculated' && (
                            <button className="btn btn-sm btn-primary" onClick={() => handleSubmitForApproval(mark._id)} title="Submit for Approval">
                              <Send size={16} />
                            </button>
                          )}
                          {mark.status === 'submitted' && (user.role === 'admin' || user.role === 'hod') && (
                            <button className="btn btn-sm btn-success" onClick={() => handleApprove(mark._id)} title="Approve">
                              <CheckCircle size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              No marks allotted for the selected subject{filters.section ? ' and section' : ''}.
            </div>
          )
        ) : (
          <div className="empty-state">Please select a subject to view marks</div>
        )}
      </div>

      {/* Marks Entry Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: '700px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editingMarks ? 'Edit Marks' : 'Enter Marks'}</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Student</label>
                <select
                  className="form-select"
                  value={formData.studentId}
                  onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                  required
                >
                  <option value="">Select Student</option>
                  {students.map(student => (
                    <option key={student._id} value={student._id}>
                      {student.firstName} {student.lastName} ({student.enrollmentNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginTop: '1rem' }}>
                <label className="form-label">Marks</label>
                {formData.marks.map((mark, index) => (
                  <div key={index} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                    <span style={{ flex: 2, fontWeight: 500 }}>{mark.componentName}</span>
                    <input
                      type="number"
                      className="form-input"
                      value={mark.marksObtained}
                      onChange={(e) => updateMarkValue(index, 'marksObtained', parseFloat(e.target.value) || 0)}
                      style={{ flex: 1 }}
                      min={0}
                      max={mark.maxMarks}
                    />
                    <span style={{ flex: 1, color: 'var(--text-secondary)' }}>/ {mark.maxMarks}</span>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flex: 1 }}>
                      <input
                        type="checkbox"
                        checked={mark.isAbsent}
                        onChange={(e) => updateMarkValue(index, 'isAbsent', e.target.checked)}
                      />
                      Absent
                    </label>
                  </div>
                ))}
              </div>

              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label className="form-label">Grace Marks (0-10)</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.graceMarksApplied}
                  onChange={(e) => setFormData({ ...formData, graceMarksApplied: parseFloat(e.target.value) || 0 })}
                  min={0}
                  max={10}
                  step={0.5}
                  style={{ maxWidth: '150px' }}
                />
                <small style={{ color: 'var(--text-secondary)', display: 'block', marginTop: '0.25rem' }}>
                  Additional marks to be added to final score
                </small>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="submit" className="btn btn-primary">
                  <Save size={20} /> Save
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Upload Modal */}
      {showCsvModal && (
        <div className="modal-overlay" onClick={() => setShowCsvModal(false)}>
          <div className="modal" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Upload Marks via CSV</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowCsvModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div>
              <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                Upload a CSV file with student enrollment numbers and marks for each component.
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <button className="btn btn-secondary" onClick={downloadTemplate}>
                  <Download size={20} /> Download Template
                </button>
              </div>
              <input
                type="file"
                accept=".csv"
                ref={fileInputRef}
                onChange={handleCsvUpload}
                style={{ display: 'none' }}
              />
              <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()}>
                <FileText size={20} /> Choose File & Upload
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Marks;
