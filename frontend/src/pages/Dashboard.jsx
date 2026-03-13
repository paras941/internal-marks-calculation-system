import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { analyticsAPI } from '../services/api';
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

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

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
        <div className="card fade-up delay-2">
          <div className="card-header">
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BarChart3 size={18} style={{ color: 'var(--primary-color)' }} />
              Your Performance Summary
            </h3>
          </div>
          <div>
            {stats?.studentSummary ? (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem', marginBottom: '1.5rem' }}>
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
                </div>
                <div className="attendance-track">
                  <div className="attendance-track-head">
                    <span>Attendance Health</span>
                    <strong>{(stats.studentSummary.attendance || 0).toFixed(1)}%</strong>
                  </div>
                  <div className="attendance-track-bar">
                    <div
                      className="attendance-track-fill"
                      style={{ width: `${Math.min(100, stats.studentSummary.attendance || 0)}%` }}
                    />
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
      )}
    </div>
  );
};

export default Dashboard;
