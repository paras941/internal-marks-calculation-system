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

## Core Concepts & Architecture

### Frontend Concepts

#### React Props
Props (properties) are used throughout the application to pass data from parent components to child components. They enable component reusability and data flow control.

**Example Usage:**
- `Layout` component receives route content as children props
- `PrivateRoute` component in `App.jsx` passes `roles` and `children` props for route protection
- Page components pass data to reusable UI components

**Key Pattern:**
```jsx
const MyComponent = ({ data, onUpdate }) => {
  // Use props for rendering and callbacks
};
```

#### React Hooks

**useState**
Used in form handling and component-level state management across the application:
- `Login.jsx`: Manages email, password, and loading state during authentication
- `Marks.jsx`: Manages marks entry form data and submission status
- `Attendance.jsx`: Manages attendance records and bulk operations

**useEffect**
Handles side effects including:
- Data fetching on component mount
- Authentication checks
- Form submissions and API calls

**useContext & useReducer**
The `AuthContext.jsx` uses `useReducer` for complex authentication state management:
- Manages `user`, `token`, `isAuthenticated`, `isLoading`, and `error` states
- Actions: `AUTH_START`, `AUTH_SUCCESS`, `AUTH_FAIL`, `LOGOUT`, `SET_LOADING`
- Provides global authentication state accessible via `useAuth()` hook throughout the application

**Context API Usage:**
- `AuthProvider` wraps the entire application in `App.jsx`
- `useAuth()` hook provides authentication state and methods to all components
- Eliminates prop drilling for authentication data

#### Component Structure
- Page components in `pages/` handle complex logic and API calls
- Layout component manages navigation and page structure
- Components receive data through props and Context API
- Services layer (`services/api.js`) handles all backend communication

### Backend Concepts

#### Middleware Architecture
Middleware functions process requests before they reach route handlers. The application uses three key middleware layers:

**1. Authentication Middleware (`middleware/auth.js`)**
- `protect`: Verifies JWT tokens and attaches user data to requests
  - Extracts Bearer token from Authorization header
  - Validates token using JWT_SECRET
  - Checks user existence and active status
  - Returns 401 Unauthorized for invalid/missing tokens
  
- `authorize(...roles)`: Role-based access control
  - Checks if authenticated user has required role
  - Returns 403 Forbidden if role doesn't match
  - Applied after `protect` middleware

**Example Route:**
```javascript
router.post('/marks', protect, authorize('admin', 'hod', 'faculty'), createMarks);
```

**2. Validation Middleware (`middleware/validate.js`)**
- Uses `express-validator` library for input validation
- Validates request body, params, and query strings
- Returns 400 Bad Request with validation errors
- Applied before controllers to ensure data integrity

**3. Role Check Middleware (`middleware/roleCheck.js`)**
- Additional authorization layer for specific role requirements
- Can enforce single or multiple role checks
- Applied to sensitive operations like user deletion or scheme updates

#### Middleware Execution Flow
1. Request arrives at Express.js server
2. Authentication middleware (`protect`) validates JWT
3. Authorization middleware (`authorize`) checks user role
4. Validation middleware checks request data
5. Route handler (controller) processes request
6. Response sent back to client

#### Controller Pattern
Controllers in `controllers/` contain business logic:
- Receive validated, authenticated requests
- Perform database operations via Mongoose models
- Handle errors using centralized error utility (`utils/controllerError.js`)
- Return structured JSON responses

#### Error Handling
Global error mapping in `utils/controllerError.js`:
- Centralized error responses
- Consistent error formats across all endpoints
- Maps database errors to user-friendly messages

### Data Flow Summary

**Frontend → Backend:**
```
Component (with props) → Service (api.js) → HTTP Request
  → Middleware (auth/validate) → Controller → Database → Response
```

**Backend → Frontend:**
```
Database → Controller → Response → Service (api.js) → Context/State → Re-render Component
```

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
