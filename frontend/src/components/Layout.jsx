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

  const getInitials = (firstName, lastName) => {
    return `${(firstName || '')[0] || ''}${(lastName || '')[0] || ''}`.toUpperCase();
  };

  const handleNavItemClick = () => {
    if (window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
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
        className="mobile-menu-btn"
        aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="logo-icon-sidebar">
            <GraduationCap size={22} color="white" />
          </div>
          <span>Internal Marks</span>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {filteredMenu.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={handleNavItemClick}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              end={item.path === '/'}
            >
              <item.icon size={19} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User Section at Bottom */}
        <div className="sidebar-user">
          <div className="sidebar-user-info">
            <div className="sidebar-avatar">
              {getInitials(user?.firstName, user?.lastName)}
            </div>
            <div>
              <div className="sidebar-user-name">{user?.firstName} {user?.lastName}</div>
              <div className="sidebar-user-role">{user?.role}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="sidebar-logout">
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="header">
          <div className="header-welcome">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
          <div className="user-info">
            <div className="user-details">
              <div className="user-name">{user?.firstName} {user?.lastName}</div>
              <div className="user-role">{user?.role}</div>
            </div>
            <div className="user-avatar">
              {getInitials(user?.firstName, user?.lastName)}
            </div>
          </div>
        </header>

        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
