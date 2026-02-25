import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, Eye, EyeOff, UserPlus, X } from 'lucide-react';
import api from '../services/api';

const Login = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Registration form state
  const [regData, setRegData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'student',
    department: '',
    semester: '',
    section: '',
    enrollmentNumber: ''
  });
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);
    
    if (result.success) {
      navigate('/');
    } else {
      setError(result.message);
    }
    
    setLoading(false);
  };

  const handleRegisterChange = (e) => {
    setRegData({ ...regData, [e.target.name]: e.target.value });
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/auth/register', regData);
      if (response.data.success) {
        // Auto login after registration
        const loginResult = await login(regData.email, regData.password);
        if (loginResult.success) {
          navigate('/');
        } else {
          setIsRegistering(false);
          setError('Account created! Please login with your credentials.');
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    }
    
    setLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-logo">
          <GraduationCap size={48} color="#2563eb" />
          <h1>Internal Marks System</h1>
        </div>

        {isRegistering ? (
          <form onSubmit={handleRegisterSubmit}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Create Account</h2>
              <button
                type="button"
                onClick={() => setIsRegistering(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <X size={20} />
              </button>
            </div>

            {error && (
              <div className="badge badge-danger" style={{ marginBottom: '1rem', display: 'block', padding: '0.75rem' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">First Name</label>
                <input
                  type="text"
                  name="firstName"
                  className="form-input"
                  value={regData.firstName}
                  onChange={handleRegisterChange}
                  placeholder="First name"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  className="form-input"
                  value={regData.lastName}
                  onChange={handleRegisterChange}
                  placeholder="Last name"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                name="email"
                className="form-input"
                value={regData.email}
                onChange={handleRegisterChange}
                placeholder="Enter your email"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                name="password"
                className="form-input"
                value={regData.password}
                onChange={handleRegisterChange}
                placeholder="Create a password (min 6 characters)"
                minLength={6}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Role</label>
              <select
                name="role"
                className="form-input"
                value={regData.role}
                onChange={handleRegisterChange}
                required
              >
                <option value="student">Student</option>
                <option value="faculty">Faculty</option>
                <option value="hod">HOD</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Department</label>
              <input
                type="text"
                name="department"
                className="form-input"
                value={regData.department}
                onChange={handleRegisterChange}
                placeholder="Department"
              />
            </div>

            {regData.role === 'student' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label">Semester</label>
                    <input
                      type="number"
                      name="semester"
                      className="form-input"
                      value={regData.semester}
                      onChange={handleRegisterChange}
                      placeholder="1-8"
                      min={1}
                      max={8}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Section</label>
                    <input
                      type="text"
                      name="section"
                      className="form-input"
                      value={regData.section}
                      onChange={handleRegisterChange}
                      placeholder="A, B, C"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Enrollment No.</label>
                    <input
                      type="text"
                      name="enrollmentNumber"
                      className="form-input"
                      value={regData.enrollmentNumber}
                      onChange={handleRegisterChange}
                      placeholder="Enrollment"
                    />
                  </div>
                </div>
              </>
            )}

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="badge badge-danger" style={{ marginBottom: '1rem', display: 'block', padding: '0.75rem' }}>
                {error}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  style={{ paddingRight: '3rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)'
                  }}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        )}

        {!isRegistering && (
          <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => setIsRegistering(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary)',
                  cursor: 'pointer',
                  fontWeight: '500',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
              >
                <UserPlus size={16} />
                Create Account
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
