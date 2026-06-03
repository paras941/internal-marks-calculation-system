import { useState, useEffect, useRef } from 'react';
import { schemesAPI } from '../services/api';
import { Plus, Edit, Trash2, X, Upload } from 'lucide-react';

const Schemes = () => {
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingScheme, setEditingScheme] = useState(null);
  const [filters, setFilters] = useState({ department: '', semester: '' });
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    department: '',
    semester: '',
    subjectCode: '',
    subjectName: '',
    components: [
      { name: 'Attendance', maxMarks: 5, percentage: 5, isOptional: false },
      { name: 'Quiz', maxMarks: 10, percentage: 10, isOptional: false },
      { name: 'Midterm', maxMarks: 30, percentage: 30, isOptional: false },
      { name: 'Assignment', maxMarks: 10, percentage: 10, isOptional: false },
      { name: 'Lab', maxMarks: 45, percentage: 45, isOptional: false }
    ],
    graceMarks: { maxGraceMarks: 5, allowCarryOver: false },
    attendanceThreshold: { minAttendancePercentage: 75, marksApplicable: 5 },
    bestOfTwoLogic: { enabled: false, exams: [] }
  });

  useEffect(() => {
    fetchSchemes();
  }, [filters]);

  const fetchSchemes = async () => {
    try {
      setLoading(true);
      const response = await schemesAPI.getAll(filters);
      setSchemes(response.data.data);
    } catch (error) {
      console.error('Error fetching schemes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingScheme) {
        await schemesAPI.update(editingScheme._id, formData);
      } else {
        await schemesAPI.create(formData);
      }
      setShowModal(false);
      setEditingScheme(null);
      fetchSchemes();
    } catch (error) {
      console.error('Error saving scheme:', error);
      alert(error.response?.data?.message || 'Error saving scheme');
    }
  };

  const handleEdit = (scheme) => {
    setEditingScheme(scheme);
    setFormData({
      department: scheme.department,
      semester: scheme.semester,
      subjectCode: scheme.subjectCode,
      subjectName: scheme.subjectName,
      components: (scheme.components || []).map((component) => ({
        ...component,
        percentage: component.percentage ?? component.weightage ?? 0
      })),
      graceMarks: scheme.graceMarks || { maxGraceMarks: 5, allowCarryOver: false },
      attendanceThreshold: scheme.attendanceThreshold || { minAttendancePercentage: 75, marksApplicable: 5 },
      bestOfTwoLogic: scheme.bestOfTwoLogic || { enabled: false, exams: [] }
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    try {
      await schemesAPI.delete(id);
      alert('Schema deleted successfully');
      fetchSchemes();
    } catch (error) {
      console.error('Error deleting scheme:', error);
      alert(error.response?.data?.message || 'Error deleting scheme');
    }
  };

  const addComponent = () => {
    setFormData({
      ...formData,
      components: [...formData.components, { name: '', maxMarks: 10, percentage: 10, isOptional: false }]
    });
  };

  const removeComponent = (index) => {
    const newComponents = formData.components.filter((_, i) => i !== index);
    setFormData({ ...formData, components: newComponents });
  };

  const updateComponent = (index, field, value) => {
    const newComponents = [...formData.components];
    newComponents[index] = { ...newComponents[index], [field]: value };
    setFormData({ ...formData, components: newComponents });
  };

  const totalPercentage = formData.components.reduce((sum, c) => sum + (parseFloat(c.percentage) || 0), 0);

  const handleCsvUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const payload = new FormData();
    payload.append('file', file);

    try {
      await schemesAPI.bulkUpload(payload);
      await fetchSchemes();
      alert('Schemes uploaded successfully');
    } catch (error) {
      console.error('Error uploading schemes CSV:', error);
      alert(error.response?.data?.message || 'Error uploading schemes CSV');
    } finally {
      event.target.value = '';
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Evaluation Schemes</h1>
      </div>

      <div className="card">
        <div className="responsive-toolbar" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div className="responsive-toolbar-group" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <input
              type="text"
              className="form-input responsive-control"
              placeholder="Filter by department..."
              value={filters.department}
              onChange={(e) => setFilters({ ...filters, department: e.target.value })}
            />
            <select
              className="form-select responsive-control"
              value={filters.semester}
              onChange={(e) => setFilters({ ...filters, semester: e.target.value })}
            >
              <option value="">All Semesters</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                <option key={s} value={s}>Semester {s}</option>
              ))}
            </select>
          </div>
          <div className="responsive-inline-actions" style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>
              <Upload size={20} /> Upload CSV
            </button>
            <button className="btn btn-primary" onClick={() => { setEditingScheme(null); setShowModal(true); }}>
              <Plus size={20} /> Add Scheme
            </button>
          </div>
          <input type="file" accept=".csv" ref={fileInputRef} onChange={handleCsvUpload} style={{ display: 'none' }} />
        </div>

        {loading ? (
          <div className="loading"><div className="spinner"></div></div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Subject Code</th>
                  <th>Subject Name</th>
                  <th>Department</th>
                  <th>Semester</th>
                  <th>Components</th>
                  <th>Total Percentage</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {schemes.map(scheme => (
                  <tr key={scheme._id}>
                    <td>{scheme.subjectCode}</td>
                    <td>{scheme.subjectName}</td>
                    <td>{scheme.department}</td>
                    <td>Semester {scheme.semester}</td>
                    <td>{scheme.components?.length || 0}</td>
                    <td>{scheme.totalWeightage || 0}%</td>
                    <td>
                      <div className="responsive-inline-actions" style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(scheme)}>
                          <Edit size={16} />
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(scheme._id)}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-wide" style={{ maxWidth: '700px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editingScheme ? 'Edit Scheme' : 'Create Scheme'}</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Semester</label>
                  <select
                    className="form-select"
                    value={formData.semester}
                    onChange={(e) => setFormData({ ...formData, semester: parseInt(e.target.value) })}
                    required
                  >
                    <option value="">Select Semester</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                      <option key={s} value={s}>Semester {s}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Subject Code</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.subjectCode}
                    onChange={(e) => setFormData({ ...formData, subjectCode: e.target.value.toUpperCase() })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Subject Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.subjectName}
                    onChange={(e) => setFormData({ ...formData, subjectName: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ marginTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Components</label>
                  <button type="button" className="btn btn-sm btn-secondary" onClick={addComponent}>
                    <Plus size={16} /> Add Component
                  </button>
                </div>
                {formData.components.map((component, index) => (
                  <div key={index} className="responsive-form-row" style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'flex-end' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Name"
                      value={component.name}
                      onChange={(e) => updateComponent(index, 'name', e.target.value)}
                      style={{ flex: 2 }}
                      required
                    />
                    <input
                      type="number"
                      className="form-input"
                      placeholder="Max"
                      value={component.maxMarks}
                      onChange={(e) => updateComponent(index, 'maxMarks', parseFloat(e.target.value))}
                      style={{ flex: 1 }}
                      required
                    />
                    <input
                      type="number"
                      className="form-input"
                      placeholder="Weight%"
                      value={component.percentage}
                      onChange={(e) => updateComponent(index, 'percentage', parseFloat(e.target.value))}
                      style={{ flex: 1 }}
                      required
                    />
                    <button type="button" className="btn btn-sm btn-danger" onClick={() => removeComponent(index)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                <div style={{ textAlign: 'right', marginTop: '0.5rem', fontWeight: 500 }}>
                  Total Percentage: {totalPercentage}%
                  {totalPercentage !== 100 && <span style={{ color: 'var(--danger-color)', marginLeft: '0.5rem' }}>(Should be 100%)</span>}
                </div>
              </div>

              <div className="grid-2" style={{ marginTop: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Max Grace Marks</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.graceMarks.maxGraceMarks}
                    onChange={(e) => setFormData({ ...formData, graceMarks: { ...formData.graceMarks, maxGraceMarks: parseFloat(e.target.value) } })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Attendance Threshold (%)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.attendanceThreshold.minAttendancePercentage}
                    onChange={(e) => setFormData({ ...formData, attendanceThreshold: { ...formData.attendanceThreshold, minAttendancePercentage: parseFloat(e.target.value) } })}
                  />
                </div>
              </div>

              <div className="responsive-inline-actions" style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="submit" className="btn btn-primary">
                  {editingScheme ? 'Update' : 'Create'}
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

export default Schemes;
