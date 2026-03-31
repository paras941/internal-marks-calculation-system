import { useState, useEffect } from 'react';
import { analyticsAPI, schemesAPI } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [schemes, setSchemes] = useState([]);
  const [filters, setFilters] = useState({ subjectId: '' });
  const [classAverage, setClassAverage] = useState([]);
  const [subjectPerformance, setSubjectPerformance] = useState([]);
  const [attendanceDistribution, setAttendanceDistribution] = useState([]);

  useEffect(() => {
    fetchSchemes();
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [filters.subjectId]);

  const fetchSchemes = async () => {
    try {
      const response = await schemesAPI.getAll({});
      setSchemes(response.data.data);
    } catch (error) {
      console.error('Error fetching schemes:', error);
    }
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [avgRes, perfRes, attRes] = await Promise.all([
        analyticsAPI.getClassAverage(filters),
        analyticsAPI.getSubjectPerformance(filters),
        analyticsAPI.getAttendanceDistribution(filters)
      ]);

      setClassAverage(avgRes.data.data || []);
      setSubjectPerformance(perfRes.data.data || []);
      setAttendanceDistribution(attRes.data.data || []);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
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
      <div className="page-header">
        <h1>Analytics Dashboard</h1>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <select
          className="form-select"
          value={filters.subjectId}
          onChange={(e) => setFilters({ ...filters, subjectId: e.target.value })}
          style={{ width: '300px' }}
        >
          <option value="">All Subjects</option>
          {schemes.map(scheme => (
            <option key={scheme._id} value={scheme._id}>
              {scheme.subjectCode} - {scheme.subjectName}
            </option>
          ))}
        </select>
      </div>

      <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Class Average by Subject (Bar Chart)</h3>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={classAverage}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="subjectCode" angle={-45} textAnchor="end" height={100} />
                <YAxis domain={[0, 100]} />
                <Tooltip formatter={(value) => value?.toFixed(1)} />
                <Legend />
                <Bar dataKey="average" fill="#2563eb" name="Class Average" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Subject Performance Distribution</h3>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={subjectPerformance}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                  nameKey="range"
                >
                  {subjectPerformance.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <h3 className="card-title">Class Average Trend by Subject (Line Chart)</h3>
        </div>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={classAverage}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="subjectCode" angle={-45} textAnchor="end" height={100} />
              <YAxis domain={[0, 100]} />
              <Tooltip formatter={(value) => value?.toFixed(1)} />
              <Legend />
              <Line
                type="monotone"
                dataKey="average"
                stroke="#2563eb"
                dot={{ fill: '#2563eb', r: 5 }}
                activeDot={{ r: 7 }}
                name="Class Average"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Attendance Distribution</h3>
        </div>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={attendanceDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#10b981" name="Number of Students" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Statistics Table */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div className="card-header">
          <h3 className="card-title">Subject Statistics - Performance Overview</h3>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr style={{ backgroundColor: '#f3f4f6' }}>
                <th>Subject</th>
                <th>Subject Code</th>
                <th style={{ textAlign: 'center' }}>Total Students</th>
                <th style={{ textAlign: 'center' }}>Average marks</th>
                <th style={{ textAlign: 'center' }}>Highest marks</th>
                <th style={{ textAlign: 'center' }}>Lowest marks</th>
              </tr>
            </thead>
            <tbody>
              {classAverage.length > 0 ? (
                classAverage.map((subject, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ fontWeight: '500' }}>{subject.subjectName}</td>
                    <td>
                      <span style={{ backgroundColor: '#dbeafe', color: '#1e40af', padding: '0.25rem 0.75rem', borderRadius: '0.375rem', fontSize: '0.875rem', fontWeight: '500' }}>
                        {subject.subjectCode}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: '600', color: '#059669' }}>
                      {subject.studentCount}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{
                        backgroundColor: '#e0e7ff',
                        color: '#4f46e5',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '0.375rem',
                        fontWeight: '600',
                        display: 'inline-block'
                      }}>
                        {subject.average?.toFixed(1)}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{
                        backgroundColor: '#dcfce7',
                        color: '#166534',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '0.375rem',
                        fontWeight: '600',
                        display: 'inline-block'
                      }}>
                        {subject.highest?.toFixed(1)}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{
                        backgroundColor: '#fee2e2',
                        color: '#991b1b',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '0.375rem',
                        fontWeight: '600',
                        display: 'inline-block'
                      }}>
                        {subject.lowest?.toFixed(1)}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
                    No data available. Select a subject or check if marks have been entered.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Statistics Cards */}
      {classAverage.length > 0 && (
        <div style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
          {classAverage.map((subject, index) => (
            <div key={index} className="card" style={{ padding: '1.5rem' }}>
              <h4 style={{ marginBottom: '1rem', color: '#1f2937', fontWeight: '600' }}>
                {subject.subjectCode} - {subject.subjectName}
              </h4>
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>
                  <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>Total Students:</span>
                  <span style={{ fontWeight: '600', color: '#059669', fontSize: '1.125rem' }}>{subject.studentCount}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>
                  <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>Class Average:</span>
                  <span style={{ fontWeight: '600', color: '#4f46e5', fontSize: '1.125rem' }}>{subject.average?.toFixed(1)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>
                  <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>Highest Score:</span>
                  <span style={{ fontWeight: '600', color: '#166534', fontSize: '1.125rem' }}>{subject.highest?.toFixed(1)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>Lowest Score:</span>
                  <span style={{ fontWeight: '600', color: '#991b1b', fontSize: '1.125rem' }}>{subject.lowest?.toFixed(1)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Analytics;
