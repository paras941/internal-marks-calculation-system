# Safe Controller Patterns - Prevent 500 Errors

## Pattern 1: Always Validate req.user Early

❌ **WRONG:**
```javascript
exports.createMarks = async (req, res) => {
  try {
    // req.user might be undefined here - crashes if accessed
    const userId = req.user._id; // BOOM if req.user is null
  } catch (error) {
    res.status(500).json({ error });
  }
};
```

✅ **CORRECT:**
```javascript
const { requireUser } = require('../utils/controllerError');

exports.createMarks = async (req, res) => {
  try {
    // Validate req.user exists at START
    const user = requireUser(req);
    const userId = user._id;

    // Now safe to use userId
  } catch (error) {
    res.status(500).json({ error });
  }
};
```

---

## Pattern 2: Handle Async DB Operations Properly

❌ **WRONG:**
```javascript
exports.createMarks = async (req, res) => {
  try {
    const marks = new StudentMarks({...});
    await marks.save();

    // This is NOT in try-catch - if it fails, server crashes
    await AuditLog.create({
      userId: req.user._id,
      ...
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error });
  }
};
```

✅ **CORRECT:**
```javascript
exports.createMarks = async (req, res) => {
  try {
    const marks = new StudentMarks({...});
    await marks.save();

    res.json({ success: true });

    // Fire-and-forget audit logging (doesn't crash response)
    AuditLog.create({...}).catch(err => {
      console.error('[CREATE_MARKS] Audit log failed (non-critical):', err.message);
    });

  } catch (error) {
    res.status(500).json({ error });
  }
};
```

---

## Pattern 3: Prevent Double Response Errors

❌ **WRONG:**
```javascript
exports.updateMarks = async (req, res) => {
  try {
    const marks = await StudentMarks.findById(req.params.id);

    if (!marks) {
      res.status(404).json({ error: 'Not found' });
      // Forgot return! Code continues...
    }

    marks.status = 'updated';
    await marks.save();

    res.json({ success: true }); // CRASH: Double response!

  } catch (error) {
    res.status(500).json({ error });
  }
};
```

✅ **CORRECT:**
```javascript
exports.updateMarks = async (req, res) => {
  try {
    const marks = await StudentMarks.findById(req.params.id);

    if (!marks) {
      return res.status(404).json({ error: 'Not found' }); // return!
    }

    marks.status = 'updated';
    await marks.save();

    return res.json({ success: true }); // return!

  } catch (error) {
    res.status(500).json({ error });
  }
};
```

---

## Pattern 4: Validate Request Body Safely

❌ **WRONG:**
```javascript
exports.createAttendance = async (req, res) => {
  const { studentId, subjectId } = req.body; // What if req.body is null?

  const total = parseInt(req.body.totalClasses); // parseInt(undefined) = NaN

  if (total > 100) { // NaN > 100 = false, but maybe not what you expect
    ...
  }
};
```

✅ **CORRECT:**
```javascript
exports.createAttendance = async (req, res) => {
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({ error: 'Request body required' });
  }

  const { studentId, subjectId, totalClasses, attendedClasses } = req.body;

  // Validate required fields
  if (!studentId || !subjectId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const total = Number(totalClasses);
  const attended = Number(attendedClasses);

  // Validate types
  if (!Number.isFinite(total) || !Number.isFinite(attended)) {
    return res.status(400).json({ error: 'Invalid numbers' });
  }
};
```

---

## Pattern 5: Handle calculateMarks() Errors

❌ **WRONG:**
```javascript
const calculated = await calculateMarks(studentMarks, scheme);

// If calculateMarks throws, ENTIRE REQUEST crashes
studentMarks.totalMarks = calculated.totalMarks;
```

✅ **CORRECT:**
```javascript
let calculated;
try {
  calculated = await calculateMarks(studentMarks, scheme);
} catch (calcError) {
  console.error('[CREATE_MARKS] Calculation failed:', {
    studentId,
    subjectId,
    error: calcError.message
  });

  // Provide detailed error instead of 500
  return res.status(400).json({
    success: false,
    message: 'Failed to calculate marks: ' + calcError.message
  });
}

studentMarks.totalMarks = calculated.totalMarks;
```

---

## Pattern 6: Safe ObjectId Validation

❌ **WRONG:**
```javascript
const isValid = mongoose.Types.ObjectId.isValid(studentId);
// If studentId is null/undefined, this might return true sometimes!

if (!isValid) {
  return res.status(400).json({ ... });
}

const student = await User.findById(studentId); // Can still throw CastError
```

✅ **CORRECT:**
```javascript
const { validateObjectId } = require('../utils/controllerError');

if (!studentId || !validateObjectId(studentId)) {
  return res.status(400).json({
    error: 'Invalid student ID format'
  });
}

const student = await User.findById(studentId);
if (!student) {
  return res.status(404).json({
    error: 'Student not found'
  });
}
```

---

## Pattern 7: Handle Populate() Errors

❌ **WRONG:**
```javascript
const mark = await StudentMarks.findById(id)
  .populate('studentId')
  .populate('subjectId');

// If populate fails (invalid ref), error not caught
console.log(mark.studentId.email); // Might be null, crashes
```

✅ **CORRECT:**
```javascript
const mark = await StudentMarks.findById(id)
  .populate('studentId', 'firstName lastName enrollmentNumber email')
  .populate('subjectId', 'subjectCode subjectName components');

if (!mark?.studentId) {
  return res.status(400).json({
    error: 'Student reference is invalid'
  });
}

const email = mark.studentId.email; // Safe now
```

---

## Pattern 8: Wrap Utility Functions

If you call a utility function that can throw:

❌ **WRONG:**
```javascript
const csv = generateCSVTemplate(scheme); // What if scheme is null?
res.setHeader('Content-Type', 'text/csv');
res.send(csv); // Crash if csv generation failed
```

✅ **CORRECT:**
```javascript
let csv;
try {
  csv = generateCSVTemplate(scheme);
  if (!csv) {
    return res.status(400).json({
      error: 'Failed to generate template'
    });
  }
} catch (templateError) {
  console.error('[TEMPLATE_ERROR]:', templateError.message);
  return res.status(400).json({
    error: 'Template generation failed'
  });
}

res.setHeader('Content-Type', 'text/csv');
res.send(csv);
```

---

## Summary: The Golden Rules

1. ✅ Always check `req.user` exists at the START
2. ✅ Always `return` after sending a response
3. ✅ Always validate `req.body` is an object
4. ✅ Always validate ObjectIds BEFORE database queries
5. ✅ Always wrap utility function calls in try-catch
6. ✅ Always check populated references aren't null
7. ✅ Always log errors with context (userId, itemId, etc)
8. ✅ Fire-and-forget non-critical operations (audit logs)

---

## Quick Test After Changes

```bash
# These should all return meaningful 400-404, NOT 500
curl -X POST http://localhost:5000/api/marks \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}' # Should be 400, not 500

curl -X POST http://localhost:5000/api/marks \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "invalid",
    "subjectId": "invalid",
    "marks": []
  }' # Should be 400, not 500
```
