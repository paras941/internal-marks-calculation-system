# Internal Marks Calculation System - Specification

## 1. Project Overview

**Project Name:** Internal Marks Calculation System  
**Project Type:** Full-stack Web Application  
**Core Functionality:** A comprehensive academic management system for calculating, managing, and reporting student internal marks with role-based access control, automated calculations, and audit logging.  
**Target Users:** Administrators, Faculty Members, HODs, and Students

---

## 2. Technology Stack

### Backend
- **Runtime:** Node.js (v18+)
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** JWT (JSON Web Tokens)
- **Validation:** express-validator
- **File Processing:** csv-parser, pdfkit

### Frontend
- **Framework:** React 18 with Vite
- **State Management:** React Context + useReducer
- **Routing:** React Router v6
- **HTTP Client:** Axios
- **Charts:** Recharts
- **PDF Generation:** jsPDF
- **Styling:** Custom CSS with CSS Variables
- **Icons:** Lucide React

---

## 3. Database Schema Design

### User Collection
```
javascript
{
  _id: ObjectId,
  email: String (unique, required),
  password: String (hashed, required),
  firstName: String (required),
  lastName: String (required),
  role: Enum ['admin', 'faculty', 'hod', 'student'],
  department: String,
  semester: Number,
  section: String,
  enrollmentNumber: String (unique, for students),
  createdAt: Date,
  updatedAt: Date
}
```

### EvaluationScheme Collection
```
javascript
{
  _id: ObjectId,
  department: String (required),
  semester: Number (required),
  subjectCode: String (required),
  subjectName: String (required),
  components: [{
    name: String (e.g., 'Attendance', 'Quiz', 'Midterm', 'Assignment', 'Lab'),
    maxMarks: Number (required),
    weightage: Number (required, percentage),
    isOptional: Boolean (default: false)
  }],
  graceMarks: {
    maxGraceMarks: Number (default: 5),
    allowCarryOver: Boolean (default: false)
  },
  attendanceThreshold: {
    minAttendancePercentage: Number (default: 75),
    marksApplicable: Number (default: 5)
  },
  bestOfTwoLogic: {
    enabled: Boolean (default: false),
    exams: [String] (e.g., ['midterm1', 'midterm2'])
  },
  createdBy: ObjectId (ref: User),
  isActive: Boolean (default: true),
  createdAt: Date,
  updatedAt: Date
}
```

### StudentMarks Collection
```
javascript
{
  _id: ObjectId,
  studentId: ObjectId (ref: User, required),
  subjectId: ObjectId (ref: EvaluationScheme, required),
  department: String,
  semester: Number,
  section: String,
  marks: [{
    componentName: String,
    componentId: String,
    marksObtained: Number,
    maxMarks: Number,
    isAbsent: Boolean (default: false),
    is graceApplied: Boolean (default: false)
  }],
  totalMarks: Number,
  weightedMarks: Number,
  graceMarksApplied: Number (default: 0),
  attendanceBonus: Number (default: 0),
  finalMarks: Number,
  status: Enum ['calculated', 'submitted', 'approved'],
  createdAt: Date,
  updatedAt: Date
}
```

### Attendance Collection
```
javascript
{
  _id: ObjectId,
  studentId: ObjectId (ref: User, required),
  subjectId: ObjectId (ref: EvaluationScheme, required),
  totalClasses: Number,
  attendedClasses: Number,
  percentage: Number,
  month: Number,
  year: Number,
  createdAt: Date
}
```

### AuditLog Collection
```
javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User, required),
  action: String (required),
  entityType: String (required),
  entityId: ObjectId,
  oldValue: Mixed,
  newValue: Mixed,
  description: String,
  ipAddress: String,
  userAgent: String,
  timestamp: Date (default: Date.now)
}
```

---

## 4. API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user (Admin only)
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Users (Admin/HOD)
- `GET /api/users` - Get all users (with filters)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `GET /api/users/students` - Get all students

### Evaluation Schemes (Admin)
- `GET /api/schemes` - Get all schemes
- `GET /api/schemes/:id` - Get scheme by ID
- `POST /api/schemes` - Create new scheme
- `PUT /api/schemes/:id` - Update scheme
- `DELETE /api/schemes/:id` - Delete scheme

### Marks (Faculty/Admin)
- `GET /api/marks` - Get marks (with filters)
- `GET /api/marks/:id` - Get marks by ID
- `POST /api/marks` - Enter marks
- `POST /api/marks/bulk` - Upload marks via CSV
- `PUT /api/marks/:id` - Update marks (with audit)
- `DELETE /api/marks/:id` - Delete marks

