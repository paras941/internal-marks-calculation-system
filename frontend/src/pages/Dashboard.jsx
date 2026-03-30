import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { analyticsAPI, marksAPI, attendanceAPI } from '../services/api';
import {
  Users,
  BookOpen,
  ClipboardList,
  TrendingUp,
  ArrowRight,
  BarChart3,
  Settings,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Activity,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [studentMarks, setStudentMarks] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [marksLoading, setMarksLoading] = useState(false);

  useEffect(() => {
    fetchDashboard();
  }, []);

  useEffect(() => {
    if (user?.role === 'student') {
      fetchStudentMarks();
      fetchStudentAttendance();
    }
  }, [user]);

  const fetchDashboard = async () => {
    try {
      const response = await analyticsAPI.getDashboard();
      setStats(response.data.data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentMarks = async () => {
    try {
      setMarksLoading(true);
      const response = await marksAPI.getAll({ studentId: user?._id });
      setStudentMarks(response.data.data || []);
    } catch (error) {
      console.error('Error fetching student marks:', error);
    } finally {
      setMarksLoading(false);
    }
  };

  const fetchStudentAttendance = async () => {
    try {
      const response = await attendanceAPI.getAll({ studentId: user?._id });
      if (response.data.data && Array.isArray(response.data.data)) {
        // Format attendance data for chart
        const formatted = response.data.data.map(record => ({
          month: new Date(new Date().getFullYear(), record.month - 1).toLocaleString('default', { month: 'short' }),
          percentage: record.percentage,
          subject: record.subjectId?.subjectCode || 'Subject'
        }));
        setAttendanceData(formatted);
      }
    } catch (error) {
      console.error('Error fetching student attendance:', error);
    }
  };

  const classAverage = Number(stats?.classAverage || 0);
  const approvalRate = Number(stats?.approvalRate || 0);
  const marksByStatus = stats?.marksByStatus || {};
  const recentActivity = stats?.recentActivity || [];

  const riskFlags = useMemo(() => {
    const flags = [];
    if ((stats?.atRiskCount || 0) > 0) {
      flags.push(`${stats.atRiskCount} attendance entries are below 75%`);
    }
    if ((stats?.pendingApprovals || 0) > 0) {
      flags.push(`${stats.pendingApprovals} marks entries are pending final approval`);
    }
    if (classAverage > 0 && classAverage < 50) {
      flags.push('Class average is below 50%, consider an intervention plan');
    }
    if (flags.length === 0) {
      flags.push('No critical academic risks detected in current data window');
    }
    return flags;
  }, [stats, classAverage]);

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Students',
      value: stats?.totalStudents || 0,
      icon: Users,
      color: '#0f766e',
      bg: '#ccfbf1'
    },
    {
      label: 'Total Subjects',
      value: stats?.totalSubjects || 0,
      icon: BookOpen,
      color: '#10b981',
      bg: '#ecfdf5'
    },
    {
      label: 'Marks Entered',
      value: stats?.marksEntered || 0,
      icon: ClipboardList,
      color: '#b45309',
      bg: '#ffedd5'
    },
    {
      label: 'Class Average',
      value: classAverage ? `${classAverage.toFixed(1)}%` : 'N/A',
      icon: TrendingUp,
      color: '#334155',
      bg: '#e2e8f0'
    }
  ];

  const quickActions = [
    { label: 'Enter Marks', href: '/marks', icon: ClipboardList, color: '#6366f1', bg: '#eef2ff', roles: ['admin', 'faculty', 'hod'] },
    { label: 'Manage Schemes', href: '/schemes', icon: Settings, color: '#10b981', bg: '#ecfdf5', roles: ['admin', 'hod'] },
    { label: 'View Analytics', href: '/analytics', icon: BarChart3, color: '#f59e0b', bg: '#fffbeb', roles: ['admin', 'faculty', 'hod'] }
  ].filter((action) => action.roles.includes(user?.role));

  const workflow = [
    { label: 'Draft', value: marksByStatus.draft || 0, color: 'var(--warning-color)' },
    { label: 'Calculated', value: marksByStatus.calculated || 0, color: '#2563eb' },
    { label: 'Submitted', value: marksByStatus.submitted || 0, color: '#7c3aed' },
    { label: 'Approved', value: marksByStatus.approved || 0, color: 'var(--success-color)' }
  ];

  return (
    <div className="dashboard-shell">
      <div className="page-header">
        <h1>Welcome back, {user?.firstName}!</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          Live academic performance, approval flow, and risk indicators in one place.
        </p>
      </div>

      <div className="dashboard-hero fade-up">
        <div>
          <div className="dashboard-hero-title">
            <Sparkles size={18} />
            Operational Snapshot
          </div>
          <p className="dashboard-hero-subtitle">
            Approval rate is <strong>{approvalRate.toFixed(1)}%</strong> with <strong>{stats?.pendingApprovals || 0}</strong> pending items.
          </p>
        </div>
        <div className="dashboard-hero-chips">
          <div className="hero-chip">
            <ShieldCheck size={16} />
            Governance Ready
          </div>
          <div className="hero-chip">
            <Activity size={16} />
            Real-time Signals
          </div>
        </div>
      </div>

      <div className="stats-grid fade-up delay-1">
        {statCards.map((stat, index) => (
          <div key={index} className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="stat-label">{stat.label}</div>
                <div className="stat-value">{stat.value}</div>
              </div>
              <div className="stat-icon-box" style={{ background: stat.bg, color: stat.color }}>
                <stat.icon size={22} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {user?.role !== 'student' && (
        <div className="grid-2">
          <div className="card fade-up delay-2">
            <div className="card-header">
              <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={18} style={{ color: 'var(--success-color)' }} />
                Marks Workflow
              </h3>
            </div>
            <div className="workflow-grid">
              {workflow.map((item) => (
                <div key={item.label} className="workflow-step">
                  <div className="workflow-value" style={{ color: item.color }}>{item.value}</div>
                  <div className="workflow-label">{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card fade-up delay-2">
            <div className="card-header">
              <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={18} style={{ color: 'var(--warning-color)' }} />
                Risk Radar
              </h3>
            </div>
            <div className="insight-list">
              {riskFlags.map((flag) => (
                <div key={flag} className="insight-item">
                  <AlertTriangle size={14} />
                  {flag}
                </div>
              ))}
            </div>
          </div>

          <div className="card fade-up delay-3">
            <div className="card-header">
              <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={18} style={{ color: 'var(--primary-color)' }} />
                Recent Activity
              </h3>
            </div>
            <div>
              {recentActivity.length > 0 ? (
                recentActivity.map((activity, index) => (
                  <div key={`${activity.timestamp}-${index}`} className="activity-item">
                    <div className="activity-dot" />
                    <div className="activity-content">
                      <div className="activity-text">{activity.description}</div>
                      <div className="activity-time">
                        {new Date(activity.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state" style={{ padding: '2rem' }}>
                  <div className="empty-state-icon">
                    <Clock size={28} />
                  </div>
                  No recent activity
                </div>
              )}
            </div>
          </div>

          <div className="card fade-up delay-3">
            <div className="card-header">
              <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ArrowRight size={18} style={{ color: 'var(--primary-color)' }} />
                Quick Actions
              </h3>
            </div>
            <div className="quick-actions">
              {quickActions.map((action, index) => (
                <Link key={index} to={action.href} className="quick-action-btn">
                  <div className="quick-action-icon" style={{ background: action.bg, color: action.color }}>
                    <action.icon size={18} />
                  </div>
                  {action.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {user?.role === 'student' && (
        <div className="fade-up delay-2">
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-header">
              <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BarChart3 size={18} style={{ color: 'var(--primary-color)' }} />
                Your Performance Summary
              </h3>
            </div>
            <div>
              {stats?.studentSummary ? (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{
                      padding: '1.25rem',
                      background: '#eef2ff',
                      borderRadius: 'var(--radius-md)',
                      textAlign: 'center'
                    }}>
                      <div className="stat-label">Overall Average</div>
                      <div className="stat-value" style={{ color: '#6366f1' }}>
                        {stats.studentSummary.average?.toFixed(1) || 'N/A'}%
                      </div>
                    </div>
                    <div style={{
                      padding: '1.25rem',
                      background: '#ecfdf5',
                      borderRadius: 'var(--radius-md)',
                      textAlign: 'center'
                    }}>
                      <div className="stat-label">Subjects Covered</div>
                      <div className="stat-value" style={{ color: '#10b981' }}>
                        {stats.studentSummary.subjects || 0}
                      </div>
                    </div>
                    <div style={{
                      padding: '1.25rem',
                      background: '#fef3c7',
                      borderRadius: 'var(--radius-md)',
                      textAlign: 'center'
                    }}>
                      <div className="stat-label">Current Attendance</div>
                      <div className="stat-value" style={{ color: '#d97706' }}>
                        {(stats.studentSummary.attendance || 0).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  <Link to="/my-marks" className="btn btn-primary" style={{ width: '100%' }}>
                    View Detailed Marks
                    <ArrowRight size={18} />
                  </Link>
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon">
                    <ClipboardList size={28} />
                  </div>
                  No marks available yet
                </div>
              )}
            </div>
          </div>

          {/* Marks by Subject */}
          {studentMarks.length > 0 && (
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <div className="card-header">
                <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ClipboardList size={18} style={{ color: 'var(--primary-color)' }} />
                  Your Marks by Subject
                </h3>
              </div>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr style={{ backgroundColor: '#f3f4f6' }}>
                      <th>Subject</th>
                      <th style={{ textAlign: 'center' }}>Total Marks</th>
                      <th style={{ textAlign: 'center' }}>Final Marks</th>
                      <th style={{ textAlign: 'center' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentMarks.map((mark, index) => (
                      <tr key={index} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td>
                          <div>
                            <div style={{ fontWeight: '600' }}>{mark.subjectId?.subjectCode}</div>
                            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>{mark.subjectId?.subjectName}</div>
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ backgroundColor: '#e0e7ff', color: '#4f46e5', padding: '0.25rem 0.75rem', borderRadius: '0.375rem', fontWeight: '600' }}>
                            {mark.totalMarks}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '0.25rem 0.75rem', borderRadius: '0.375rem', fontWeight: '600' }}>
                            {mark.finalMarks?.toFixed(2)}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{
                            backgroundColor: mark.status === 'approved' ? '#dcfce7' : mark.status === 'submitted' ? '#dbeafe' : '#fee2e2',
                            color: mark.status === 'approved' ? '#166534' : mark.status === 'submitted' ? '#1e40af' : '#991b1b',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '0.375rem',
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            textTransform: 'capitalize'
                          }}>
                            {mark.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Attendance Chart */}
          {attendanceData.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <BarChart3 size={18} style={{ color: 'var(--primary-color)' }} />
                  Your Attendance Trend
                </h3>
              </div>
              <div style={{ height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={attendanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip formatter={(value) => `${value}%`} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="percentage"
                      stroke="#10b981"
                      dot={{ fill: '#10b981', r: 5 }}
                      activeDot={{ r: 7 }}
                      name="Attendance %"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
