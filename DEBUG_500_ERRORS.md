# Debugging 500 Errors - Step-by-Step Guide

## 1. Test Server Startup & DB Connection

```bash
npm start
# Watch console for:
# ✅ JWT_SECRET loaded: true
# ✅ MongoDB URI configured
# Server running on port 5000
# ✅ MongoDB connected
```

**If you see errors here, the issue is:**
- Missing `.env` variables
- MongoDB not running
- Wrong connection string

---

## 2. Test Authentication & req.user

```bash
# Get a token first
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password123"
  }'

# Should return: { token: "jwt_token_here", ... }

# Test with token on protected route
curl -X GET http://localhost:5000/api/marks \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Check console logs for "[CREATE_MARKS] Request received"
# If you see "requestedBy: null", req.user is undefined
```

**Logs to watch for:**
- `[GLOBAL_ERROR_HANDLER] Caught error`
- `userId: unknown` = req.user not set
- Any reference errors

---

## 3. **Test Creating Marks** (Likely Failing Endpoint)

```bash
# First, get valid IDs by running getMarks
curl -X GET http://localhost:5000/api/marks \
  -H "Authorization: Bearer YOUR_TOKEN"

# Use real student and subject IDs from existing data

curl -X POST http://localhost:5000/api/marks \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "ACTUAL_STUDENT_ID_HERE",
    "subjectId": "ACTUAL_SUBJECT_ID_HERE",
    "marks": [
      {
        "componentId": "COMPONENT_ID_FROM_SCHEME",
        "marksObtained": 45,
        "isAbsent": false
      }
    ]
  }'
```

**Expected console output:**
```
[CREATE_MARKS] Request received {
  requestedBy: '507f1f77bcf86cd799439011',  // Should NOT be null
  bodyKeys: [ 'studentId', 'subjectId', 'marks' ],
  ip: '::1'
}

[CREATE_MARKS] Marks saved successfully {
  marksId: '...',
  studentId: '...',
  subjectId: '...',
  action: 'CREATE'
}
```

---

## 4. Isolate the Issue: Server → Middleware → DB → Controller

### A. Test Server Health
```bash
curl http://localhost:5000/api/health
# Should return: { status: 'ok', message: '...' }
```

### B. Test Auth Middleware
```bash
# Request WITHOUT token - should get 401
curl -X GET http://localhost:5000/api/marks

# Request with INVALID token - should get 401
curl -X GET http://localhost:5000/api/marks \
  -H "Authorization: Bearer invalid_token_here"

# If you get 500 instead of 401, auth middleware is crashing
```

### C. Test Database Operations
```bash
# In server console (server.js tracks DB connection):
# Check console for database connection status

node -e "
const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI).then(() => {
  console.log('✅ DB Connected');
  process.exit(0);
}).catch(err => {
  console.error('❌ DB failed:', err.message);
  process.exit(1);
});
"
```

### D. Test Empty Body Handling
```bash
# Test what happens with no body
curl -X POST http://localhost:5000/api/marks \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'

# Should get 400 with validation error, NOT 500
```

---

## 5. Check Specific Error Scenarios

### Missing Fields Error
```bash
curl -X POST http://localhost:5000/api/marks \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "507f1f77bcf86cd799439011"
    # Missing subjectId and marks
  }'

# Should return 400: "Missing required fields: subjectId, marks"
# If 500, the field check is throwing an unhandled error
```

### Invalid StudentId Error
```bash
curl -X POST http://localhost:5000/api/marks \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "invalid_id",
    "subjectId": "569f1f77bcf86cd799439011",
    "marks": [
      {
        "componentId": "569f1f77bcf86cd799439011",
        "marksObtained": 45
      }
    ]
  }'

# Should return 400: "Invalid student ID"
# If 500, the ObjectId validation is crashing
```

---

## 6. Check Async/Await Handling in calculateMarks

**If tests pass until marks calculation:**

Add this to marksController.js at line 278:

```javascript
console.log('[CREATE_MARKS] Before calculateMarks', {
  studentId,
  marks: normalizedMarks.length,
  schemeId: scheme._id
});

try {
  const calculated = await calculateMarks(studentMarks, scheme);
  console.log('[CREATE_MARKS] After calculateMarks', {
    totalMarks: calculated.totalMarks,
    finalMarks: calculated.finalMarks
  });
} catch (calcError) {
  console.error('[CREATE_MARKS] calculateMarks failed', {
    error: calcError.message,
    stack: calcError.stack
  });
  throw calcError;
}
```

---

## 7. Console Log Checklist for Root Cause

When you get a 500 error, check console for ONE of these:

| Log Pattern | Meaning |
|---|---|
| `[GLOBAL_ERROR_HANDLER] Caught error` → `errorName: 'CastError'` | Invalid ObjectId somewhere |
| `userId: unknown` | req.user is null (auth issue) |
| `TypeError: Cannot read property 'xxx' of undefined` | Accessing property on undefined |
| `MongooseServerSelectionError` | Can't connect to MongoDB |
| `ValidationError` | Schema validation failed |
| `No logs at all` | Request never reached server (check network) |

---

## 8. Quick Test All Endpoints

```bash
# Set TOKEN to your JWT
TOKEN="your_jwt_here"

echo "Testing /api/health..."
curl -s http://localhost:5000/api/health | jq .

echo "Testing GET /api/marks..."
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/marks | jq .

echo "Testing GET /api/users..."
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/users | jq .

echo "Testing POST /api/attendance..."
curl -s -X POST http://localhost:5000/api/attendance \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}' | jq .
```

---

## 9. If Still Getting 500s

1. **Check for typos in env vars:**
   ```bash
   cat backend/.env | grep JWT_SECRET
   cat backend/.env | grep MONGODB_URI
   ```

2. **Check logs are actually printing:**
   ```bash
   # Add this at top of server.js (after dotenv.config())
   console.log('🚀 Server starting...');
   console.log('ENV JWT_SECRET:', !!process.env.JWT_SECRET);
   console.log('ENV MONGODB_URI:', process.env.MONGODB_URI?.substring(0, 20));
   ```

3. **Run with verbose logging:**
   ```bash
   DEBUG=* npm start
   ```

4. **Check Database Connection Test:**
   ```javascript
   // Create test-db.js
   const mongoose = require('mongoose');
   require('dotenv').config();

   async function test() {
     try {
       await mongoose.connect(process.env.MONGODB_URI);
       console.log('✅ Connected!');
       const collections = await mongoose.connection.db.listCollections().toArray();
       console.log('Collections:', collections.map(c => c.name));
     } catch (err) {
       console.error('❌ Error:', err.message);
     }
   }
   test();
   ```

---

## Key Changes Made:

1. ✅ All routes now use `asyncHandler()` to catch thrown errors
2. ✅ Global error handler prevents double responses
3. ✅ Better error logging with user context
4. ✅ Added `requireUser()` validation helper
5. ✅ Fixed undefined property access issues

Test these changes and the 500 errors should be resolved!