### Attendance (Faculty)
- `GET /api/attendance` - Get attendance records
- `POST /api/attendance` - Mark attendance
- `PUT /api/attendance/:id` - Update attendance

### Analytics (Admin/HOD/Faculty)
- `GET /api/analytics/class-average` - Class average per subject
- `GET /api/analytics/subject-performance` - Subject performance
- `GET /api/analytics/attendance-distribution` - Attendance distribution
- `GET /api/analytics/student-progress` - Individual student progress

### Audit Logs (Admin)
- `GET /api/audit-logs` - Get audit logs
- `GET /api/audit-logs/export` - Export audit logs

---

## 5. User Roles & Permissions

### Admin
- Full system access
- Create/edit/delete users
- Create/edit evaluation schemes
- View all marks and analytics
- Export reports
- View audit logs

### HOD
- View all faculty and students in department
- Create/edit evaluation schemes for department
- View department analytics
- Approve marks

### Faculty
- Enter marks for assigned subjects
- Upload CSV marks
- View students in assigned subjects
- View analytics for subjects taught

### Student
- View own marks breakdown
- Download PDF report card
- View attendance records

---

## 6. Frontend Pages & Components

### Public Pages
- Login Page
- Register Page (Admin only)

### Admin Dashboard
- Overview Statistics
- User Management
- Evaluation Scheme Management
- Audit Logs Viewer

### Faculty Dashboard
- My Subjects
- Marks Entry
- CSV Upload
- Analytics

### Student Dashboard
- My Marks
- Subject-wise Breakdown
- PDF Download
- Attendance View

### Shared Components
- Sidebar Navigation
- Header with User Info
- Data Table
- Form Components
- Charts (Bar, Line, Pie)
- Modal Dialogs
- Toast Notifications

---

## 7. Calculation Engine Rules

### Weighted Marks Calculation
```
weightedMarks = Σ(componentMarksObtained / componentMaxMarks * componentWeightage)
finalMarks = weightedMarks + graceMarksApplied + attendanceBonus
```

### Grace Marks
- Max grace marks configurable per subject
- Can be applied manually by faculty
- Grace marks added to final total

### Attendance Threshold
- Configurable minimum attendance % (default: 75%)
- If below threshold, attendance bonus = 0
- If above threshold, attendance bonus = configured marks

### Best-of-Two Logic
- If enabled, takes better of two exam scores
- Applied before weighted calculation

---

## 8. Security Features

- JWT tokens with expiration
- Password hashing with bcrypt
- Role-based route protection
- Input validation on all endpoints
- SQL injection prevention (MongoDB parameterized queries)
- CORS configuration
- Rate limiting
- Audit logging for all modifications

---

## 9. Project Structure

```
internal-marks-calculation/
├── backend/
│   ├── config/
│   │   └── db.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── schemeController.js
│   │   ├── marksController.js
│   │   ├── attendanceController.js
│   │   ├── analyticsController.js
│   │   └── auditController.js
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── roleCheck.js
│   │   └── validate.js
│   ├── models/
│   │   ├── User.js
│   │   ├── EvaluationScheme.js
│   │   ├── StudentMarks.js
│   │   ├── Attendance.js
│   │   └── AuditLog.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── userRoutes.js
│   │   ├── schemeRoutes.js
│   │   ├── marksRoutes.js
│   │   ├── attendanceRoutes.js
│   │   ├── analyticsRoutes.js
│   │   └── auditRoutes.js
│   ├── utils/
│   │   ├── calculationEngine.js
│   │   ├── csvParser.js
│   │   └── pdfGenerator.js
│   ├── validators/
│   │   └── validators.js
│   ├── app.js
│   ├── server.js
│   └── .env
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── README.md
```

---

## 10. Acceptance Criteria

1. ✅ User can register and login with JWT authentication
2. ✅ Role-based access control works correctly for all roles
3. ✅ Admin can create evaluation schemes with custom components
4. ✅ Faculty can enter marks and upload via CSV
5. ✅ All marks modifications are logged in audit trail
6. ✅ Calculation engine correctly applies weightage, grace, and attendance rules
7. ✅ Students can view their marks breakdown
8. ✅ PDF report generation works correctly
9. ✅ Analytics charts display accurate data
10. ✅ All APIs are secured with validation and protection
