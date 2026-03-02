import { useState, useEffect } from 'react';
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
  Clock
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
      color: '#6366f1',
      bg: '#eef2ff'
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
      color: '#f59e0b',
      bg: '#fffbeb'
    },
    {
      label: 'Class Average',
      value: stats?.classAverage ? `${stats.classAverage.toFixed(1)}%` : 'N/A',
      icon: TrendingUp,
      color: '#8b5cf6',
      bg: '#f5f3ff'
    }
  ];

  const quickActions = [
    { label: 'Enter Marks', href: '/marks', icon: ClipboardList, color: '#6366f1', bg: '#eef2ff' },
    { label: 'Manage Schemes', href: '/schemes', icon: Settings, color: '#10b981', bg: '#ecfdf5' },
    { label: 'View Analytics', href: '/analytics', icon: BarChart3, color: '#f59e0b', bg: '#fffbeb' }
  ];

  return (
    <div>
      <div className="page-header">
        <h1>Welcome back, {user?.firstName}!</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          Here's what's happening in your department.
        </p>
      </div>

      <div className="stats-grid">
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
          <div className="card">
            <div className="card-header">
              <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={18} style={{ color: 'var(--primary-color)' }} />
                Recent Activity
              </h3>
            </div>
            <div>
              {stats?.recentActivity?.length > 0 ? (
                stats.recentActivity.map((activity, index) => (
                  <div key={index} className="activity-item">
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

          <div className="card">
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
        <div className="card">
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
                    <div className="stat-label">Subjects</div>
                    <div className="stat-value" style={{ color: '#10b981' }}>
                      {stats.studentSummary.subjects || 0}
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
      )}
    </div>
  );
};

export default Dashboard;
