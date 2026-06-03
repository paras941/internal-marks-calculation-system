import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Area,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis
} from 'recharts';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  Download,
  FileSpreadsheet,
  Filter,
  GraduationCap,
  RotateCcw,
  School,
  Sparkles,
  TrendingUp,
  Users,
  Waves
} from 'lucide-react';
import { attendanceAPI, marksAPI, schemesAPI } from '../services/api';

const CHART_COLORS = ['#1d4ed8', '#0f766e', '#ea580c', '#7c3aed', '#be123c', '#0891b2', '#16a34a'];
const GRADE_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#0f766e'];

const currentYear = new Date().getFullYear();
const academicYears = Array.from({ length: 6 }, (_, index) => String(currentYear - 3 + index));

const initialFilters = {
  department: '',
  semester: '',
  subjectId: '',
  year: String(currentYear)
};

const safeNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const roundOne = (value) => Math.round((safeNumber(value) + Number.EPSILON) * 10) / 10;

const normalizeId = (value) => {
  if (!value) {
    return '';
  }

  if (typeof value === 'object' && value._id) {
    return String(value._id);
  }

  return String(value);
};

const getStudentName = (record) => {
  if (!record?.studentId) {
    return 'Unknown Student';
  }

  if (typeof record.studentId === 'object') {
    const firstName = record.studentId.firstName || '';
    const lastName = record.studentId.lastName || '';
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || record.studentId.enrollmentNumber || 'Unknown Student';
  }

  return String(record.studentId);
};

const getSubjectLabel = (record) => {
  if (!record?.subjectId) {
    return 'Unknown Subject';
  }

  if (typeof record.subjectId === 'object') {
    return `${record.subjectId.subjectCode || ''} ${record.subjectId.subjectName || ''}`.trim() || 'Unknown Subject';
  }

  return String(record.subjectId);
};

const getSubjectCode = (record) => {
  if (typeof record?.subjectId === 'object') {
    return record.subjectId.subjectCode || 'SUB';
  }

  return 'SUB';
};

const getGrade = (marks) => {
  const score = safeNumber(marks);

  if (score >= 90) return 'O';
  if (score >= 80) return 'A+';
  if (score >= 70) return 'A';
  if (score >= 60) return 'B+';
  if (score >= 50) return 'B';
  if (score >= 40) return 'C';
  if (score >= 35) return 'D';
  return 'F';
};

const getDistributionBand = (percentage) => {
  const score = safeNumber(percentage);

  if (score >= 90) return '90-100';
  if (score >= 80) return '80-89';
  if (score >= 70) return '70-79';
  if (score >= 60) return '60-69';
  if (score >= 50) return '50-59';
  if (score >= 40) return '40-49';
  return 'Below 40';
};

const getMarksHeatColor = (value) => {
  const score = Math.max(0, Math.min(100, safeNumber(value)));

  if (score >= 85) return 'rgba(29, 78, 216, 0.28)'; // blue
  if (score >= 70) return 'rgba(15, 118, 110, 0.26)'; // teal
  if (score >= 55) return 'rgba(234, 179, 8, 0.26)'; // amber
  if (score >= 40) return 'rgba(249, 115, 22, 0.26)'; // orange
  return 'rgba(239, 68, 68, 0.28)'; // red
};

const getAttendanceHeatColor = (value) => {
  const score = Math.max(0, Math.min(100, safeNumber(value)));

  if (score >= 90) return 'rgba(16, 185, 129, 0.28)'; // green
  if (score >= 80) return 'rgba(59, 130, 246, 0.26)'; // blue
  if (score >= 70) return 'rgba(234, 179, 8, 0.26)'; // amber
  if (score >= 60) return 'rgba(249, 115, 22, 0.26)'; // orange
  return 'rgba(239, 68, 68, 0.28)'; // red
};

const formatMarks = (value) => (Number.isFinite(Number(value)) ? roundOne(value).toFixed(1) : '0.0');

const formatPercentage = (value) => `${roundOne(value)}%`;

const formatScope = (filters, subjectLabel) => {
  const segments = [
    filters.department ? `Department ${filters.department}` : 'All Departments',
    filters.semester ? `Semester ${filters.semester}` : 'All Semesters',
    subjectLabel || 'All Subjects',
    filters.year ? `AY ${filters.year}` : 'All Years'
  ];

  return segments.join(' • ');
};

const groupAverage = (items, keyResolver, valueResolver) => {
  const buckets = new Map();

  items.forEach((item) => {
    const key = keyResolver(item);
    if (key === '') {
      return;
    }

    const bucket = buckets.get(key) || { total: 0, count: 0 };
    bucket.total += safeNumber(valueResolver(item));
    bucket.count += 1;
    buckets.set(key, bucket);
  });

  return buckets;
};

const buildScatterStats = (points) => {
  if (points.length < 2) {
    return 0;
  }

  const meanMarks = points.reduce((sum, point) => sum + point.marks, 0) / points.length;
  const meanAttendance = points.reduce((sum, point) => sum + point.attendance, 0) / points.length;

  let numerator = 0;
  let markVariance = 0;
  let attendanceVariance = 0;

  points.forEach((point) => {
    const markDelta = point.marks - meanMarks;
    const attendanceDelta = point.attendance - meanAttendance;
    numerator += markDelta * attendanceDelta;
    markVariance += markDelta * markDelta;
    attendanceVariance += attendanceDelta * attendanceDelta;
  });

  const denominator = Math.sqrt(markVariance * attendanceVariance);

  return denominator > 0 ? numerator / denominator : 0;
};

