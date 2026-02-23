import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  ClipboardList, 
  Calendar, 
  BarChart3, 
  FileText, 
  LogOut,
  Menu,
  X,
  GraduationCap
} from 'lucide-react';

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const adminMenu = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'faculty', 'hod', 'student'] },
    { path: '/users', icon: Users, label: 'Users', roles: ['admin', 'hod'] },
    { path: '/schemes', icon: BookOpen, label: 'Evaluation Schemes', roles: ['admin', 'hod'] },
    { path: '/marks', icon: ClipboardList, label: 'Marks', roles: ['admin', 'faculty', 'hod'] },
    { path: '/attendance', icon: Calendar, label: 'Attendance', roles: ['admin', 'faculty', 'hod'] },
    { path: '/analytics', icon: BarChart3, label: 'Analytics', roles: ['admin', 'faculty', 'hod'] },
    { path: '/audit-logs', icon: FileText, label: 'Audit Logs', roles: ['admin'] },
    { path: '/my-marks', icon: GraduationCap, label: 'My Marks', roles: ['student'] }
  ];

  const filteredMenu = adminMenu.filter(item => 
    item.roles.includes(user?.role)
  );

  return (
    <div className="app-container">
      {/* Mobile Toggle */}
      <button 
        className="btn btn-secondary"
        style={{ position: 'fixed', top: '1rem', left: '1rem', zIndex: 1000, display: 'none' }}
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <aside className="sidebar" style={{ display: sidebarOpen ? 'block' : 'none' }}>
        <div className="sidebar-logo">
          <GraduationCap size={28} />
          <span>Internal Marks</span>
        </div>

        <nav className="sidebar-nav">
          {filteredMenu.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              end={item.path === '/'}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div style={{ marginTop: 'auto', paddingTop: '2rem' }}>
          <button onClick={handleLogout} className="nav-item" style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer' }}>
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="header">
          <div></div>
          <div className="user-info">
            <div className="user-details">
              <div className="user-name">{user?.firstName} {user?.lastName}</div>
              <div className="user-role">{user?.role?.toUpperCase()}</div>
            </div>
          </div>
        </header>

        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
