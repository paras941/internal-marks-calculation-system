import { useState, useEffect, useRef } from 'react';
import { marksAPI, schemesAPI, usersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Plus, Edit, Upload, X, Save, FileText, Download, Send, CheckCircle, Trash2 } from 'lucide-react';

const createSchemeMarkRow = (component) => ({
  componentId: component._id,
  componentName: component.name,
  maxMarks: component.maxMarks,
  weightage: component.weightage,
  marksObtained: 0,
  isAbsent: false,
  isGraceApplied: false,
  isCustom: false
});

const createCustomMarkRow = () => ({
  componentId: '',
  componentName: '',
  maxMarks: '',
  weightage: '',
  marksObtained: '',
  isAbsent: false,
  isGraceApplied: false,
  isCustom: true
});

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

    setFormData({
      studentId: '',
      subjectId,
      graceMarksApplied: 0,
      marks: scheme ? scheme.components.map(createSchemeMarkRow) : []
    });
  };

  const addMarkRow = () => {
    setFormData((current) => ({
      ...current,
      marks: [...current.marks, createCustomMarkRow()]
    }));
  };

  const removeMarkRow = (index) => {
    setFormData((current) => ({
      ...current,
      marks: current.marks.filter((_, rowIndex) => rowIndex !== index)
    }));
  };

  const handleComponentSelect = (index, value) => {
    const scheme = schemes.find(s => s._id === formData.subjectId);
    const selectedComponent = scheme?.components.find(component => component._id === value);

    setFormData((current) => {
      const nextMarks = [...current.marks];
      if (!nextMarks[index]) {
        return current;
      }

      if (value === 'custom') {
        nextMarks[index] = {
          ...nextMarks[index],
          componentId: '',
          componentName: '',
          maxMarks: '',
          weightage: '',
          isCustom: true
        };
        return { ...current, marks: nextMarks };
      }

      if (selectedComponent) {
        nextMarks[index] = {
          ...nextMarks[index],
          componentId: selectedComponent._id,
          componentName: selectedComponent.name,
          maxMarks: selectedComponent.maxMarks,
          weightage: selectedComponent.weightage,
          isCustom: false
        };
      }

      return { ...current, marks: nextMarks };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.studentId) {
      alert('Please select a student');
      return;
    }

    if (!formData.marks.length) {
      alert('Please add at least one marks parameter');
      return;
    }

    // Check grace marks range
    if (formData.graceMarksApplied < 0 || formData.graceMarksApplied > 10) {
      alert('Grace marks must be between 0 and 10');
      return;
    }

    const payloadMarks = [];

    for (const mark of formData.marks) {
      const isCustom = mark.isCustom || !mark.componentId;
      const componentName = String(mark.componentName || '').trim();
      const maxMarks = Number(mark.maxMarks);
      const weightage = Number(mark.weightage);
      const marksObtained = mark.isAbsent ? 0 : Number(mark.marksObtained);

      if (!componentName) {
        alert('Each parameter needs a component name');
        return;
      }

      if (!Number.isFinite(maxMarks) || maxMarks < 0) {
        alert(`Enter a valid max marks value for ${componentName}`);
        return;
      }

      if (!Number.isFinite(weightage) || weightage < 0 || weightage > 100) {
        alert(`Enter a valid weightage between 0 and 100 for ${componentName}`);
        return;
      }

      if (!mark.isAbsent && (mark.marksObtained === '' || mark.marksObtained === null || mark.marksObtained === undefined)) {
        alert(`Enter marks obtained for ${componentName} or mark it absent`);
        return;
      }

      if (!Number.isFinite(marksObtained) || marksObtained < 0) {
        alert(`Enter valid marks obtained for ${componentName}`);
        return;
      }

      if (!mark.isAbsent && marksObtained > maxMarks) {
        alert(`Marks cannot exceed ${maxMarks} for ${componentName}`);
        return;
      }

      payloadMarks.push({
        componentName,
        componentId: isCustom ? undefined : mark.componentId,
        marksObtained,
        maxMarks,
        weightage,
        isAbsent: Boolean(mark.isAbsent),
        isGraceApplied: Boolean(mark.isGraceApplied)
      });
    }

    try {
      const payload = {
        ...formData,
        marks: payloadMarks,
        graceMarksApplied: Number(formData.graceMarksApplied)
      };

      if (editingMarks) {
        await marksAPI.update(editingMarks._id, payload);
      } else {
        await marksAPI.create(payload);
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
        componentId: m.componentId || '',
        marksObtained: m.marksObtained,
        maxMarks: m.maxMarks,
        weightage: m.weightage ?? m.percentage ?? '',
        isAbsent: m.isAbsent,
        isGraceApplied: m.isGraceApplied,
        isCustom: !m.componentId
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

    if (!mark) {
      return;
    }

    if (field === 'componentId') {
      handleComponentSelect(index, value);
      return;
    }

    if (field === 'marksObtained') {
      // Cap the value to max marks if not absent
      const numValue = value === '' ? '' : Number(value);
      if (numValue !== '' && !mark.isAbsent && Number.isFinite(numValue) && Number.isFinite(Number(mark.maxMarks)) && numValue > Number(mark.maxMarks)) {
        alert(`Marks cannot exceed ${mark.maxMarks} for ${mark.componentName}`);
        return;
      }
      mark.marksObtained = numValue;
    } else if (field === 'maxMarks' || field === 'weightage') {
      mark[field] = value === '' ? '' : Number(value);
    } else if (field === 'componentName') {
      mark.componentName = value;
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
        <div className="responsive-toolbar" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div className="responsive-toolbar-group" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <select
              className="form-select responsive-control"
              value={filters.subjectId}
              onChange={(e) => handleSubjectChange(e.target.value)}
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
              className="form-input responsive-control"
              placeholder="Filter by section..."
              value={filters.section}
              onChange={(e) => setFilters({ ...filters, section: e.target.value })}
            />
          </div>
          {filters.subjectId && (
            <div className="responsive-toolbar-actions" style={{ display: 'flex', gap: '0.5rem' }}>
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
                    <th>Components</th>
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
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          {mark.marks?.map((component, index) => (
                            <div key={`${component.componentName}-${index}`} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <strong>{component.componentName}</strong>
                              <span>{component.isAbsent ? 'AB' : `${component.marksObtained}/${component.maxMarks}`}</span>
                              <span style={{ color: 'var(--text-secondary)' }}>{component.weightage ?? component.percentage ?? 0}%</span>
                            </div>
                          )) || '-'}
                        </div>
                      </td>
                      <td>{mark.totalMarks || 0}</td>
                      <td>{mark.weightedMarks?.toFixed(1) || 0}</td>
                      <td style={{ fontWeight: 600 }}>{mark.finalMarks?.toFixed(1) || 0}</td>
                      <td>
                        <span className={`badge badge-${mark.status === 'approved' ? 'success' : mark.status === 'submitted' ? 'warning' : 'info'}`}>
                          {mark.status}
                        </span>
                      </td>
                      <td>
                        <div className="responsive-inline-actions" style={{ display: 'flex', gap: '0.25rem' }}>
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
          <div className="modal modal-wide" style={{ maxWidth: '700px' }} onClick={(e) => e.stopPropagation()}>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Marks Parameters</label>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={addMarkRow}>
                    <Plus size={16} /> Add Parameter
                  </button>
                </div>

                {formData.marks.map((mark, index) => (
                  <div key={`${mark.componentId || 'custom'}-${index}`} style={{ border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <strong>Parameter {index + 1}</strong>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => removeMarkRow(index)}>
                        <Trash2 size={16} /> Remove
                      </button>
                    </div>

                    <div className="responsive-form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                      <div className="form-group">
                        <label className="form-label">Component</label>
                        <select
                          className="form-select"
                          value={mark.isCustom ? 'custom' : mark.componentId}
                          onChange={(e) => updateMarkValue(index, 'componentId', e.target.value)}
                        >
                          <option value="">Select component</option>
                          {selectedScheme?.components.map(component => (
                            <option key={component._id} value={component._id}>
                              {component.name} ({component.maxMarks})
                            </option>
                          ))}
                          <option value="custom">Custom component</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Component Name</label>
                        {mark.isCustom ? (
                          <input
                            type="text"
                            className="form-input"
                            value={mark.componentName}
                            onChange={(e) => updateMarkValue(index, 'componentName', e.target.value)}
                            placeholder="e.g. Lab Marks"
                          />
                        ) : (
                          <input className="form-input" value={mark.componentName} disabled />
                        )}
                      </div>

                      <div className="form-group">
                        <label className="form-label">Max Marks</label>
                        {mark.isCustom ? (
                          <input
                            type="number"
                            className="form-input"
                            value={mark.maxMarks}
                            onChange={(e) => updateMarkValue(index, 'maxMarks', e.target.value)}
                            min={0}
                          />
                        ) : (
                          <input className="form-input" value={mark.maxMarks} disabled />
                        )}
                      </div>

                      <div className="form-group">
                        <label className="form-label">Weightage (%)</label>
                        {mark.isCustom ? (
                          <input
                            type="number"
                            className="form-input"
                            value={mark.weightage}
                            onChange={(e) => updateMarkValue(index, 'weightage', e.target.value)}
                            min={0}
                            max={100}
                          />
                        ) : (
                          <input className="form-input" value={mark.weightage} disabled />
                        )}
                      </div>

                      <div className="form-group">
                        <label className="form-label">Marks Obtained</label>
                        <input
                          type="number"
                          className="form-input"
                          value={mark.marksObtained}
                          onChange={(e) => updateMarkValue(index, 'marksObtained', e.target.value)}
                          min={0}
                          max={mark.maxMarks}
                        />
                      </div>

                      <div className="form-group" style={{ display: 'flex', alignItems: 'end' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <input
                            type="checkbox"
                            checked={mark.isAbsent}
                            onChange={(e) => updateMarkValue(index, 'isAbsent', e.target.checked)}
                          />
                          Absent
                        </label>
                      </div>
                    </div>
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

              <div className="responsive-inline-actions" style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
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
          <div className="modal modal-medium" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
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
              <div className="responsive-inline-actions" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
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
