<div align="center">

# Internal Marks Calculation System

A comprehensive full-stack academic management system for calculating, managing, and reporting student internal marks with role-based access control, automated calculations, and audit logging.

**Built with Node.js, Express, MongoDB, and React**

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.18-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-9.2-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)

</div>

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [User Roles & Permissions](#user-roles--permissions)
- [Calculation Engine](#calculation-engine)
- [Security](#security)

---

## Features

### Authentication & Authorization
- JWT-based authentication with role-based access control
- Four user roles: **Admin**, **Faculty**, **HOD**, **Student**
- Password strength validation and secure hashing with bcrypt
- Session persistence with token auto-refresh

### Evaluation & Marks
- Dynamic evaluation scheme creation with customizable components (attendance, quiz, midterm, assignment, lab)
- Automatic weighted marks calculation with support for:
  - Grace marks
  - Attendance threshold rules
  - Best-of-two exam logic
- CSV bulk upload for marks entry
- Marks approval workflow (draft &rarr; calculated &rarr; submitted &rarr; approved)
- Result locking mechanism (Admin/HOD can lock finalized marks)
- Version history tracking with rollback support

### Dashboards
| Role | Capabilities |
|------|-------------|
| **Admin** | Full system overview, user management, audit logs |
| **Faculty** | Enter/upload marks, view analytics for assigned subjects |
| **HOD** | Department-wide analytics, scheme management, marks approval |
| **Student** | View marks breakdown, download PDF report card |

### Analytics & Reporting
- Interactive charts powered by Recharts (bar, line, pie)
- Class average, subject performance, and attendance distribution
- PDF report card generation with jsPDF
- Complete audit trail with export capability

---

## Tech Stack

### Backend

| Technology | Purpose |
|-----------|---------|
| **Node.js** | Runtime environment |
| **Express.js** | Web framework |
| **MongoDB + Mongoose** | Database & ODM |
| **JWT** | Authentication tokens |
| **bcryptjs** | Password hashing |
| **express-validator** | Input validation |
| **multer** | File upload (CSV) |
| **pdfkit** | Server-side PDF generation |
| **csv-parser** | CSV file processing |

### Frontend

| Technology | Purpose |
|-----------|---------|
| **React 18** | UI framework |
| **Vite** | Build tool & dev server |
| **React Router v6** | Client-side routing |
| **Axios** | HTTP client |
| **Recharts** | Data visualization |
| **jsPDF** | Client-side PDF generation |
| **Lucide React** | Icon library |
| **CSS Variables** | Custom design system |

---

## Project Structure

```
internal-marks-calculation-system/
├── backend/
│   ├── config/
│   │   └── db.js                    # MongoDB connection
│   ├── controllers/
│   │   ├── authController.js        # Login, register, logout
│   │   ├── userController.js        # User CRUD operations
│   │   ├── schemeController.js      # Evaluation scheme management
│   │   ├── marksController.js       # Marks entry & management
│   │   ├── attendanceController.js  # Attendance tracking
│   │   ├── analyticsController.js   # Analytics & reporting
│   │   └── auditController.js       # Audit log management
│   ├── middleware/
│   │   ├── auth.js                  # JWT verification & role check
│   │   ├── roleCheck.js             # Department-level access control
│   │   └── validate.js              # Request validation
│   ├── models/
│   │   ├── User.js                  # User schema
│   │   ├── EvaluationScheme.js      # Scheme schema
│   │   ├── StudentMarks.js          # Student marks schema
│   │   ├── Attendance.js            # Attendance schema
│   │   └── AuditLog.js              # Audit log schema
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── userRoutes.js
│   │   ├── schemeRoutes.js
│   │   ├── marksRoutes.js
│   │   ├── attendanceRoutes.js
│   │   ├── analyticsRoutes.js
│   │   └── auditRoutes.js
│   ├── utils/
│   │   ├── calculationEngine.js     # Marks calculation logic
│   │   ├── csvParser.js             # CSV file processing
│   │   └── pdfGenerator.js          # PDF report generation
│   ├── validators/
│   │   └── validators.js
│   ├── app.js                       # Express app setup
│   ├── server.js                    # Server entry point
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── Layout.jsx           # Sidebar & header layout
│   │   ├── context/
│   │   │   └── AuthContext.jsx       # Auth state management
│   │   ├── pages/
│   │   │   ├── Login.jsx            # Authentication page
│   │   │   ├── Dashboard.jsx        # Home dashboard
│   │   │   ├── Users.jsx            # User management
│   │   │   ├── Schemes.jsx          # Evaluation schemes
│   │   │   ├── Marks.jsx            # Marks entry
│   │   │   ├── Attendance.jsx       # Attendance tracking
│   │   │   ├── Analytics.jsx        # Charts & analytics
│   │   │   ├── AuditLogs.jsx        # Audit log viewer
│   │   │   └── StudentMarks.jsx     # Student marks view
│   │   ├── services/
│   │   │   └── api.js               # Axios API client
│   │   ├── App.jsx                  # Root component & routing
│   │   ├── main.jsx                 # React entry point
│   │   └── index.css                # Global styles & design system
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── SPEC.md
├── TODO.md
└── README.md
```

---

## Getting Started

### Prerequisites

- **Node.js** v18 or higher
- **MongoDB** (local instance or [MongoDB Atlas](https://www.mongodb.com/atlas))
- **npm** or **yarn**

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/internal-marks-calculation-system.git
cd internal-marks-calculation-system
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` directory (see [Environment Variables](#environment-variables)):

```env
MONGODB_URI=mongodb+srv://your-connection-string
JWT_SECRET=your-secret-key
JWT_EXPIRE=7d
PORT=5000
```

Start the backend server:

```bash
npm run dev
```

> Backend runs at `http://localhost:5001`

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

> Frontend runs at `http://localhost:3000` with API proxy to the backend

### 4. Create Your First User

Register a user through the registration form on the login page, or create one directly via the API:

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Admin",
    "lastName": "User",
    "email": "admin@example.com",
    "password": "admin123",
    "role": "admin",
    "department": "CS"
  }'
```

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | *required* |
| `JWT_SECRET` | Secret key for JWT signing | *required* |
| `JWT_EXPIRE` | Token expiration time | `7d` |
| `PORT` | Backend server port | `5000` |

---

## API Reference

### Authentication

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `POST` | `/api/auth/register` | Public | Register new user |
| `POST` | `/api/auth/login` | Public | User login |
| `POST` | `/api/auth/logout` | Protected | User logout |
| `GET` | `/api/auth/me` | Protected | Get current user |

### Users

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/api/users` | Admin, HOD | Get all users |
| `GET` | `/api/users/students` | Admin, Faculty, HOD | Get all students |
| `GET` | `/api/users/:id` | Protected | Get user by ID |
| `PUT` | `/api/users/:id` | Protected | Update user |
| `DELETE` | `/api/users/:id` | Admin | Delete user |

### Evaluation Schemes

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/api/schemes` | Protected | Get all schemes |
| `GET` | `/api/schemes/:id` | Protected | Get scheme by ID |
| `POST` | `/api/schemes` | Admin, HOD | Create scheme |
| `PUT` | `/api/schemes/:id` | Admin, HOD | Update scheme |
| `DELETE` | `/api/schemes/:id` | Admin, HOD | Delete scheme |

### Marks

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/api/marks` | Protected | Get marks (with filters) |
| `GET` | `/api/marks/:id` | Protected | Get marks by ID |
| `POST` | `/api/marks` | Faculty, HOD | Enter marks |
| `POST` | `/api/marks/bulk` | Faculty, HOD | Upload marks via CSV |
| `PUT` | `/api/marks/:id` | Faculty, HOD | Update marks |
| `DELETE` | `/api/marks/:id` | Admin | Delete marks |
| `POST` | `/api/marks/recalculate/:id` | Faculty, HOD | Recalculate marks |
| `PUT` | `/api/marks/approve/:id` | HOD | Approve marks |

### Attendance

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/api/attendance` | Protected | Get attendance records |
| `POST` | `/api/attendance` | Faculty, HOD | Mark attendance |
| `POST` | `/api/attendance/bulk` | Faculty, HOD | Bulk mark attendance |
| `GET` | `/api/attendance/summary/:id` | Protected | Student attendance summary |

### Analytics

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/api/analytics/dashboard` | Protected | Dashboard statistics |
| `GET` | `/api/analytics/class-average` | Protected | Class average per subject |
| `GET` | `/api/analytics/subject-performance` | Protected | Subject performance data |
| `GET` | `/api/analytics/attendance-distribution` | Protected | Attendance distribution |
| `GET` | `/api/analytics/student-progress/:id` | Protected | Individual student progress |

### Audit Logs

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/api/audit-logs` | Admin | Get audit logs |
| `GET` | `/api/audit-logs/export` | Admin | Export audit logs |

---

## User Roles & Permissions

### Admin
- Full system access
- Create, edit, and delete users
- Create and manage evaluation schemes
- View all marks and analytics across departments
- Export reports and view audit logs

### HOD (Head of Department)
- View all faculty and students in their department
- Create and edit evaluation schemes for their department
- View department-wide analytics
- Approve submitted marks

### Faculty
- Enter marks for assigned subjects
- Upload marks via CSV bulk import
- View students in assigned subjects
- View analytics for subjects they teach

### Student
- View own marks breakdown by subject and component
- Download PDF report card
- View attendance records

---

## Calculation Engine

The marks calculation engine applies the following formula:

```
weightedMarks = SUM(marksObtained / maxMarks * componentWeightage)
finalMarks    = weightedMarks + graceMarks + attendanceBonus
```

### Rules

| Rule | Description |
|------|-------------|
| **Weighted Marks** | Each component's marks are converted to a percentage and multiplied by its weightage |
| **Grace Marks** | Configurable per subject (default max: 5), manually applied by faculty |
| **Attendance Bonus** | Awarded if attendance >= threshold (default: 75%), configurable bonus marks |
| **Best-of-Two** | When enabled, takes the higher score from two specified exams |
| **Final Cap** | Final marks are capped at 100 |

---

## Security

- **JWT tokens** with configurable expiration
- **Password hashing** with bcryptjs (10 salt rounds)
- **Role-based route protection** at middleware level
- **Input validation** on all endpoints via express-validator
- **Parameterized queries** preventing NoSQL injection
- **CORS** configuration
- **Audit logging** for all data modifications (who, what, when, old value, new value)
- **Account deactivation** mechanism via `isActive` flag

---

<div align="center">

**Internal Marks Calculation System** &mdash; Built for academic excellence

</div>
