import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  register: (data) => api.post('/auth/register', data)
};

// Users API
export const usersAPI = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  getStudents: (params) => api.get('/users/students', { params }),
  getFaculty: () => api.get('/users/faculty')
};

// Schemes API
export const schemesAPI = {
  getAll: (params) => api.get('/schemes', { params }),
  getById: (id) => api.get(`/schemes/${id}`),
  create: (data) => api.post('/schemes', data),
  update: (id, data) => api.put(`/schemes/${id}`, data),
  delete: (id) => api.delete(`/schemes/${id}`),
  getMySubjects: () => api.get('/schemes/faculty/my-subjects')
};

// Marks API
export const marksAPI = {
  getAll: (params) => api.get('/marks', { params }),
  getById: (id) => api.get(`/marks/${id}`),
  create: (data) => api.post('/marks', data),
  update: (id, data) => api.put(`/marks/${id}`, data),
  delete: (id) => api.delete(`/marks/${id}`),
  bulkUpload: (formData) => api.post('/marks/bulk', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  recalculate: (subjectId) => api.post(`/marks/recalculate/${subjectId}`),
  approve: (id) => api.put(`/marks/approve/${id}`)
};

// Attendance API
export const attendanceAPI = {
  getAll: (params) => api.get('/attendance', { params }),
  create: (data) => api.post('/attendance', data),
  bulkCreate: (data) => api.post('/attendance/bulk', data),
  getSummary: (studentId, params) => api.get(`/attendance/summary/${studentId}`, { params })
};

// Analytics API
export const analyticsAPI = {
  getClassAverage: (params) => api.get('/analytics/class-average', { params }),
  getSubjectPerformance: (params) => api.get('/analytics/subject-performance', { params }),
  getAttendanceDistribution: (params) => api.get('/analytics/attendance-distribution', { params }),
  getStudentProgress: (studentId, params) => api.get(`/analytics/student-progress/${studentId || ''}`, { params }),
  getDashboard: () => api.get('/analytics/dashboard')
};

// Audit Logs API
export const auditAPI = {
  getAll: (params) => api.get('/audit-logs', { params }),
  export: (params) => api.get('/audit-logs/export', { params, responseType: 'blob' })
};

export default api;