function Analytics() {
  const [filters, setFilters] = useState(initialFilters);
  const [schemes, setSchemes] = useState([]);
  const [marks, setMarks] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');

  useEffect(() => {
    const loadSchemes = async () => {
      try {
        const response = await schemesAPI.getAll();
        setSchemes(response.data.data || []);
      } catch (schemeError) {
        setError(schemeError?.response?.data?.message || 'Failed to load evaluation schemes');
      }
    };

    loadSchemes();
  }, []);

  useEffect(() => {
    const loadAnalytics = async () => {
      setLoading(true);
      setError('');

      try {
        const marksParams = {};
        if (filters.department) marksParams.department = filters.department;
        if (filters.semester) marksParams.semester = filters.semester;
        if (filters.subjectId) marksParams.subjectId = filters.subjectId;

        const attendanceParams = {};
        if (filters.subjectId) attendanceParams.subjectId = filters.subjectId;
        if (filters.year) attendanceParams.year = filters.year;

        const [marksResponse, attendanceResponse] = await Promise.all([
          marksAPI.getAll(marksParams),
          attendanceAPI.getAll(attendanceParams)
        ]);

        setMarks(marksResponse.data.data || []);
        setAttendance(attendanceResponse.data.data || []);
      } catch (analyticsError) {
        setError(analyticsError?.response?.data?.message || 'Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [filters.department, filters.semester, filters.subjectId, filters.year]);

  const departments = useMemo(() => {
    const values = new Set();
    schemes.forEach((scheme) => {
      if (scheme.department) {
        values.add(scheme.department);
      }
    });
    return Array.from(values).sort();
  }, [schemes]);

  const filteredSchemes = useMemo(() => {
    return schemes.filter((scheme) => {
      if (filters.department && scheme.department !== filters.department) {
        return false;
      }

      if (filters.semester && String(scheme.semester) !== String(filters.semester)) {
        return false;
      }

      return true;
    });
  }, [filters.department, filters.semester, schemes]);

  const selectedScheme = useMemo(() => {
    return schemes.find((scheme) => String(scheme._id) === String(filters.subjectId)) || null;
  }, [filters.subjectId, schemes]);

  const filteredAttendance = useMemo(() => {
    const hasCohortFilters = Boolean(filters.department || filters.semester || filters.subjectId);

    if (!hasCohortFilters) {
      return attendance;
    }

    const allowedStudentIds = new Set(marks.map((record) => normalizeId(record.studentId)).filter(Boolean));

    return attendance.filter((record) => allowedStudentIds.has(normalizeId(record.studentId)));
  }, [attendance, filters.department, filters.semester, filters.subjectId, marks]);

  const attendanceByStudentSubject = useMemo(() => {
    const buckets = new Map();

    filteredAttendance.forEach((record) => {
      const key = `${normalizeId(record.studentId)}:${normalizeId(record.subjectId)}`;
      const bucket = buckets.get(key) || {
        studentId: record.studentId,
        subjectId: record.subjectId,
        total: 0,
        count: 0
      };

      bucket.total += safeNumber(record.percentage);
      bucket.count += 1;
      buckets.set(key, bucket);
    });

    return buckets;
  }, [filteredAttendance]);

  const combinedRecords = useMemo(() => {
    return marks.map((record) => {
      const key = `${normalizeId(record.studentId)}:${normalizeId(record.subjectId)}`;
      const attendanceBucket = attendanceByStudentSubject.get(key);
      const attendancePercentage =
        attendanceBucket && attendanceBucket.count > 0 ? attendanceBucket.total / attendanceBucket.count : 0;

      return {
        id: record._id,
        studentId: normalizeId(record.studentId),
        studentName: getStudentName(record),
        subjectId: normalizeId(record.subjectId),
        subjectCode: getSubjectCode(record),
        subjectLabel: getSubjectLabel(record),
        semester: record.semester,
        department: record.department,
        finalMarks: safeNumber(record.finalMarks),
        attendance: attendancePercentage,
        grade: getGrade(record.finalMarks)
      };
    });
  }, [attendanceByStudentSubject, marks]);

  const subjectSummaries = useMemo(() => {
    const buckets = new Map();

    combinedRecords.forEach((record) => {
      const bucket = buckets.get(record.subjectId) || {
        subjectId: record.subjectId,
        subjectCode: record.subjectCode,
        subjectLabel: record.subjectLabel,
        totalMarks: 0,
        totalAttendance: 0,
        count: 0,
        passCount: 0,
        highMarks: -Infinity,
        lowMarks: Infinity
      };

      bucket.totalMarks += record.finalMarks;
      bucket.totalAttendance += record.attendance;
      bucket.count += 1;
      bucket.passCount += record.finalMarks >= 35 ? 1 : 0;
      bucket.highMarks = Math.max(bucket.highMarks, record.finalMarks);
      bucket.lowMarks = Math.min(bucket.lowMarks, record.finalMarks);
      buckets.set(record.subjectId, bucket);
    });

    return Array.from(buckets.values())
      .map((bucket) => ({
        ...bucket,
        averageMarks: bucket.count > 0 ? bucket.totalMarks / bucket.count : 0,
        averageAttendance: bucket.count > 0 ? bucket.totalAttendance / bucket.count : 0,
        passRate: bucket.count > 0 ? (bucket.passCount / bucket.count) * 100 : 0,
        highMarks: bucket.highMarks === -Infinity ? 0 : bucket.highMarks,
        lowMarks: bucket.lowMarks === Infinity ? 0 : bucket.lowMarks
      }))
      .sort((left, right) => right.averageMarks - left.averageMarks);
  }, [combinedRecords]);

  const gradeDistribution = useMemo(() => {
    const buckets = new Map();
    ['O', 'A+', 'A', 'B+', 'B', 'C', 'D', 'F'].forEach((grade) => buckets.set(grade, 0));

    combinedRecords.forEach((record) => {
      buckets.set(record.grade, (buckets.get(record.grade) || 0) + 1);
    });

    return Array.from(buckets.entries()).map(([grade, count]) => ({ grade, count }));
  }, [combinedRecords]);

  const attendanceDistribution = useMemo(() => {
    const buckets = new Map();
    ['90-100', '80-89', '70-79', '60-69', '50-59', '40-49', 'Below 40'].forEach((band) => buckets.set(band, 0));

    filteredAttendance.forEach((record) => {
      const band = getDistributionBand(record.percentage);
      buckets.set(band, (buckets.get(band) || 0) + 1);
    });

    return Array.from(buckets.entries()).map(([band, count]) => ({ band, count }));
  }, [filteredAttendance]);

  const semesterTrends = useMemo(() => {
    const buckets = new Map();

    combinedRecords.forEach((record) => {
      const semesterKey = record.semester ? `Sem ${record.semester}` : 'Unknown';
      const bucket = buckets.get(semesterKey) || { semester: semesterKey, marks: 0, attendance: 0, count: 0 };
      bucket.marks += record.finalMarks;
      bucket.attendance += record.attendance;
      bucket.count += 1;
      buckets.set(semesterKey, bucket);
    });

    return Array.from(buckets.values())
      .map((bucket) => ({
        semester: bucket.semester,
        averageMarks: bucket.count > 0 ? bucket.marks / bucket.count : 0,
        averageAttendance: bucket.count > 0 ? bucket.attendance / bucket.count : 0,
        studentCount: bucket.count
      }))
      .sort((left, right) => {
        const leftValue = Number.parseInt(String(left.semester).replace(/\D+/g, ''), 10) || 0;
        const rightValue = Number.parseInt(String(right.semester).replace(/\D+/g, ''), 10) || 0;
        return leftValue - rightValue;
      });
  }, [combinedRecords]);

  const subjectAttendanceTrend = useMemo(() => {
    const buckets = groupAverage(filteredAttendance, (record) => normalizeId(record.subjectId), (record) => record.percentage);

    return Array.from(buckets.entries())
      .map(([subjectId, bucket]) => {
        const sample = filteredAttendance.find((record) => normalizeId(record.subjectId) === subjectId);

        return {
          subjectId,
          subjectCode: getSubjectCode(sample),
          subjectLabel: getSubjectLabel(sample),
          averageAttendance: bucket.count > 0 ? bucket.total / bucket.count : 0
        };
      })
      .sort((left, right) => right.averageAttendance - left.averageAttendance)
      .slice(0, 10);
  }, [filteredAttendance]);

  const studentSummaries = useMemo(() => {
    const buckets = new Map();

    combinedRecords.forEach((record) => {
      const bucket = buckets.get(record.studentId) || {
        studentId: record.studentId,
        studentName: record.studentName,
        totalMarks: 0,
        totalAttendance: 0,
        count: 0,
        passedSubjects: 0
      };

      bucket.totalMarks += record.finalMarks;
      bucket.totalAttendance += record.attendance;
      bucket.count += 1;
      bucket.passedSubjects += record.finalMarks >= 35 ? 1 : 0;
      buckets.set(record.studentId, bucket);
    });

    return Array.from(buckets.values())
      .map((bucket) => ({
        ...bucket,
        averageMarks: bucket.count > 0 ? bucket.totalMarks / bucket.count : 0,
        averageAttendance: bucket.count > 0 ? bucket.totalAttendance / bucket.count : 0,
        passRate: bucket.count > 0 ? (bucket.passedSubjects / bucket.count) * 100 : 0
      }))
      .sort((left, right) => right.averageMarks - left.averageMarks);
  }, [combinedRecords]);

  const topPerformers = studentSummaries.slice(0, 8);
  const lowAttendanceStudents = [...studentSummaries]
    .filter((student) => student.averageAttendance < 75)
    .sort((left, right) => left.averageAttendance - right.averageAttendance)
    .slice(0, 8);

  useEffect(() => {
    if (selectedStudentId) {
      return;
    }

    if (topPerformers.length > 0) {
      setSelectedStudentId(topPerformers[0].studentId);
    }
  }, [selectedStudentId, topPerformers]);

  const selectedStudentSummary = useMemo(() => {
    if (!selectedStudentId) {
      return null;
    }
    return studentSummaries.find((student) => student.studentId === selectedStudentId) || null;
  }, [selectedStudentId, studentSummaries]);

  const selectedStudentRecords = useMemo(() => {
    if (!selectedStudentId) {
      return [];
    }
    return combinedRecords
      .filter((record) => record.studentId === selectedStudentId)
      .sort((left, right) => String(left.subjectCode).localeCompare(String(right.subjectCode)));
  }, [combinedRecords, selectedStudentId]);

  const selectedStudentMarksPie = useMemo(() => {
    const marksValue = safeNumber(selectedStudentSummary?.averageMarks);
    const obtained = Math.max(0, Math.min(100, marksValue));
    const remaining = Math.max(0, 100 - obtained);
    return [
      { label: 'Marks (avg)', value: obtained },
      { label: 'Remaining', value: remaining }
    ];
  }, [selectedStudentSummary]);

  const selectedStudentAttendancePie = useMemo(() => {
    const attendanceValue = safeNumber(selectedStudentSummary?.averageAttendance);
    const present = Math.max(0, Math.min(100, attendanceValue));
    const absent = Math.max(0, 100 - present);
    return [
      { label: 'Present', value: present },
      { label: 'Absent', value: absent }
    ];
  }, [selectedStudentSummary]);

  const getRecordsForStudent = (studentId) => {
    return combinedRecords
      .filter((r) => r.studentId === studentId)
      .map((r) => ({ subject: r.subjectCode || r.subjectLabel, marks: r.finalMarks, attendance: r.attendance }));
  };

  const topPerformerGradeSplit = useMemo(() => {
    if (!topPerformers.length) {
      return [];
    }

    const topIds = new Set(topPerformers.map((student) => student.studentId));
    const buckets = new Map();
    ['O', 'A+', 'A', 'B+', 'B', 'C', 'D', 'F'].forEach((grade) => buckets.set(grade, 0));

    combinedRecords.forEach((record) => {
      if (!topIds.has(record.studentId)) {
        return;
      }

      buckets.set(record.grade, (buckets.get(record.grade) || 0) + 1);
    });

    return Array.from(buckets.entries())
      .map(([grade, count]) => ({ grade, count }))
      .filter((entry) => entry.count > 0);
  }, [combinedRecords, topPerformers]);

  const scatterData = useMemo(() => {
    return combinedRecords
      .filter((record) => record.finalMarks > 0 || record.attendance > 0)
      .map((record) => ({
        studentName: record.studentName,
        subjectLabel: record.subjectLabel,
        marks: record.finalMarks,
        attendance: record.attendance,
        semester: record.semester
      }));
  }, [combinedRecords]);

  const correlation = useMemo(() => buildScatterStats(scatterData), [scatterData]);

  const totalStudents = useMemo(() => new Set(combinedRecords.map((record) => record.studentId)).size, [combinedRecords]);
  const averageMarks = useMemo(() => {
    if (!combinedRecords.length) return 0;
    return combinedRecords.reduce((sum, record) => sum + record.finalMarks, 0) / combinedRecords.length;
  }, [combinedRecords]);
  const averageAttendance = useMemo(() => {
    if (!combinedRecords.length) return 0;
    return combinedRecords.reduce((sum, record) => sum + record.attendance, 0) / combinedRecords.length;
  }, [combinedRecords]);
  const passRate = useMemo(() => {
    if (!combinedRecords.length) return 0;
    return (combinedRecords.filter((record) => record.finalMarks >= 35).length / combinedRecords.length) * 100;
  }, [combinedRecords]);

  const heatmapSubjects = useMemo(() => subjectSummaries.slice(0, 6), [subjectSummaries]);
  const heatmapStudents = useMemo(() => topPerformers.slice(0, 8), [topPerformers]);

  const performanceHeatmap = useMemo(() => {
    return heatmapStudents.map((student) => {
      const row = { studentName: student.studentName };
      heatmapSubjects.forEach((subject) => {
        const subjectRecord = combinedRecords.find(
          (record) => record.studentId === student.studentId && record.subjectId === subject.subjectId
        );
        row[subject.subjectId] = subjectRecord ? subjectRecord.finalMarks : 0;
      });
      return row;
    });
  }, [combinedRecords, heatmapStudents, heatmapSubjects]);

  const attendanceHeatmap = useMemo(() => {
    return heatmapStudents.map((student) => {
      const row = { studentName: student.studentName };
      heatmapSubjects.forEach((subject) => {
        const subjectRecord = combinedRecords.find(
          (record) => record.studentId === student.studentId && record.subjectId === subject.subjectId
        );
        row[subject.subjectId] = subjectRecord ? subjectRecord.attendance : 0;
      });
      return row;
    });
  }, [combinedRecords, heatmapStudents, heatmapSubjects]);

  const scopeLabel = formatScope(
    filters,
    selectedScheme ? `${selectedScheme.subjectCode || ''} ${selectedScheme.subjectName || ''}`.trim() : 'All Subjects'
  );

  const handleFilterChange = (field, value) => {
    setFilters((current) => {
      const nextFilters = { ...current, [field]: value };

      if (field === 'department' || field === 'semester') {
        nextFilters.subjectId = '';
      }

      return nextFilters;
    });
  };

  const resetFilters = () => {
    setFilters(initialFilters);
  };

  const handleSubjectClick = (subjectId) => {
    if (!subjectId) return;
    setFilters((current) => ({ ...current, subjectId }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStudentBarClick = (studentId) => {
    if (!studentId) return;
    setSelectedStudentId(studentId);
    const el = document.getElementById('analytics-student');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const exportPdf = () => {
    const doc = new jsPDF('landscape');
    const filterText = formatScope(
      filters,
      selectedScheme ? `${selectedScheme.subjectCode || ''} ${selectedScheme.subjectName || ''}`.trim() : 'All Subjects'
    );

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 297, 36, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text('Academic Analytics Dashboard', 14, 16);
    doc.setFontSize(10);
    doc.text(filterText, 14, 24);
    doc.text(`Generated on ${new Date().toLocaleString()}`, 14, 30);

    doc.setTextColor(15, 23, 42);
    doc.autoTable({
      startY: 42,
      head: [['Metric', 'Value']],
      body: [
        ['Average Marks', formatPercentage(averageMarks)],
        ['Average Attendance', formatPercentage(averageAttendance)],
        ['Pass Rate', formatPercentage(passRate)],
        ['Total Students', String(totalStudents)],
        ['Correlation', correlation.toFixed(2)]
      ],
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [29, 78, 216] }
    });

    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 8,
      head: [['Subject', 'Avg Marks', 'Avg Attendance', 'Pass Rate']],
      body: subjectSummaries.slice(0, 10).map((subject) => [
        subject.subjectLabel,
        formatPercentage(subject.averageMarks),
        formatPercentage(subject.averageAttendance),
        formatPercentage(subject.passRate)
      ]),
      theme: 'grid',
      styles: { fontSize: 8.5, cellPadding: 3 },
      headStyles: { fillColor: [15, 118, 110] }
    });

    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 8,
      head: [['Student', 'Avg Marks', 'Avg Attendance', 'Pass Rate']],
      body: topPerformers.map((student) => [
        student.studentName,
        formatPercentage(student.averageMarks),
        formatPercentage(student.averageAttendance),
        formatPercentage(student.passRate)
      ]),
      theme: 'grid',
      styles: { fontSize: 8.5, cellPadding: 3 },
      headStyles: { fillColor: [124, 58, 237] }
    });

    if (lowAttendanceStudents.length > 0) {
      doc.autoTable({
        startY: doc.lastAutoTable.finalY + 8,
        head: [['At-Risk Student', 'Avg Attendance', 'Avg Marks']],
        body: lowAttendanceStudents.map((student) => [
          student.studentName,
          formatPercentage(student.averageAttendance),
          formatPercentage(student.averageMarks)
        ]),
        theme: 'grid',
        styles: { fontSize: 8.5, cellPadding: 3 },
        headStyles: { fillColor: [190, 18, 60] }
      });
    }

    doc.save(`academic-analytics-${Date.now()}.pdf`);
  };

  const exportExcel = () => {
    const workbook = XLSX.utils.book_new();

    const summarySheet = XLSX.utils.json_to_sheet([
      { metric: 'Average Marks', value: roundOne(averageMarks) },
      { metric: 'Average Attendance', value: roundOne(averageAttendance) },
      { metric: 'Pass Rate', value: roundOne(passRate) },
      { metric: 'Total Students', value: totalStudents },
      { metric: 'Correlation', value: roundOne(correlation) },
      { metric: 'Scope', value: scopeLabel }
    ]);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    const subjectSheet = XLSX.utils.json_to_sheet(
      subjectSummaries.map((subject) => ({
        subject: subject.subjectLabel,
        averageMarks: roundOne(subject.averageMarks),
        averageAttendance: roundOne(subject.averageAttendance),
        passRate: roundOne(subject.passRate),
        highMarks: roundOne(subject.highMarks),
        lowMarks: roundOne(subject.lowMarks)
      }))
    );
    XLSX.utils.book_append_sheet(workbook, subjectSheet, 'Subjects');

    const studentSheet = XLSX.utils.json_to_sheet(
      topPerformers.map((student) => ({
        student: student.studentName,
        averageMarks: roundOne(student.averageMarks),
        averageAttendance: roundOne(student.averageAttendance),
        passRate: roundOne(student.passRate)
      }))
    );
    XLSX.utils.book_append_sheet(workbook, studentSheet, 'Top Students');

    const riskSheet = XLSX.utils.json_to_sheet(
      lowAttendanceStudents.map((student) => ({
        student: student.studentName,
        averageAttendance: roundOne(student.averageAttendance),
        averageMarks: roundOne(student.averageMarks)
      }))
    );
    XLSX.utils.book_append_sheet(workbook, riskSheet, 'Attendance Risk');

    const semesterSheet = XLSX.utils.json_to_sheet(
      semesterTrends.map((item) => ({
        semester: item.semester,
        averageMarks: roundOne(item.averageMarks),
        averageAttendance: roundOne(item.averageAttendance),
        studentCount: item.studentCount
      }))
    );
    XLSX.utils.book_append_sheet(workbook, semesterSheet, 'Semester Trends');

    const scatterSheet = XLSX.utils.json_to_sheet(
      scatterData.map((item) => ({
        student: item.studentName,
        subject: item.subjectLabel,
        marks: roundOne(item.marks),
        attendance: roundOne(item.attendance),
        semester: item.semester
      }))
    );
    XLSX.utils.book_append_sheet(workbook, scatterSheet, 'Correlation');

    XLSX.writeFile(workbook, `academic-analytics-${Date.now()}.xlsx`);
  };

  const exportBusy = exporting;

  return (
    <div className="analytics-page fade-up">
      <div className="analytics-page__glow analytics-page__glow--left" />
      <div className="analytics-page__glow analytics-page__glow--right" />

      <div className="analytics-hero">
        <div className="analytics-hero__copy">
          <div className="analytics-kicker">
            <Sparkles size={14} /> Academic Analytics
          </div>
          <h1>Professional Academic Analytics Dashboard</h1>
          <p>
            Inspect marks, attendance, cohort risk, and trend correlations across schemes, semesters, departments, and
            subjects.
          </p>
          <div className="analytics-scope-chip">{scopeLabel}</div>
        </div>

        <div className="analytics-hero__actions">
          <button type="button" className="btn btn-secondary analytics-action-btn" onClick={exportPdf} disabled={loading || exportBusy}>
            <Download size={16} /> PDF
          </button>
          <button type="button" className="btn btn-primary analytics-action-btn" onClick={exportExcel} disabled={loading || exportBusy}>
            <FileSpreadsheet size={16} /> Excel
          </button>
        </div>
      </div>

      <div className="analytics-filter-shell card">
        <div className="card-header analytics-filter-shell__header">
          <div>
            <h3>Filters</h3>
            <p>Use the selectors below to re-slice the entire dashboard.</p>
          </div>
          <button type="button" className="btn btn-secondary" onClick={resetFilters}>
            <RotateCcw size={14} /> Reset
          </button>
        </div>

        <div className="analytics-filter-grid">
          <div className="form-group">
            <label htmlFor="analytics-department">Department</label>
            <select
              id="analytics-department"
              className="form-control"
              value={filters.department}
              onChange={(event) => handleFilterChange('department', event.target.value)}
            >
              <option value="">All Departments</option>
              {departments.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="analytics-semester">Semester</label>
            <select
              id="analytics-semester"
              className="form-control"
              value={filters.semester}
              onChange={(event) => handleFilterChange('semester', event.target.value)}
            >
              <option value="">All Semesters</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((semester) => (
                <option key={semester} value={semester}>
                  Semester {semester}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="analytics-subject">Scheme / Subject</label>
            <select
              id="analytics-subject"
              className="form-control"
              value={filters.subjectId}
              onChange={(event) => handleFilterChange('subjectId', event.target.value)}
            >
              <option value="">All Subjects</option>
              {filteredSchemes.map((scheme) => (
                <option key={scheme._id} value={scheme._id}>
                  {(scheme.subjectCode || 'SUB')} - {scheme.subjectName || 'Untitled Subject'}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="analytics-year">Academic Year</label>
            <select
              id="analytics-year"
              className="form-control"
              value={filters.year}
              onChange={(event) => handleFilterChange('year', event.target.value)}
            >
              {academicYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error ? (
        <div className="analytics-alert card">
          <AlertTriangle size={18} />
          <div>
            <strong>Unable to load dashboard data.</strong>
            <p>{error}</p>
          </div>
        </div>
      ) : null}

      <div className="analytics-kpis">
        <div className="analytics-kpi card">
          <div className="analytics-kpi__icon analytics-kpi__icon--blue">
            <GraduationCap size={18} />
          </div>
          <div>
            <span>Average Marks</span>
            <strong>{formatPercentage(averageMarks)}</strong>
            <small>Across the filtered cohort</small>
          </div>
        </div>

        <div className="analytics-kpi card">
          <div className="analytics-kpi__icon analytics-kpi__icon--teal">
            <Waves size={18} />
          </div>
          <div>
            <span>Attendance</span>
            <strong>{formatPercentage(averageAttendance)}</strong>
            <small>Mean attendance percentage</small>
          </div>
        </div>

        <div className="analytics-kpi card">
          <div className="analytics-kpi__icon analytics-kpi__icon--amber">
            <TrendingUp size={18} />
          </div>
          <div>
            <span>Pass Rate</span>
            <strong>{formatPercentage(passRate)}</strong>
            <small>Marks at or above the pass threshold</small>
          </div>
        </div>

        <div className="analytics-kpi card">
          <div className="analytics-kpi__icon analytics-kpi__icon--violet">
            <Users size={18} />
          </div>
          <div>
            <span>Total Students</span>
            <strong>{totalStudents}</strong>
            <small>Unique students in scope</small>
          </div>
        </div>
      </div>

      <div className="analytics-grid analytics-grid--charts">
        <section className="analytics-panel card">
          <div className="card-header">
            <div>
              <h3>Student Performance</h3>
              <p>Top students by average marks with attendance comparison.</p>
            </div>
            <div className="analytics-card-tag">{topPerformers.length} students</div>
          </div>

          {topPerformers.length > 0 ? (
            <>
              <div className="analytics-filter-grid" style={{ padding: '12px 0 6px' }}>
                <div className="form-group">
                  <label htmlFor="analytics-student">Student</label>
                  <select
                    id="analytics-student"
                    className="form-control"
                    value={selectedStudentId}
                    onChange={(event) => setSelectedStudentId(event.target.value)}
                  >
                    {studentSummaries.map((student) => (
                      <option key={student.studentId} value={student.studentId}>
                        {student.studentName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)', gap: 18 }}>
                <div className="analytics-chart analytics-chart--tall">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={selectedStudentRecords}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                      <XAxis dataKey="subjectCode" tickLine={false} axisLine={false} interval={0} />
                      <YAxis tickLine={false} axisLine={false} domain={[0, 100]} />
                      <Tooltip
                        labelFormatter={(label) => `Subject: ${label}`}
                        formatter={(value, name) => [formatPercentage(value), name]}
                      />
                      <Legend />
                      <Bar dataKey="finalMarks" name="Marks" fill="#1d4ed8" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="attendance" name="Attendance" fill="#0f766e" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div style={{ display: 'grid', gridTemplateRows: '1fr 1fr', gap: 18 }}>
                  <div className="analytics-chart analytics-chart--tall">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={selectedStudentMarksPie} dataKey="value" nameKey="label" innerRadius={55} outerRadius={95} paddingAngle={4}>
                          <Cell fill="#1d4ed8" />
                          <Cell fill="rgba(29, 78, 216, 0.18)" />
                        </Pie>
                        <Tooltip formatter={(value, name) => [formatPercentage(value), name]} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="analytics-chart analytics-chart--tall">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={selectedStudentAttendancePie} dataKey="value" nameKey="label" innerRadius={55} outerRadius={95} paddingAngle={4}>
                          <Cell fill="#0f766e" />
                          <Cell fill="rgba(15, 118, 110, 0.18)" />
                        </Pie>
                        <Tooltip formatter={(value, name) => [formatPercentage(value), name]} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="analytics-empty">
              <Users size={28} />
              <p>No student performance data available.</p>
            </div>
          )}
        </section>

        <section className="analytics-panel card">
          <div className="card-header">
            <div>
              <h3>Subject-wise Performance</h3>
              <p>Average marks, pass rate, and cohort spread by subject.</p>
            </div>
            <div className="analytics-card-tag">{subjectSummaries.length} subjects</div>
          </div>

          <div className="analytics-chart analytics-chart--tall">
            {subjectSummaries.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subjectSummaries.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                  <XAxis dataKey="subjectCode" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} domain={[0, 100]} />
                  <Tooltip formatter={(value) => [formatPercentage(value), '']} labelFormatter={(label) => `Subject: ${label}`} />
                  <Legend />
                  <Bar dataKey="averageMarks" name="Average Marks" radius={[8, 8, 0, 0]}>
                    {subjectSummaries.slice(0, 10).map((subject, idx) => (
                      <Cell
                        key={subject.subjectId}
                        cursor="pointer"
                        onClick={() => handleSubjectClick(subject.subjectId)}
                        fill={CHART_COLORS[idx % CHART_COLORS.length]}
                      />
                    ))}
                  </Bar>
                  <Bar dataKey="averageAttendance" name="Average Attendance" fill="#0f766e" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="analytics-empty">
                <BarChart3 size={28} />
                <p>No subject performance data for the selected scope.</p>
              </div>
            )}
          </div>
        </section>

        <section className="analytics-panel card">
          <div className="card-header">
            <div>
              <h3>Grade Distribution</h3>
              <p>How the filtered cohort is spreading across letter grades.</p>
            </div>
            <div className="analytics-card-tag">{combinedRecords.length} records</div>
          </div>

          <div className="analytics-chart">
            {gradeDistribution.some((entry) => entry.count > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={gradeDistribution.filter((entry) => entry.count > 0)}
                    dataKey="count"
                    nameKey="grade"
                    innerRadius={64}
                    outerRadius={100}
                    paddingAngle={4}
                  >
                    {gradeDistribution
                      .filter((entry) => entry.count > 0)
                      .map((entry, index) => (
                        <Cell key={entry.grade} fill={GRADE_COLORS[index % GRADE_COLORS.length]} />
                      ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="analytics-empty">
                <GraduationCap size={28} />
                <p>No grade distribution data available.</p>
              </div>
            )}
          </div>
        </section>

        <section className="analytics-panel card">
          <div className="card-header">
            <div>
              <h3>Cohort Student Performance</h3>
              <p>Average marks per student (top 20) with attendance overlay.</p>
            </div>
            <div className="analytics-card-tag">{studentSummaries.length} students</div>
          </div>

          <div className="analytics-chart analytics-chart--tall">
            {studentSummaries.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={studentSummaries.slice(0, 20)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                  <XAxis
                    dataKey="studentName"
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                    height={90}
                    angle={-35}
                    textAnchor="end"
                    tickMargin={12}
                    tickFormatter={(value) => (String(value).length > 12 ? `${String(value).slice(0, 12)}…` : value)}
                  />
                  <YAxis tickLine={false} axisLine={false} domain={[0, 100]} />
                  <Tooltip formatter={(value, name) => [formatPercentage(value), name]} />
                  <Legend />
                  <Bar dataKey="averageMarks" name="Avg Marks" radius={[8, 8, 0, 0]}>
                    {studentSummaries.slice(0, 20).map((student, idx) => (
                      <Cell
                        key={student.studentId}
                        cursor="pointer"
                        onClick={() => handleStudentBarClick(student.studentId)}
                        fill={CHART_COLORS[idx % CHART_COLORS.length]}
                      />
                    ))}
                  </Bar>
                  <Bar dataKey="averageAttendance" name="Avg Attendance" fill="#0f766e" radius={[8, 8, 0, 0]}>
                    {studentSummaries.slice(0, 20).map((student, idx) => (
                      <Cell key={`${student.studentId}-a`} fill="rgba(15,118,110,0.18)" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="analytics-empty">
                <Users size={28} />
                <p>No student performance data available.</p>
              </div>
            )}
          </div>
        </section>

        <section className="analytics-panel card">
          <div className="card-header">
            <div>
              <h3>Semester Trend</h3>
              <p>Marks and attendance movement across semesters.</p>
            </div>
            <div className="analytics-card-tag">{semesterTrends.length} semesters</div>
          </div>

          <div className="analytics-chart analytics-chart--tall">
            {semesterTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={semesterTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                  <XAxis dataKey="semester" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} domain={[0, 100]} />
                  <Tooltip formatter={(value) => formatPercentage(value)} />
                  <Legend />
                  <Area type="monotone" dataKey="averageMarks" fill="rgba(29,78,216,0.12)" stroke="#1d4ed8" />
                  <Line type="monotone" dataKey="averageAttendance" stroke="#0f766e" strokeWidth={3} dot={{ r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="analytics-empty">
                <CalendarDays size={28} />
                <p>No semester trend data for the selected filters.</p>
              </div>
            )}
          </div>
        </section>

        <section className="analytics-panel card">
          <div className="card-header">
            <div>
              <h3>Attendance Distribution</h3>
              <p>Attendance buckets for the current filtered set.</p>
            </div>
            <div className="analytics-card-tag">{filteredAttendance.length} records</div>
          </div>

          <div className="analytics-chart">
            {attendanceDistribution.some((entry) => entry.count > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={attendanceDistribution.filter((entry) => entry.count > 0)}
                    dataKey="count"
                    nameKey="band"
                    innerRadius={64}
                    outerRadius={100}
                    paddingAngle={4}
                  >
                    {attendanceDistribution
                      .filter((entry) => entry.count > 0)
                      .map((entry, index) => (
                        <Cell key={entry.band} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="analytics-empty">
                <Waves size={28} />
                <p>No attendance distribution data available.</p>
              </div>
            )}
          </div>
        </section>

        <section className="analytics-panel card analytics-panel--wide">
          <div className="card-header">
            <div>
              <h3>Attendance vs Marks Correlation</h3>
              <p>Each dot represents a student-subject pair.</p>
            </div>
            <div className="analytics-card-tag">r = {correlation.toFixed(2)}</div>
          </div>

          <div className="analytics-chart analytics-chart--wide">
            {scatterData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                  <XAxis dataKey="attendance" name="Attendance" unit="%" tickLine={false} axisLine={false} domain={[0, 100]} />
                  <YAxis dataKey="marks" name="Marks" unit="%" tickLine={false} axisLine={false} domain={[0, 100]} />
                  <ZAxis range={[64, 64]} />
                  <Tooltip
                    cursor={{ strokeDasharray: '3 3' }}
                    formatter={(value, name) => [formatPercentage(value), name]}
                    labelFormatter={() => ''}
                  />
                  <Scatter data={scatterData.slice(0, 800)} fill="#1d4ed8" />
                </ScatterChart>
              </ResponsiveContainer>
            ) : (
              <div className="analytics-empty">
                <School size={28} />
                <p>No correlation data to display.</p>
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="analytics-grid analytics-grid--insights">
        <section className="analytics-panel card">
          <div className="card-header">
            <div>
              <h3>Top Performers</h3>
              <p>Students with the strongest average marks in scope.</p>
            </div>
            <div className="analytics-card-tag">Ranked</div>
          </div>

          <div className="analytics-chart analytics-chart--tall">
            {topPerformers.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topPerformers} layout="vertical" margin={{ left: 10, right: 18 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                  <XAxis type="number" tickLine={false} axisLine={false} domain={[0, 100]} />
                  <YAxis
                    type="category"
                    dataKey="studentName"
                    width={140}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => (String(value).length > 18 ? `${String(value).slice(0, 18)}…` : value)}
                  />
                  <Tooltip formatter={(value, name) => [formatPercentage(value), name]} />
                  <Legend />
                  <Bar dataKey="averageMarks" name="Average Marks" fill="#1d4ed8" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="analytics-empty analytics-empty--compact">
                <Users size={24} />
                <p>No student performance data available.</p>
              </div>
            )}
          </div>
        </section>

        <section className="analytics-panel card">
          <div className="card-header">
            <div>
              <h3>Attendance Risk</h3>
              <p>Students below the attendance threshold.</p>
            </div>
            <div className="analytics-card-tag">Low attendance</div>
          </div>

          <div className="analytics-chart analytics-chart--tall">
            {lowAttendanceStudents.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={lowAttendanceStudents} layout="vertical" margin={{ left: 10, right: 18 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                  <XAxis type="number" tickLine={false} axisLine={false} domain={[0, 100]} />
                  <YAxis
                    type="category"
                    dataKey="studentName"
                    width={140}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => (String(value).length > 18 ? `${String(value).slice(0, 18)}…` : value)}
                  />
                  <Tooltip formatter={(value, name) => [formatPercentage(value), name]} />
                  <Legend />
                  <Bar dataKey="averageAttendance" name="Average Attendance" fill="#be123c" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="analytics-empty analytics-empty--compact">
                <AlertTriangle size={24} />
                <p>No attendance-risk students in the filtered scope.</p>
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="analytics-grid analytics-grid--heatmaps">
        <section className="analytics-panel card">
          <div className="card-header">
            <div>
              <h3>Performance Heatmap</h3>
              <p>Top students across the strongest subjects.</p>
            </div>
            <div className="analytics-card-tag">Marks</div>
          </div>

          {performanceHeatmap.length > 0 && heatmapSubjects.length > 0 ? (
            <div className="heatmap-shell">
              <div
                className="heatmap-grid"
                style={{ gridTemplateColumns: `180px repeat(${heatmapSubjects.length}, minmax(72px, 1fr))` }}
              >
                <div className="heatmap-grid__header">Student</div>
                {heatmapSubjects.map((subject) => (
                  <div className="heatmap-grid__header" key={subject.subjectId}>
                    {subject.subjectCode}
                  </div>
                ))}

                {performanceHeatmap.map((row) => (
                  <>
                    <div className="heatmap-grid__label" key={`${row.studentName}-label`}>
                      {row.studentName}
                    </div>
                    {heatmapSubjects.map((subject) => (
                      <div
                        className="heatmap-grid__cell"
                        key={`${row.studentName}-${subject.subjectId}`}
                        style={{ background: getMarksHeatColor(row[subject.subjectId]) }}
                      >
                        {row[subject.subjectId] ? formatMarks(row[subject.subjectId]) : '—'}
                      </div>
                    ))}
                  </>
                ))}
              </div>
            </div>
          ) : (
            <div className="analytics-empty">
              <BarChart3 size={28} />
              <p>No performance heatmap data available.</p>
            </div>
          )}
        </section>

        <section className="analytics-panel card">
          <div className="card-header">
            <div>
              <h3>Attendance Heatmap</h3>
              <p>Attendance strength for the same student-subject pairs.</p>
            </div>
            <div className="analytics-card-tag">Attendance</div>
          </div>

          {attendanceHeatmap.length > 0 && heatmapSubjects.length > 0 ? (
            <div className="heatmap-shell">
              <div
                className="heatmap-grid"
                style={{ gridTemplateColumns: `180px repeat(${heatmapSubjects.length}, minmax(72px, 1fr))` }}
              >
                <div className="heatmap-grid__header">Student</div>
                {heatmapSubjects.map((subject) => (
                  <div className="heatmap-grid__header" key={subject.subjectId}>
                    {subject.subjectCode}
                  </div>
                ))}

                {attendanceHeatmap.map((row) => (
                  <>
                    <div className="heatmap-grid__label" key={`${row.studentName}-attendance-label`}>
                      {row.studentName}
                    </div>
                    {heatmapSubjects.map((subject) => (
                      <div
                        className="heatmap-grid__cell"
                        key={`${row.studentName}-${subject.subjectId}-attendance`}
                        style={{ background: getAttendanceHeatColor(row[subject.subjectId]) }}
                      >
                        {row[subject.subjectId] ? formatPercentage(row[subject.subjectId]) : '—'}
                      </div>
                    ))}
                  </>
                ))}
              </div>
            </div>
          ) : (
            <div className="analytics-empty">
              <Waves size={28} />
              <p>No attendance heatmap data available.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default Analytics;
