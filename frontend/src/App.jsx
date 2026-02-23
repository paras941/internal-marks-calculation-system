import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Schemes from './pages/Schemes';
import Marks from './pages/Marks';
import Attendance from './pages/Attendance';
import Analytics from './pages/Analytics';
import AuditLogs from './pages/AuditLogs';
import StudentMarks from './pages/StudentMarks';
import Layout from './components/Layout';

const PrivateRoute = ({ children, roles }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (roles && !roles.includes(user?.role)) {
    return <Navigate to="/" />;
  }

  return children;
};

const AppRoutes = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" /> : <Login />} />
      
      <Route path="/" element={
        <PrivateRoute>
          <Layout />
        </PrivateRoute>
      }>
        <Route index element={<Dashboard />} />
        
        <Route path="users" element={
          <PrivateRoute roles={['admin', 'hod']}>
            <Users />
          </PrivateRoute>
        } />
        
        <Route path="schemes" element={
          <PrivateRoute roles={['admin', 'hod']}>
            <Schemes />
          </PrivateRoute>
        } />
        
        <Route path="marks" element={
          <PrivateRoute roles={['admin', 'faculty', 'hod']}>
            <Marks />
          </PrivateRoute>
        } />
        
        <Route path="attendance" element={
          <PrivateRoute roles={['admin', 'faculty', 'hod']}>
            <Attendance />
          </PrivateRoute>
        } />
        
        <Route path="analytics" element={
          <PrivateRoute roles={['admin', 'faculty', 'hod']}>
            <Analytics />
          </PrivateRoute>
        } />
        
        <Route path="audit-logs" element={
          <PrivateRoute roles={['admin']}>
            <AuditLogs />
          </PrivateRoute>
        } />
        
        <Route path="my-marks" element={<StudentMarks />} />
      </Route>
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
