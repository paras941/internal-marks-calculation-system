import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { analyticsAPI } from '../services/api';
import { Users, BookOpen, ClipboardList, BarChart3, TrendingUp } from 'lucide-react';

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
      color: '#2563eb'
    },
    {
      label: 'Total Subjects',
      value: stats?.totalSubjects || 0,
      icon: BookOpen,
      color: '#10b981'
    },
    {
      label: 'Marks Entered',
      value: stats?.marksEntered || 0,
      icon: ClipboardList,
      color: '#f59e0b'
    },
    {
      label: 'Class Average',
      value: stats?.classAverage ? `${stats.classAverage.toFixed(1)}%` : 'N/A',
      icon: TrendingUp,
      color: '#8b5cf6'
    }
  ];

  return (
    <div>
      <div className="page-header">
        <h1>Welcome back, {user?.firstName}!</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
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
              <div style={{
                padding: '0.75rem',
                borderRadius: '0.5rem',
                background: `${stat.color}15`,
                color: stat.color
              }}>
                <stat.icon size={24} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {user?.role !== 'student' && (
        <div className="grid-2">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Recent Activity</h3>
            </div>
            <div>
              {stats?.recentActivity?.length > 0 ? (
                stats.recentActivity.map((activity, index) => (
                  <div key={index} style={{
                    padding: '0.75rem 0',
                    borderBottom: index < stats.recentActivity.length - 1 ? '1px solid var(--border-color)' : 'none'
                  }}>
                    <div style={{ fontWeight: 500 }}>{activity.description}</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      {new Date(activity.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">No recent activity</div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Quick Actions</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <a href="/marks" className="btn btn-primary">Enter Marks</a>
              <a href="/schemes" className="btn btn-secondary">Manage Schemes</a>
              <a href="/analytics" className="btn btn-secondary">View Analytics</a>
            </div>
          </div>
        </div>
      )}

      {user?.role === 'student' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Your Performance Summary</h3>
          </div>
          <div>
            {stats?.studentSummary ? (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <div className="stat-label">Overall Average</div>
                    <div className="stat-value">{stats.studentSummary.average?.toFixed(1) || 'N/A'}%</div>
                  </div>
                  <div>
                    <div className="stat-label">Subjects</div>
                    <div className="stat-value">{stats.studentSummary.subjects || 0}</div>
                  </div>
                </div>
                <a href="/my-marks" className="btn btn-primary">View Detailed Marks</a>
              </div>
            ) : (
              <div className="empty-state">No marks available yet</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
