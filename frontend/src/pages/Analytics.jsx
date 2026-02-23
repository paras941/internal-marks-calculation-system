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
            <h3 className="card-title">Class Average by Subject</h3>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={classAverage}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="subjectCode" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Bar dataKey="average" fill="#2563eb" name="Class Average %" />
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
          <h3 className="card-title">Subject Statistics</h3>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Code</th>
                <th>Average</th>
                <th>Highest</th>
                <th>Lowest</th>
                <th>Students</th>
              </tr>
            </thead>
            <tbody>
              {classAverage.map((subject, index) => (
                <tr key={index}>
                  <td>{subject.subjectName}</td>
                  <td>{subject.subjectCode}</td>
                  <td>{subject.average?.toFixed(1)}%</td>
                  <td>{subject.highest?.toFixed(1)}</td>
                  <td>{subject.lowest?.toFixed(1)}</td>
                  <td>{subject.studentCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
