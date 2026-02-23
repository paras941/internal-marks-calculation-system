import { useState, useEffect, useRef } from 'react';
import { marksAPI, schemesAPI, usersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Plus, Edit, Upload, X, Save, FileText } from 'lucide-react';

const Marks = () => {
  const { user } = useAuth();
  const [marks, setMarks] = useState([]);
  const [schemes, setSchemes] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [editingMarks, setEditingMarks] = useState(null);
  const [filters, setFilters] = useState({ subjectId: '', section: '' });
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    studentId: '',
    subjectId: '',
    marks: []
  });

  useEffect(() => {
    fetchSchemes();
    fetchStudents();
  }, []);

  useEffect(() => {
    if (filters.subjectId) {
      fetchMarks();
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
    try {
      if (editingMarks) {
        await marksAPI.update(editingMarks._id, formData);
      } else {
        await marksAPI.create(formData);
      }
      setShowModal(false);
      setEditingMarks(null);
      fetchMarks();
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

    const formData = new FormData();
    formData.append('file', file);
    formData.append('subjectId', filters.subjectId);

    try {
      await marksAPI.bulkUpload(formData);
      setShowCsvModal(false);
      fetchMarks();
      alert('Marks uploaded successfully!');
    } catch (error) {
      console.error('Error uploading CSV:', error);
      alert(error.response?.data?.message || 'Error uploading CSV');
    }
  };

  const updateMarkValue = (index, field, value) => {
    const newMarks = [...formData.marks];
    newMarks[index] = { ...newMarks[index], [field]: value };
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
                    {selectedScheme?.components.map((comp, idx) => {
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
                      <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(mark)}>
                        <Edit size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
                Upload a CSV file with columns: enrollmentNumber, componentName, marksObtained
              </p>
              <input
                type="file"
                accept=".csv"
                ref={fileInputRef}
                onChange={handleCsvUpload}
                style={{ display: 'none' }}
              />
              <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()}>
                <FileText size={20} /> Choose File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Marks;
