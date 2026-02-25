# Internal Marks Calculation System

A full-stack Internal Marks Calculation System built with Node.js, Express, MongoDB, and React.

## Features

- **JWT-based Authentication** with role-based authorization (Admin, Faculty, HOD, Student)
- **Dynamic Evaluation Scheme Creation** - Admin can define components (attendance, quiz, midterm, assignment, lab) with customizable weightage
- **Automatic Weighted Marks Calculation** with support for:
  - Grace marks
  - Attendance threshold rules
  - Best-of-two exam logic
- **Faculty Dashboard**:
  - Enter marks
  - Upload marks via CSV
  - Edit marks with audit logging
- **Student Dashboard**:
  - View internal marks breakdown
  - Download PDF report card
- **Analytics Dashboard** with charts:
  - Class average
  - Subject performance
  - Attendance distribution
- **Audit Logging System** tracking:
  - Who modified marks
  - Old value
  - New value
  - Timestamp

## Tech Stack

### Backend
- Node.js
- Express.js
- MongoDB with Mongoose
- JWT Authentication
- express-validator

### Frontend
- React 18 with Vite
- React Router v6
- Axios
- Recharts
- jsPDF

## Project Structure

```
internal-marks-calculation/
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── utils/
│   ├── validators/
│   ├── app.js
│   └── server.js
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   └── package.json
├── SPEC.md
├── TODO.md
└── README.md
```

## Getting Started

### Prerequisites

- Node.js (v18+)
- MongoDB (local or cloud instance)

### Backend Setup

1. Navigate to the backend directory:
   
```
bash
   cd backend
   
```

2. Install dependencies:
   
```
bash
   npm install
   
```

3. Configure environment variables:
   - Edit `.env` file with your MongoDB URI and JWT secret

4. Start the server:
   
```
bash
   npm run dev
   
```

The backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
   
```
bash
   cd frontend
   
```

2. Install dependencies:
   
```
bash
   npm install
   
```

3. Start the development server:
   
```
bash
   npm run dev
   
```

The frontend will run on `http://localhost:3000`

### Default Admin User

After starting the server, create an admin user through the registration endpoint or directly in MongoDB.

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user (Admin only)
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `GET /api/users/students` - Get all students

### Evaluation Schemes
- `GET /api/schemes` - Get all schemes
- `POST /api/schemes` - Create new scheme
- `PUT /api/schemes/:id` - Update scheme
- `DELETE /api/schemes/:id` - Delete scheme

### Marks
- `GET /api/marks` - Get marks
- `POST /api/marks` - Enter marks
- `POST /api/marks/bulk` - Upload marks via CSV
- `PUT /api/marks/:id` - Update marks
- `DELETE /api/marks/:id` - Delete marks

### Attendance
- `GET /api/attendance` - Get attendance records
- `POST /api/attendance` - Mark attendance
- `POST /api/attendance/bulk` - Bulk mark attendance

### Analytics
- `GET /api/analytics/class-average` - Class average per subject
- `GET /api/analytics/subject-performance` - Subject performance
- `GET /api/analytics/attendance-distribution` - Attendance distribution
- `GET /api/analytics/dashboard` - Dashboard statistics

### Audit Logs
- `GET /api/audit-logs` - Get audit logs
- `GET /api/audit-logs/export` - Export audit logs

## User Roles

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
- view marks


