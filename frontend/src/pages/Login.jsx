import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, Eye, EyeOff, UserPlus, X, Mail, Lock, User, Building2, Hash, ArrowRight, AlertCircle, CheckCircle2, Shield } from 'lucide-react';
import api from '../services/api';

const getPasswordStrength = (password) => {
  if (!password) return { score: 0, label: '', color: '' };
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score: 1, label: 'Weak', color: '#ef4444' };
  if (score <= 2) return { score: 2, label: 'Fair', color: '#f59e0b' };
  if (score <= 3) return { score: 3, label: 'Good', color: '#6366f1' };
  return { score: 4, label: 'Strong', color: '#10b981' };
};

const Login = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

  const regPasswordStrength = useMemo(
    () => getPasswordStrength(regData.password),
    [regData.password]
  );

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
      // Clean up data: remove empty strings and student-only fields for non-students
      const cleanData = { ...regData };
      if (cleanData.role !== 'student') {
        delete cleanData.semester;
        delete cleanData.section;
        delete cleanData.enrollmentNumber;
      } else {
        if (cleanData.semester) {
          cleanData.semester = Number(cleanData.semester);
        } else {
          delete cleanData.semester;
        }
        if (!cleanData.section) delete cleanData.section;
        if (!cleanData.enrollmentNumber) delete cleanData.enrollmentNumber;
      }
      if (!cleanData.department) delete cleanData.department;

      const response = await api.post('/auth/register', cleanData);
      if (response.data.success) {
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

  const switchToRegister = () => {
    setError('');
    setIsRegistering(true);
  };

  const switchToLogin = () => {
    setError('');
    setIsRegistering(false);
  };

  return (
    <div className="login-container">
      {/* Floating decorative elements */}
      <div style={{
        position: 'absolute',
        top: '15%',
        left: '10%',
        width: '120px',
        height: '120px',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '1.5rem',
        transform: 'rotate(15deg)',
        animation: 'float-orb 12s ease-in-out infinite',
        zIndex: 1
      }} />
      <div style={{
        position: 'absolute',
        bottom: '20%',
        right: '15%',
        width: '80px',
        height: '80px',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '50%',
        animation: 'float-orb 9s ease-in-out infinite reverse',
        zIndex: 1
      }} />

      <div className="login-card">
        {/* Logo Section */}
        <div className="login-logo">
          <div className="logo-icon-wrapper">
            <GraduationCap size={36} color="white" />
          </div>
          <h1>Internal Marks System</h1>
          <p>{isRegistering ? 'Create your account to get started' : 'Sign in to your account'}</p>
        </div>

        {isRegistering ? (
          <div className="login-form-section" key="register">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <UserPlus size={20} style={{ color: 'var(--primary-color)' }} />
                <h2 style={{ fontSize: '1.125rem', fontWeight: '600' }}>Create Account</h2>
              </div>
              <button
                type="button"
                onClick={switchToLogin}
                className="modal-close"
              >
                <X size={18} />
              </button>
            </div>

            {error && (
              <div className="login-error">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <form onSubmit={handleRegisterSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">First Name</label>
                  <div className="form-input-icon-wrapper">
                    <User size={16} className="form-input-icon" />
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
                </div>
                <div className="form-group">
                  <label className="form-label">Last Name</label>
                  <div className="form-input-icon-wrapper">
                    <User size={16} className="form-input-icon" />
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
              </div>

              <div className="form-group">
                <label className="form-label">Email</label>
                <div className="form-input-icon-wrapper">
                  <Mail size={16} className="form-input-icon" />
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
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <div style={{ position: 'relative' }}>
                  <div className="form-input-icon-wrapper">
                    <Lock size={16} className="form-input-icon" />
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      name="password"
                      className="form-input"
                      value={regData.password}
                      onChange={handleRegisterChange}
                      placeholder="Min 6 characters"
                      minLength={6}
                      required
                      style={{ paddingRight: '3rem' }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    style={{
                      position: 'absolute',
                      right: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      padding: '0.25rem',
                      display: 'flex'
                    }}
                  >
                    {showRegPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {regData.password && (
                  <div className="password-strength">
                    <div className="password-strength-bar">
                      <div
                        className="password-strength-fill"
                        style={{
                          width: `${(regPasswordStrength.score / 4) * 100}%`,
                          background: regPasswordStrength.color
                        }}
                      />
                    </div>
                    <span className="password-strength-text" style={{ color: regPasswordStrength.color }}>
                      {regPasswordStrength.label}
                    </span>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Role</label>
                <div className="form-input-icon-wrapper">
                  <Shield size={16} className="form-input-icon" />
                  <select
                    name="role"
                    className="form-input form-select"
                    value={regData.role}
                    onChange={handleRegisterChange}
                    required
                    style={{ paddingLeft: '2.75rem' }}
                  >
                    <option value="student">Student</option>
                    <option value="faculty">Faculty</option>
                    <option value="hod">HOD</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Department</label>
                <div className="form-input-icon-wrapper">
                  <Building2 size={16} className="form-input-icon" />
                  <input
                    type="text"
                    name="department"
                    className="form-input"
                    value={regData.department}
                    onChange={handleRegisterChange}
                    placeholder="Department"
                  />
                </div>
              </div>

              {regData.role === 'student' && (
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
                    <label className="form-label">Enrollment</label>
                    <input
                      type="text"
                      name="enrollmentNumber"
                      className="form-input"
                      value={regData.enrollmentNumber}
                      onChange={handleRegisterChange}
                      placeholder="ID"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary btn-lg"
                style={{ width: '100%', marginTop: '0.5rem' }}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} />
                    Creating Account...
                  </>
                ) : (
                  <>
                    <UserPlus size={18} />
                    Create Account
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          <div className="login-form-section" key="login">
            {error && (
              <div className={error.includes('created') ? 'login-success' : 'login-error'}>
                {error.includes('created') ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Email</label>
                <div className="form-input-icon-wrapper">
                  <Mail size={16} className="form-input-icon" />
                  <input
                    type="email"
                    className="form-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <div style={{ position: 'relative' }}>
                  <div className="form-input-icon-wrapper">
                    <Lock size={16} className="form-input-icon" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="form-input"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      style={{ paddingRight: '3rem' }}
                    />
                  </div>
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
                      color: 'var(--text-muted)',
                      padding: '0.25rem',
                      display: 'flex'
                    }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-lg"
                style={{ width: '100%', marginTop: '0.5rem' }}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            <div className="login-divider">or</div>

            <button
              type="button"
              onClick={switchToRegister}
              className="btn btn-secondary"
              style={{ width: '100%' }}
            >
              <UserPlus size={18} />
              Create New Account
            </button>
          </div>
        )}

        {/* Security footer */}
        <div style={{
          marginTop: '1.5rem',
          paddingTop: '1rem',
          borderTop: '1px solid var(--border-color)',
          textAlign: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.375rem',
          color: 'var(--text-muted)',
          fontSize: '0.75rem'
        }}>
          <Lock size={12} />
          Secured with JWT authentication
        </div>
      </div>
    </div>
  );
};

export default Login;
