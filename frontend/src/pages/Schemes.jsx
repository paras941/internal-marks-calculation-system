import { useState, useEffect } from 'react';
import { schemesAPI } from '../services/api';
import { Plus, Edit, Trash2, X } from 'lucide-react';

const Schemes = () => {
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingScheme, setEditingScheme] = useState(null);
  const [filters, setFilters] = useState({ department: '', semester: '' });
  const [formData, setFormData] = useState({
    department: '',
    semester: '',
    subjectCode: '',
    subjectName: '',
    components: [
      { name: 'Attendance', maxMarks: 5, weightage: 5, isOptional: false },
      { name: 'Quiz', maxMarks: 10, weightage: 10, isOptional: false },
      { name: 'Midterm', maxMarks: 30, weightage: 30, isOptional: false },
      { name: 'Assignment', maxMarks: 10, weightage: 10, isOptional: false },
      { name: 'Lab', maxMarks: 45, weightage: 45, isOptional: false }
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
      components: scheme.components || [],
      graceMarks: scheme.graceMarks || { maxGraceMarks: 5, allowCarryOver: false },
      attendanceThreshold: scheme.attendanceThreshold || { minAttendancePercentage: 75, marksApplicable: 5 },
      bestOfTwoLogic: scheme.bestOfTwoLogic || { enabled: false, exams: [] }
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this scheme?')) {
      try {
        await schemesAPI.delete(id);
        fetchSchemes();
      } catch (error) {
        console.error('Error deleting scheme:', error);
      }
    }
  };

  const addComponent = () => {
    setFormData({
      ...formData,
      components: [...formData.components, { name: '', maxMarks: 10, weightage: 10, isOptional: false }]
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

  const totalWeightage = formData.components.reduce((sum, c) => sum + (parseFloat(c.weightage) || 0), 0);

  return (
    <div>
      <div className="page-header">
        <h1>Evaluation Schemes</h1>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Filter by department..."
              value={filters.department}
              onChange={(e) => setFilters({ ...filters, department: e.target.value })}
              style={{ width: 'auto' }}
            />
            <select
              className="form-select"
              value={filters.semester}
              onChange={(e) => setFilters({ ...filters, semester: e.target.value })}
              style={{ width: 'auto' }}
            >
              <option value="">All Semesters</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                <option key={s} value={s}>Semester {s}</option>
              ))}
            </select>
          </div>
          <button className="btn btn-primary" onClick={() => { setEditingScheme(null); setShowModal(true); }}>
            <Plus size={20} /> Add Scheme
          </button>
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
                  <th>Total Weightage</th>
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
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
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
          <div className="modal" style={{ maxWidth: '700px' }} onClick={(e) => e.stopPropagation()}>
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
                  <div key={index} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'flex-end' }}>
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
                      value={component.weightage}
                      onChange={(e) => updateComponent(index, 'weightage', parseFloat(e.target.value))}
                      style={{ flex: 1 }}
                      required
                    />
                    <button type="button" className="btn btn-sm btn-danger" onClick={() => removeComponent(index)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                <div style={{ textAlign: 'right', marginTop: '0.5rem', fontWeight: 500 }}>
                  Total Weightage: {totalWeightage}%
                  {totalWeightage !== 100 && <span style={{ color: 'var(--danger-color)', marginLeft: '0.5rem' }}>(Should be 100%)</span>}
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

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
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
