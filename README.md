# Internal Marks Calculation System

A full-stack academic management platform for managing internal assessment workflows, attendance, analytics, and audit-compliant grade operations.

## Overview

The Internal Marks Calculation System is designed for institutions that need structured, role-based control over internal evaluation.

It supports:
- User and role management (Admin, HOD, Faculty, Student)
- Department and semester-based evaluation schemes
- Component-wise marks entry and weighted calculation
- Attendance tracking and bonus application
- Analytics dashboards for performance insights
- Audit logging for traceability

## Core Capabilities

### Role-based access control
- JWT-protected API with middleware-level authorization
- Fine-grained route access by role
- Active/inactive user account enforcement

### Evaluation and marks lifecycle
- Configurable schemes with weighted components
- Marks status workflow (calculate, submit, approve)
- CSV template download and bulk upload support
- Recalculation endpoint for subject-level recalculation

### Attendance and reporting
- Attendance record creation and bulk operations
- Student attendance summary endpoints
- Dashboard and analytical data endpoints

### Auditability
- Audit logs for critical actions
- Export and entity-level audit log retrieval

## Tech Stack

### Backend
- Node.js
- Express.js
- MongoDB with Mongoose
- JWT authentication
- express-validator
- multer (CSV upload)
- pdfkit

### Frontend
- React 18
- Vite
- React Router v6
- Axios
- Recharts
- jsPDF

## Repository Structure

```text
internal-marks-calculation-system-main/
|-- backend/
|   |-- api/
|   |-- config/
|   |-- controllers/
|   |-- middleware/
|   |-- models/
|   |-- routes/
|   |-- scripts/
|   |-- utils/
|   |-- validators/
|   |-- app.js
|   |-- server.js
|   `-- package.json
|-- frontend/
|   |-- src/
|   |   |-- components/
|   |   |-- context/
|   |   |-- pages/
|   |   `-- services/
|   |-- index.html
|   |-- vite.config.js
|   `-- package.json
|-- SPEC.md
`-- README.md
```

## Getting Started

### Prerequisites
- Node.js 18+
- npm 9+
- MongoDB (local or Atlas)

### 1) Install dependencies

Backend:

```bash
cd backend
npm install
```

Frontend:

```bash
cd frontend
npm install
```

### 2) Configure environment variables

Create `backend/.env`:

```env
PORT=5000
MONGODB_URI=<your-mongodb-connection-string>
JWT_SECRET=<your-jwt-secret>
JWT_EXPIRE=7d
```

Create `frontend/.env` (recommended):

```env
VITE_API_URL=http://localhost:5000/api
```

For local development, point the frontend at the backend API running on port 5000.

### 3) Run the application

Start backend:

```bash
cd backend
npm run dev
```

Start frontend:

```bash
cd frontend
npm run dev
```

Default local URLs:
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000`
- Health check: `http://localhost:5000/api/health`

## Seed Demo Data

The backend includes a script to seed demo users, schemes, marks, and attendance.

```bash
cd backend
npm run seed:demo
```

Default demo password:
- `Demo@123`

Sample demo accounts:
- `demo.admin@imcs.com`
- `demo.hod@imcs.com`
- `demo.faculty@imcs.com`
- `demo.student1@imcs.com`

## Available Scripts

### Backend (`backend/package.json`)
- `npm run dev` - Run API with nodemon
- `npm start` - Run API with Node.js
- `npm run seed:demo` - Seed demo dataset
- `npm run vercel-start` - Start Vercel API entry

### Frontend (`frontend/package.json`)
- `npm run dev` - Start Vite dev server
- `npm run build` - Build production bundle
- `npm run preview` - Preview production build

## API Overview

Base path: `/api`

### Auth
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`

### Users
- `GET /users`
- `GET /users/students`
- `GET /users/faculty`
- `GET /users/:id`
- `PUT /users/:id`
- `DELETE /users/:id`

### Evaluation schemes
- `GET /schemes`
- `GET /schemes/faculty/my-subjects`
- `GET /schemes/:id`
- `POST /schemes`
- `PUT /schemes/:id`
- `DELETE /schemes/:id`

### Marks
- `GET /marks`
- `GET /marks/:id`
- `POST /marks`
- `PUT /marks/:id`
- `DELETE /marks/:id`
- `POST /marks/bulk`
- `GET /marks/template/:subjectId`
- `POST /marks/recalculate/:subjectId`
- `PUT /marks/submit/:id`
- `PUT /marks/approve/:id`

### Attendance
- `GET /attendance`
- `POST /attendance`
- `POST /attendance/bulk`
- `GET /attendance/summary/:studentId`

### Analytics
- `GET /analytics/dashboard`
- `GET /analytics/class-average`
- `GET /analytics/subject-performance`
- `GET /analytics/attendance-distribution`
- `GET /analytics/student-progress/:studentId?`

### Audit logs
- `GET /audit-logs`
- `GET /audit-logs/export`
- `GET /audit-logs/entity/:entityType/:entityId`

For full request/response details, refer to `SPEC.md` and route/controller source files.

## Security Notes

- JWT-based authentication with protected middleware
- Role-based authorization checks at route level
- Validation middleware for request payloads
- Password hashing using bcryptjs
- Dedicated global error mapping and centralized error handling

## Deployment Notes

Backend includes Vercel configuration under `backend/vercel.json` with API entry at `backend/api/index.js`.

Ensure environment variables are set in your deployment platform:
- `MONGODB_URI`
- `JWT_SECRET`
- `JWT_EXPIRE`
- `PORT` (if applicable)

## License

This project is licensed under the MIT License. See `LICENSE` for details.
