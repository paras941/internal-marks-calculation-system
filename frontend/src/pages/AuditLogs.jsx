import { useState, useEffect } from 'react';
import { auditAPI } from '../services/api';
import { Download, Search, Filter } from 'lucide-react';

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    action: '',
    entityType: '',
    userId: '',
    startDate: '',
    endDate: '',
    page: 1,
    limit: 50
  });
  const [pagination, setPagination] = useState({ total: 0, pages: 0 });

  useEffect(() => {
    fetchLogs();
  }, [filters]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await auditAPI.getAll(filters);
      setLogs(response.data.data);
      setPagination(response.data.pagination || { total: 0, pages: 0 });
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await auditAPI.export(filters);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit-logs-${new Date().toISOString()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting audit logs:', error);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString();
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'CREATE': return 'badge-success';
      case 'UPDATE': return 'badge-warning';
      case 'DELETE': return 'badge-danger';
      case 'LOGIN':
      case 'LOGOUT': return 'badge-info';
      default: return 'badge-info';
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Audit Logs</h1>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <select
              className="form-select"
              value={filters.action}
              onChange={(e) => setFilters({ ...filters, action: e.target.value })}
              style={{ width: 'auto' }}
            >
              <option value="">All Actions</option>
              <option value="CREATE">Create</option>
              <option value="UPDATE">Update</option>
              <option value="DELETE">Delete</option>
              <option value="LOGIN">Login</option>
              <option value="LOGOUT">Logout</option>
            </select>
            <select
              className="form-select"
              value={filters.entityType}
              onChange={(e) => setFilters({ ...filters, entityType: e.target.value })}
              style={{ width: 'auto' }}
            >
              <option value="">All Entities</option>
              <option value="USER">User</option>
              <option value="EVALUATION_SCHEME">Evaluation Scheme</option>
              <option value="STUDENT_MARKS">Student Marks</option>
              <option value="ATTENDANCE">Attendance</option>
              <option value="AUTH">Authentication</option>
            </select>
            <input
              type="date"
              className="form-input"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              style={{ width: 'auto' }}
              placeholder="Start Date"
            />
            <input
              type="date"
              className="form-input"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              style={{ width: 'auto' }}
              placeholder="End Date"
            />
          </div>
          <button className="btn btn-primary" onClick={handleExport}>
            <Download size={20} /> Export
          </button>
        </div>

        {loading ? (
          <div className="loading"><div className="spinner"></div></div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Entity Type</th>
                  <th>Description</th>
                  <th>IP Address</th>
                  <th>Changes</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log._id}>
                    <td>{formatDate(log.timestamp)}</td>
                    <td>{log.userId?.firstName} {log.userId?.lastName}</td>
                    <td>
                      <span className={`badge ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td>{log.entityType}</td>
                    <td>{log.description || '-'}</td>
                    <td>{log.ipAddress || '-'}</td>
                    <td>
                      {log.oldValue && log.newValue && (
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => alert(JSON.stringify({ old: log.oldValue, new: log.newValue }, null, 2))}
                        >
                          View
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {logs.length === 0 && !loading && (
          <div className="empty-state">No audit logs found</div>
        )}
      </div>
    </div>
  );
};

export default AuditLogs;
