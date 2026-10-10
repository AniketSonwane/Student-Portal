import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  ShieldAlert,
  Users,
  Lock,
  Unlock,
  Search,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Copy,
  Check,
  AlertTriangle,
  ArrowLeft,
  FileSpreadsheet,
  Eye,
  ChevronRight,
  Sparkles,
  UserCheck,
  RefreshCw,
  Download,
  Calendar,
  CalendarDays,
  Clock,
  Plus,
  Trash2,
  Edit2,
  Save,
} from 'lucide-react';
import { adminSheetService } from '../../services/adminSheetService';
import { profileService } from '../../services/profile';
import { timetableService, DAYS_OF_WEEK } from '../../services/timetable';
import { examDatesService } from '../../services/examDates';
import { DaySchedule, LectureItem, DayName } from '../../types/timetable';
import { ExamDateItem, ExamType } from '../../types/exam';
import { LoginLog, ChangeRequest, PortalSettings, AdminStats } from '../../types/admin';
import { Student } from '../../types/auth';
import { ThemeToggle } from '../../components/common/ThemeToggle';
import { ROUTES, APP_CONFIG } from '../../utils/constants';
import { useAuth } from '../../hooks/useAuth';
import { TIMETABLE_SPREADSHEET_ID, EXAM_DATES_SPREADSHEET_ID, ADMIN_SPREADSHEET_ID } from '../../config/sheetsConfig';

export const AdminPortalPage: React.FC = () => {
  const navigate = useNavigate();
  const { loginAsStudent } = useAuth();

  // Admin Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() =>
    adminSheetService.isAdminAuthenticated()
  );
  const [adminUser, setAdminUser] = useState<{ email: string; name?: string; picture?: string } | null>(() =>
    adminSheetService.getAdminUser()
  );
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState('');
  const adminGsiButtonRef = useRef<HTMLDivElement>(null);

  // Dashboard Data State
  const [stats, setStats] = useState<AdminStats>(() => adminSheetService.getAdminStats());
  const [logs, setLogs] = useState<LoginLog[]>(() => adminSheetService.getLogs());
  const [requests, setRequests] = useState<ChangeRequest[]>(() => adminSheetService.getChangeRequests());
  const [settings, setSettings] = useState<PortalSettings>(() => adminSheetService.getPortalSettings());

  // Search & Filter States
  const [logSearch, setLogSearch] = useState('');
  const [requestFilter, setRequestFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');

  // Modals & Panels
  const [showSheetSetupModal, setShowSheetSetupModal] = useState(false);
  const [showStudentPickerModal, setShowStudentPickerModal] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [showLockConfirmModal, setShowLockConfirmModal] = useState(false);
  const [lockReasonInput, setLockReasonInput] = useState(settings.lock_reason || 'System maintenance in progress.');
  const [isUpdatingLock, setIsUpdatingLock] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Academic Management States (Website Editing with Google Sheet Database)
  const [showTimetableEditorModal, setShowTimetableEditorModal] = useState(false);
  const [showExamDatesManagerModal, setShowExamDatesManagerModal] = useState(false);

  // Timetable Editor state
  const [editorSemester, setEditorSemester] = useState<number>(3);
  const [editorDay, setEditorDay] = useState<DayName>('Monday');
  const [editorSchedule, setEditorSchedule] = useState<DaySchedule[]>([]);
  const [isLoadingTimetable, setIsLoadingTimetable] = useState(false);
  const [isSavingTimetable, setIsSavingTimetable] = useState(false);
  const [timetableSaveSuccess, setTimetableSaveSuccess] = useState(false);

  // New Lecture Form inside Timetable Editor
  const [newLecturePeriod, setNewLecturePeriod] = useState<number>(1);
  const [newLectureTimings, setNewLectureTimings] = useState<string>('09:15 AM - 10:15 AM');
  const [newLectureCode, setNewLectureCode] = useState<string>('');
  const [newLectureName, setNewLectureName] = useState<string>('');
  const [newLectureRoom, setNewLectureRoom] = useState<string>('Hall 304');
  const [newLectureFaculty, setNewLectureFaculty] = useState<string>('');
  const [newLectureType, setNewLectureType] = useState<'Theory' | 'Lab' | 'Tutorial'>('Theory');
  const [showAddLectureRow, setShowAddLectureRow] = useState<boolean>(false);

  // Exam Dates Manager state
  const [allExamDates, setAllExamDates] = useState<ExamDateItem[]>([]);
  const [examSemesterFilter, setExamSemesterFilter] = useState<'ALL' | '1' | '2' | '3'>('ALL');
  const [isLoadingExams, setIsLoadingExams] = useState(false);
  const [isSavingExam, setIsSavingExam] = useState(false);
  const [examSaveSuccess, setExamSaveSuccess] = useState(false);

  // New Exam Form
  const [newExamSemester, setNewExamSemester] = useState<number>(3);
  const [newExamType, setNewExamType] = useState<ExamType>('CAE-1');
  const [newExamCode, setNewExamCode] = useState<string>('');
  const [newExamName, setNewExamName] = useState<string>('');
  const [newExamDate, setNewExamDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [newExamTimings, setNewExamTimings] = useState<string>('10:00 AM - 01:00 PM');
  const [newExamVenue, setNewExamVenue] = useState<string>('Hall B-102');
  const newExamStatus: 'Upcoming' | 'Today' | 'Completed' = 'Upcoming';

  const timetableSheetId = TIMETABLE_SPREADSHEET_ID;
  const examDatesSheetId = EXAM_DATES_SPREADSHEET_ID;
  const adminSheetId = ADMIN_SPREADSHEET_ID;

  // Load timetable whenever editor opens or semester changes
  useEffect(() => {
    if (showTimetableEditorModal) {
      setIsLoadingTimetable(true);
      timetableService.fetchTimetable(editorSemester).then((res) => {
        if (res.success && res.data) {
          setEditorSchedule(res.data);
        }
        setIsLoadingTimetable(false);
      });
    }
  }, [showTimetableEditorModal, editorSemester]);

  // Load exams whenever exam manager opens
  useEffect(() => {
    if (showExamDatesManagerModal) {
      setIsLoadingExams(true);
      examDatesService.fetchExamDates(undefined, true).then((res) => {
        if (res.success && res.data) {
          setAllExamDates(res.data);
        }
        setIsLoadingExams(false);
      });
    }
  }, [showExamDatesManagerModal]);

  // Active day schedule in editor
  const currentDaySchedule = useMemo(() => {
    return (
      editorSchedule.find((s) => s.day === editorDay) || {
        day: editorDay,
        shortDay: 'Mon' as any,
        lectures: [],
      }
    );
  }, [editorSchedule, editorDay]);

  // Filtered exams in manager
  const filteredExamDates = useMemo(() => {
    if (examSemesterFilter === 'ALL') return allExamDates;
    return allExamDates.filter((e) => e.semester === Number(examSemesterFilter));
  }, [allExamDates, examSemesterFilter]);

  const handleAddLecture = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLectureCode.trim()) return;

    const newLec: LectureItem = {
      id: `lec-${editorDay}-${newLecturePeriod}-${Date.now()}`,
      period: Number(newLecturePeriod),
      periodLabel: `Period ${newLecturePeriod}`,
      timings: newLectureTimings.trim(),
      subjectCode: newLectureCode.trim().toUpperCase(),
      subjectName: newLectureName.trim() || newLectureCode.trim().toUpperCase(),
      room: newLectureRoom.trim() || 'Room 304',
      faculty: newLectureFaculty.trim() || undefined,
      type: newLectureType,
    };

    setEditorSchedule((prev) => {
      const copy = [...prev];
      let dayIndex = copy.findIndex((s) => s.day === editorDay);
      if (dayIndex === -1) {
        copy.push({
          day: editorDay,
          shortDay: 'Mon' as any,
          lectures: [newLec],
        });
      } else {
        copy[dayIndex] = {
          ...copy[dayIndex],
          lectures: [...copy[dayIndex].lectures, newLec].sort((a, b) => a.period - b.period),
        };
      }
      return copy;
    });

    setNewLectureCode('');
    setNewLectureName('');
    setNewLecturePeriod((prev) => Number(prev) + 1);
    setShowAddLectureRow(false);
  };

  const handleDeleteLecture = (lecId: string) => {
    setEditorSchedule((prev) => {
      return prev.map((d) => {
        if (d.day !== editorDay) return d;
        return {
          ...d,
          lectures: d.lectures.filter((l) => l.id !== lecId),
        };
      });
    });
  };

  const handleSaveTimetable = async () => {
    setIsSavingTimetable(true);
    const res = await timetableService.saveTimetable(editorSemester, editorSchedule);
    setIsSavingTimetable(false);
    if (res.success) {
      setTimetableSaveSuccess(true);
      setTimeout(() => setTimetableSaveSuccess(false), 3000);
    }
  };

  const handleAddExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExamCode.trim() || !newExamName.trim() || !newExamDate) return;

    setIsSavingExam(true);
    const res = await examDatesService.addExamDate({
      semester: newExamSemester,
      examType: newExamType,
      subjectCode: newExamCode.trim().toUpperCase(),
      subjectName: newExamName.trim(),
      date: newExamDate,
      timings: newExamTimings.trim(),
      venue: newExamVenue.trim() || undefined,
      status: newExamStatus,
    });
    setIsSavingExam(false);

    if (res.success && res.data) {
      setAllExamDates((prev) => [res.data!, ...prev]);
      setExamSaveSuccess(true);
      setNewExamCode('');
      setNewExamName('');
      setTimeout(() => setExamSaveSuccess(false), 3000);
    }
  };

  const handleDeleteExam = async (id: string) => {
    const item = allExamDates.find((e) => e.id === id);
    await examDatesService.deleteExamDate(id, item);
    setAllExamDates((prev) => prev.filter((e) => e.id !== id));
  };

  // Sync reason input whenever live settings are fetched
  useEffect(() => {
    if (settings.lock_reason) {
      setLockReasonInput(settings.lock_reason);
    }
  }, [settings.lock_reason]);

  // Script URL Configuration
  const [scriptUrlInput, setScriptUrlInput] = useState(() => adminSheetService.getScriptUrl());
  const [savedUrlSuccess, setSavedUrlSuccess] = useState(false);

  // Students list loaded dynamically from live Google Sheet
  const [allStudents, setAllStudents] = useState<Student[]>(() => profileService.getAllLocal());

  useEffect(() => {
    profileService.fetchAllStudents().then((res) => {
      if (res.success && res.data && res.data.length > 0) {
        setAllStudents(res.data);
      }
    });
  }, []);

  // Filtered Students for "Access Any Student"
  const filteredStudents = useMemo(() => {
    const q = studentSearchQuery.trim().toLowerCase();
    if (!q) return allStudents;
    return allStudents.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.usn.toLowerCase().includes(q) ||
        (s.college_email && s.college_email.toLowerCase().includes(q))
    );
  }, [allStudents, studentSearchQuery]);

  const [logStatusFilter, setLogStatusFilter] = useState<'ALL' | 'SUCCESS' | 'DENIED'>('ALL');

  // Filtered Logs (includes successful, denied, blocked, and unknown login attempts)
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (logStatusFilter === 'SUCCESS' && log.status !== 'SUCCESS') return false;
      if (logStatusFilter === 'DENIED' && log.status !== 'DENIED' && log.status !== 'BLOCKED') return false;

      const q = logSearch.toLowerCase().trim();
      if (!q) return true;

      const matchesSearch =
        log.student_name.toLowerCase().includes(q) ||
        log.email.toLowerCase().includes(q) ||
        log.usn.toLowerCase().includes(q) ||
        (log.device && log.device.toLowerCase().includes(q)) ||
        (log.reason && log.reason.toLowerCase().includes(q));

      return matchesSearch;
    });
  }, [logs, logSearch, logStatusFilter]);

  // Filtered Change Requests
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      if (requestFilter === 'ALL') return true;
      return r.status === requestFilter;
    });
  }, [requests, requestFilter]);

  // Refresh All Data directly from Google Sheet (without storing logs in localStorage)
  const refreshData = async () => {
    try {
      const live = await adminSheetService.fetchLiveFromSheet();
      profileService.fetchAllStudents(true).then((res) => {
        if (res.success && res.data && res.data.length > 0) {
          setAllStudents(res.data);
        }
      });
      if (live.success) {
        setLogs(live.logs);
        setRequests(live.requests);
        setSettings(live.settings);
        setStats(adminSheetService.getAdminStats(live.logs));
      } else {
        setLogs(adminSheetService.getLogs());
        setRequests(adminSheetService.getChangeRequests());
        setSettings(adminSheetService.getPortalSettings());
        setStats(adminSheetService.getAdminStats());
      }
    } catch {
      setLogs(adminSheetService.getLogs());
      setRequests(adminSheetService.getChangeRequests());
      setSettings(adminSheetService.getPortalSettings());
      setStats(adminSheetService.getAdminStats());
    }
  };

  // Automatically purge legacy demo data & fetch live sheet data
  useEffect(() => {
    adminSheetService.purgeDemoData();
    if (isAuthenticated) {
      refreshData();
    }
  }, [isAuthenticated]);

  // Initialize Google Sign-In specifically for Admin Gate
  useEffect(() => {
    if (isAuthenticated) return;

    const initAdminGoogle = () => {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
      if (clientId && window.google?.accounts?.id && adminGsiButtonRef.current) {
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: (response: any) => {
              if (response.credential) {
                try {
                  setGoogleLoading(true);
                  setGoogleError('');
                  const parts = response.credential.split('.');
                  if (parts.length >= 2) {
                    const base64Url = parts[1];
                    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                    const jsonPayload = decodeURIComponent(
                      atob(base64)
                        .split('')
                        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                        .join('')
                    );
                    const payload = JSON.parse(jsonPayload);
                    const email = (payload.email || '').toLowerCase().trim();

                    if (adminSheetService.isAuthorizedAdminEmail(email)) {
                      const userObj = {
                        email,
                        name: payload.name || 'Administrator',
                        picture: payload.picture,
                      };
                      adminSheetService.setAdminAuthenticated(true, userObj);
                      setAdminUser(userObj);
                      setIsAuthenticated(true);
                      refreshData();
                    } else {
                      setGoogleError(
                        `Access Denied: The account "${email}" is not authorized for administrative access.`
                      );
                    }
                  }
                } catch {
                  setGoogleError('Failed to parse Google credentials.');
                } finally {
                  setGoogleLoading(false);
                }
              }
            },
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          adminGsiButtonRef.current.innerHTML = '';
          window.google.accounts.id.renderButton(adminGsiButtonRef.current, {
            type: 'standard',
            theme: document.documentElement.classList.contains('dark') ? 'filled_black' : 'outline',
            size: 'large',
            width: 320,
            text: 'signin_with',
            shape: 'rectangular',
            logo_alignment: 'left',
          });
        } catch (err) {
          console.warn('Admin Google GSI error:', err);
        }
      }
    };

    if (window.google?.accounts?.id) {
      initAdminGoogle();
    } else {
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(interval);
          initAdminGoogle();
        }
      }, 200);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  // Handle Admin Logout
  const handleLogout = () => {
    localStorage.removeItem('student_portal_admin_inspecting');
    adminSheetService.setAdminAuthenticated(false);
    setIsAuthenticated(false);
    setAdminUser(null);
    setGoogleError('');
  };

  // Handle Lock / Unlock Portal
  const handleToggleLock = async () => {
    setIsUpdatingLock(true);
    try {
      const nextLocked = !settings.is_locked;
      const updated = await adminSheetService.setPortalLock(nextLocked, lockReasonInput);
      setSettings(updated);
      setStats(adminSheetService.getAdminStats());
      setShowLockConfirmModal(false);
    } finally {
      setIsUpdatingLock(false);
    }
  };

  // Handle Request Status Update
  const handleRequestAction = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    await adminSheetService.updateChangeRequestStatus(id, status);
    refreshData();
  };

  // Manual Live Refresh from Google Sheet
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshData();
    } finally {
      setTimeout(() => setIsRefreshing(false), 400);
    }
  };

  // Export CSV of currently filtered logs
  const handleExportCSV = () => {
    const csv = adminSheetService.exportLogsCSV(filteredLogs);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `student_portal_logins_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };



  // Save Script URL
  const handleSaveScriptUrl = async () => {
    adminSheetService.setScriptUrl(scriptUrlInput);
    setSavedUrlSuccess(true);
    await refreshData();
    setTimeout(() => setSavedUrlSuccess(false), 3000);
  };

  // Copy Google Apps Script code
  const handleCopyScriptCode = () => {
    const code = `/**
 * Google Apps Script for Student Portal Backend & Admin Control Center
 * 
 * Supports:
 * - Login Logs Auditing (Logins tab)
 * - Profile Change Requests (ChangeRequests tab)
 * - Portal Lock / Maintenance Mode (Settings tab)
 * - Timetable Updates directly to Google Sheets database (Timetable Master sheet)
 * - Exam Dates Add & Delete directly to Google Sheets database (Exam Dates Master sheet)
 *
 * HOW TO DEPLOY:
 * 1. Open Extensions > Apps Script in your Google Spreadsheet.
 * 2. Replace all existing code with this script.
 * 3. Click "Deploy" > "Manage deployments" > Edit icon > Version: "New version" > Click "Deploy".
 * 4. Ensure "Execute as: Me" and "Who has access: Anyone".
 */

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || "";
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  if (action === "SETTINGS") {
    var setSheet = ss.getSheetByName("Settings");
    var sData = setSheet ? setSheet.getDataRange().getValues() : [];
    return jsonResponse({ success: true, settings: sData });
  }

  var logSheet = ss.getSheetByName("Logins");
  var reqSheet = ss.getSheetByName("ChangeRequests");
  var setSheet = ss.getSheetByName("Settings");

  var logs = logSheet ? logSheet.getDataRange().getValues() : [];
  var requests = reqSheet ? reqSheet.getDataRange().getValues() : [];
  var settings = setSheet ? setSheet.getDataRange().getValues() : [];

  return jsonResponse({
    success: true,
    data: {
      logs: logs,
      requests: requests,
      settings: settings
    }
  });
}

function getTargetSpreadsheet(customId) {
  if (customId && String(customId).trim().length > 10) {
    try {
      return SpreadsheetApp.openById(String(customId).trim());
    } catch (err) {
      Logger.log("openById failed, falling back to active spreadsheet: " + err);
    }
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var activeSS = SpreadsheetApp.getActiveSpreadsheet();
    
    // 1. ADD LOGIN AUDIT LOG
    if (body.action === "ADD_LOG") {
      var logSheet = activeSS.getSheetByName("Logins") || activeSS.insertSheet("Logins");
      if (logSheet.getLastRow() === 0) {
        logSheet.appendRow(["ID", "Timestamp", "Student Name", "USN", "Email", "Status", "Device", "Reason"]);
      }
      var log = body.log;
      logSheet.appendRow([
        log.id,
        log.timestamp,
        log.student_name,
        log.usn,
        log.email,
        log.status,
        log.device || "",
        log.reason || ""
      ]);
      return jsonResponse({ success: true });
    }
    
    // 2. ADD CHANGE REQUEST
    if (body.action === "ADD_REQUEST") {
      var reqSheet = activeSS.getSheetByName("ChangeRequests") || activeSS.insertSheet("ChangeRequests");
      if (reqSheet.getLastRow() === 0) {
        reqSheet.appendRow(["ID", "Submitted At", "USN", "Name", "Field", "Old Value", "New Value", "Reason", "Status"]);
      }
      var req = body.request;
      reqSheet.appendRow([
        req.id,
        req.submitted_at,
        req.student_usn,
        req.student_name,
        req.field_name,
        req.old_value,
        req.new_value,
        req.reason || "",
        req.status
      ]);
      return jsonResponse({ success: true });
    }
    
    // 3. SET PORTAL LOCK / MAINTENANCE
    if (body.action === "SET_LOCK") {
      var setSheet = activeSS.getSheetByName("Settings") || activeSS.insertSheet("Settings");
      setSheet.getRange("A1:B1").setValues([["is_locked", body.is_locked ? "TRUE" : "FALSE"]]);
      setSheet.getRange("A2:B2").setValues([["lock_reason", body.lock_reason || ""]]);
      return jsonResponse({ success: true });
    }
    
    // 4. SAVE TIMETABLE (Directly to Timetable Master Google Sheet)
    if (body.action === "SAVE_TIMETABLE") {
      var tSS = getTargetSpreadsheet(body.spreadsheetId);
      var tSheet = tSS.getSheetByName("Timetable") || tSS.getSheetByName("Sheet1") || tSS.getSheets()[0];
      
      var existingData = tSheet.getDataRange().getValues();
      var defaultHeader = ["Semester", "Day", "Period", "Timings", "Subject Code", "Subject Name", "Room", "Faculty", "Type"];
      var header = (existingData.length > 0 && existingData[0].length >= 9) ? existingData[0] : defaultHeader;
      
      var targetSem = Number(body.semester) || 3;
      var otherSemRows = [];
      
      // Preserve all rows from other semesters
      for (var r = 1; r < existingData.length; r++) {
        var row = existingData[r];
        if (!row || row.length === 0 || !row[0]) continue;
        var rSem = parseInt(String(row[0]).replace(/\\D/g, ""), 10);
        if (rSem !== targetSem) {
          otherSemRows.push(row);
        }
      }
      
      // Build rows for the updated semester from body.schedule
      var newSemRows = [];
      var schedule = body.schedule || [];
      for (var s = 0; s < schedule.length; s++) {
        var daySchedule = schedule[s];
        var dayName = daySchedule.day;
        var lecs = daySchedule.lectures || [];
        for (var l = 0; l < lecs.length; l++) {
          var lec = lecs[l];
          newSemRows.push([
            targetSem,
            dayName,
            lec.period || (l + 1),
            lec.timings || "",
            lec.subjectCode || "",
            lec.subjectName || "",
            lec.room || "—",
            lec.faculty || "—",
            lec.type || "Theory"
          ]);
        }
      }
      
      // Combine: Header + other semesters + updated semester rows
      var finalRows = [header].concat(otherSemRows).concat(newSemRows);
      
      tSheet.clearContents();
      tSheet.getRange(1, 1, finalRows.length, header.length).setValues(finalRows);
      
      return jsonResponse({
        success: true,
        updatedSemester: targetSem,
        totalRows: finalRows.length
      });
    }
    
    // 5. ADD EXAM DATE (Directly to Exam Dates Master Google Sheet)
    if (body.action === "ADD_EXAM_DATE") {
      var eSS = getTargetSpreadsheet(body.spreadsheetId);
      var eSheet = eSS.getSheetByName("ExamDates") || eSS.getSheetByName("Exams") || eSS.getSheets()[0];
      
      if (eSheet.getLastRow() === 0) {
        eSheet.appendRow(["Semester", "Exam Type", "Date", "Subject Name", "Subject Code", "Timings", "Venue", "Status"]);
      }
      
      var ex = body.exam;
      var dateFormatted = ex.date || "";
      if (dateFormatted && dateFormatted.indexOf("-") !== -1) {
        var dParts = dateFormatted.split("-");
        if (dParts.length === 3 && dParts[0].length === 4) {
          // Convert YYYY-MM-DD -> DD-MM-YY to match existing sheet format (e.g. 26-10-26)
          dateFormatted = dParts[2] + "-" + dParts[1] + "-" + dParts[0].slice(2);
        }
      }
      
      eSheet.appendRow([
        Number(ex.semester) || 3,
        ex.examType || "CAE-1",
        dateFormatted,
        ex.subjectName || "",
        ex.subjectCode || "",
        ex.timings || "10:00 AM - 01:00 PM",
        ex.venue || "—",
        ex.status || "Upcoming"
      ]);
      
      return jsonResponse({ success: true });
    }
    
    // 6. DELETE EXAM DATE
    if (body.action === "DELETE_EXAM_DATE") {
      var dSS = getTargetSpreadsheet(body.spreadsheetId);
      var dSheet = dSS.getSheetByName("ExamDates") || dSS.getSheetByName("Exams") || dSS.getSheets()[0];
      var examRows = dSheet.getDataRange().getValues();
      
      var targetSem = body.semester ? Number(body.semester) : null;
      var targetCode = (body.subjectCode || "").trim().toUpperCase();
      
      for (var er = examRows.length - 1; er >= 1; er--) {
        var eRow = examRows[er];
        var matchSem = !targetSem || Number(eRow[0]) === targetSem;
        var matchCode = !targetCode || String(eRow[4]).trim().toUpperCase() === targetCode;
        
        if (matchSem && matchCode) {
          dSheet.deleteRow(er + 1);
          break;
        }
      }
      
      return jsonResponse({ success: true });
    }
    
    return jsonResponse({ success: true, message: "Action processed" });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
`;
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  // Impersonate / Open Student Portal View
  const handleInspectStudent = (student: Student) => {
    // Close student picker modal
    setShowStudentPickerModal(false);

    const studentToSave: Student = {
      ...student,
      profile_image: student.profile_image || undefined,
    };

    // Immediately update AuthContext state and localStorage with this specific student
    loginAsStudent(studentToSave);

    // Directly open student's homepage
    navigate(ROUTES.DASHBOARD);
  };

  // ----------------------------------------------------
  // RENDER: Admin Login Gate (if not authenticated)
  // ----------------------------------------------------
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-transparent text-slate-900 dark:text-slate-100 flex flex-col justify-between p-4 sm:p-6 transition-colors duration-200">
        <header className="w-full max-w-5xl mx-auto flex items-center justify-between py-2">
          <button
            onClick={() => navigate(ROUTES.LOGIN)}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Student Login</span>
          </button>
          <ThemeToggle />
        </header>

        <main className="flex-1 flex items-center justify-center py-8">
          <div className="w-full max-w-md">
            <div className="bg-white/95 dark:bg-[#0A0A0E]/95 backdrop-blur-md border border-slate-200/90 dark:border-[#222228] rounded-2xl shadow-card dark:shadow-card-dark p-6 sm:p-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#8048A8] via-[#F8D299] to-[#8048A8] opacity-80" />

              <div className="text-center mb-6">
                <div className="inline-flex w-13 h-13 rounded-2xl bg-slate-900 dark:bg-[#141418] border border-slate-800 dark:border-[#2A2A32] text-[#F8D299] items-center justify-center shadow-md mb-3.5 relative">
                  <Shield className="w-7 h-7 text-[#F8D299]" />
                  <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-[#0A0A0E]" />
                </div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Administrator Portal
                </h1>
              </div>

              {/* Error Alert */}
              {googleError && (
                <div className="mb-4 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2.5">
                  <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-rose-900 dark:text-rose-100 mb-0.5">Access Denied</p>
                    <p className="leading-relaxed">{googleError}</p>
                  </div>
                </div>
              )}

              {/* Google Sign In Container (Exclusive Access for Authorized Administrator) */}
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2.5">
                    Sign in with your authorized Google Account
                  </p>
                  <div ref={adminGsiButtonRef} className="flex justify-center w-full min-h-[44px]" />
                  {googleLoading && (
                    <p className="text-xs text-[#8048A8] dark:text-[#D1A7FF] mt-2 animate-pulse">
                      Verifying administrator identity...
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ----------------------------------------------------
  // RENDER: Full Admin Portal Dashboard
  // ----------------------------------------------------
  return (
    <div className="min-h-screen bg-transparent text-slate-900 dark:text-slate-100 flex flex-col justify-between p-3 sm:p-6 lg:p-8 transition-colors duration-200">
      <div className="max-w-7xl mx-auto w-full space-y-6">
        {/* Top Header Navigation */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-[#222228]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 dark:bg-[#16161B] border border-slate-800 dark:border-[#8048A8]/40 flex items-center justify-center text-[#F8D299] shadow-md flex-shrink-0">
              <Shield className="w-5 h-5 text-[#F8D299]" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Admin Portal
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* Authenticated Admin Account Pill */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#16161E] border border-slate-200 dark:border-[#22222C] text-xs">
              {adminUser?.picture ? (
                <img src={adminUser.picture} alt="" className="w-4 h-4 rounded-full object-cover" />
              ) : (
                <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
              )}
              <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold text-[11px] truncate max-w-[170px] sm:max-w-none">
                {adminUser?.email || APP_CONFIG.adminEmail}
              </span>
            </div>



            <ThemeToggle />

            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-lg bg-slate-200/80 dark:bg-[#1C1C24] hover:bg-rose-500 hover:text-white dark:hover:bg-rose-600 text-xs font-medium text-slate-700 dark:text-slate-300 transition-all"
            >
              Sign Out
            </button>
          </div>
        </header>

        {/* Portal Lock Status Banner if locked */}
        {settings.is_locked && (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200 flex items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0" />
              <div className="text-xs">
                <p className="font-bold">Student Portal Access is Currently Locked</p>
                <p className="text-rose-700 dark:text-rose-300 truncate">
                  Students attempting to log in see: &quot;{settings.lock_reason}&quot;
                </p>
              </div>
            </div>
            <button
              onClick={() => adminSheetService.setPortalLock(false).then((s) => { setSettings(s); refreshData(); })}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs whitespace-nowrap shadow-sm"
            >
              Unlock Now
            </button>
          </div>
        )}

        {/* ======================================================== */}
        {/* TOP ROW (Matches Wireframe: Total Logins | Current Students | Lock Portal | Access Any Student) */}
        {/* ======================================================== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 sm:gap-5">
          {/* 1. Total Logins (Wide Box) */}
          <div className="lg:col-span-4 bg-white/95 dark:bg-[#0A0A0E]/95 backdrop-blur-md border border-slate-200/90 dark:border-[#222228] rounded-2xl shadow-card dark:shadow-card-dark p-5 relative overflow-hidden flex flex-col justify-between group">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#8048A8] to-[#F8D299] opacity-75" />
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Total Login Audits
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <Sparkles className="w-3 h-3" /> Live Sheet Sync
                </span>
              </div>

              <div className="flex items-baseline gap-3 my-2">
                <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  {stats.total_logins}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  recorded attempts
                </span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#1E1E26] grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <span className="block text-[10px] text-slate-400">Today</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{stats.today_logins}</span>
              </div>
              <div>
                <span className="block text-[10px] text-emerald-500 font-medium">Successful</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{stats.successful_logins}</span>
              </div>
              <div>
                <span className="block text-[10px] text-rose-500 font-medium">Denied / Unknown</span>
                <span className="font-bold text-rose-600 dark:text-rose-400">{stats.denied_logins}</span>
              </div>
            </div>
          </div>

          {/* 2. Current Students */}
          <div className="lg:col-span-3 bg-white/95 dark:bg-[#0A0A0E]/95 backdrop-blur-md border border-slate-200/90 dark:border-[#222228] rounded-2xl shadow-card dark:shadow-card-dark p-5 relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Current Students
                </span>
                <Users className="w-4 h-4 text-[#8048A8] dark:text-[#D1A7FF]" />
              </div>

              <div className="flex items-baseline gap-2 my-2">
                <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  {stats.current_students_count}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  enrolled
                </span>
              </div>
            </div>


          </div>

          {/* 3. Lock Portal Control Card */}
          <div className={`lg:col-span-2 rounded-2xl shadow-card dark:shadow-card-dark p-5 relative overflow-hidden flex flex-col justify-between transition-all ${
            settings.is_locked
              ? 'bg-rose-50/90 dark:bg-rose-950/20 border-2 border-rose-500/60'
              : 'bg-white/95 dark:bg-[#0A0A0E]/95 border border-slate-200/90 dark:border-[#222228]'
          }`}>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Lock Portal
                </span>
                {settings.is_locked ? (
                  <Lock className="w-4 h-4 text-rose-500" />
                ) : (
                  <Unlock className="w-4 h-4 text-emerald-500" />
                )}
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                {settings.is_locked ? 'Portal is locked for students' : 'Student access permitted'}
              </p>
            </div>

            <button
              onClick={() => setShowLockConfirmModal(true)}
              className={`w-full mt-4 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all ${
                settings.is_locked
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-rose-600 hover:bg-rose-700 text-white'
              }`}
            >
              {settings.is_locked ? (
                <>
                  <Unlock className="w-3.5 h-3.5" /> Unlock Portal
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" /> Lock Portal
                </>
              )}
            </button>
          </div>

          {/* 4. Access Any Student */}
          <div className="lg:col-span-3 bg-white/95 dark:bg-[#0A0A0E]/95 backdrop-blur-md border border-slate-200/90 dark:border-[#222228] rounded-2xl shadow-card dark:shadow-card-dark p-5 relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Access Any Student
                </span>
                <Eye className="w-4 h-4 text-[#F8D299]" />
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Inspect records, semester marks, or view portal as any student
              </p>
            </div>

            <button
              onClick={() => setShowStudentPickerModal(true)}
              className="w-full mt-4 py-2 px-3 rounded-xl bg-slate-900 dark:bg-[#1E1E26] hover:bg-[#8048A8] text-white font-semibold text-xs flex items-center justify-center gap-2 border border-slate-800 dark:border-[#2A2A34] transition-all shadow-sm group"
            >
              <Search className="w-3.5 h-3.5 text-[#F8D299]" />
              <span>Select Student ({allStudents.length})</span>
              <ChevronRight className="w-3.5 h-3.5 ml-auto text-slate-400 group-hover:text-white" />
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* NEW CARD: Academic Management (1. Edit Timetable | 2. Add Exam Dates) */}
        {/* ======================================================== */}
        <div className="bg-white/95 dark:bg-[#0A0A0E]/95 backdrop-blur-md border border-slate-200/90 dark:border-[#222228] rounded-2xl shadow-card dark:shadow-card-dark p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#8048A8] via-[#F8D299] to-[#8048A8] opacity-75" />

          {/* Card Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-5 border-b border-slate-200/80 dark:border-[#202028]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-[#1A1626] border border-purple-200/60 dark:border-purple-800/40 text-[#8048A8] dark:text-[#D1A7FF] flex items-center justify-center font-bold">
                <Calendar className="w-5 h-5 text-[#8048A8] dark:text-[#D1A7FF]" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Academic &amp; Schedule Management</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Live Google Sheets
                  </span>
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Direct administrative controls to update student timetables and publish semester exam dates
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium hidden sm:inline">
                Instant sync with student portal
              </span>
            </div>
          </div>

          {/* 2 Sub-Sections: 1. Edit Timetable & 2. Add Exam Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {/* 1. Edit Timetable */}
            <div className="rounded-xl border border-slate-200/80 dark:border-[#20202C] bg-slate-50/50 dark:bg-[#0E0E14] p-4 sm:p-5 flex flex-col justify-between hover:border-[#8048A8]/40 transition-all group">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-[#8048A8] text-white flex items-center justify-center text-xs font-black shadow-xs">
                      1
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-[#8048A8] dark:text-[#D1A7FF]" />
                      <span>Edit Timetable</span>
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100/70 dark:bg-purple-950/40 text-[#8048A8] dark:text-[#D1A7FF] border border-purple-200 dark:border-purple-800/40">
                    Weekly (Mon–Sat)
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                  Modify class periods, subjects, faculties, timings, and lab venues across Semesters 1, 2, and 3.
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-200/60 dark:border-[#1E1E28]">
                <button
                  type="button"
                  onClick={() => setShowTimetableEditorModal(true)}
                  className="w-full py-2.5 px-3 rounded-xl bg-[#8048A8] hover:bg-[#6c3990] active:scale-[0.99] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Timetable on Website</span>
                </button>

                <a
                  href={`https://docs.google.com/spreadsheets/d/${timetableSheetId}/edit`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-[#2A2A36] bg-white dark:bg-[#161620] hover:bg-slate-100 dark:hover:bg-[#20202C] text-slate-700 dark:text-slate-300 text-[11px] font-semibold flex items-center justify-center gap-1 transition-all"
                  title="Open underlying Google Sheet database"
                >
                  <FileSpreadsheet className="w-3 h-3 text-emerald-500" />
                  <span>View Sheet DB</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            </div>

            {/* 2. Add Exam Dates */}
            <div className="rounded-xl border border-slate-200/80 dark:border-[#20202C] bg-slate-50/50 dark:bg-[#0E0E14] p-4 sm:p-5 flex flex-col justify-between hover:border-amber-500/40 transition-all group">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center text-xs font-black shadow-xs">
                      2
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <CalendarDays className="w-4 h-4 text-amber-500" />
                      <span>Add Exam Dates</span>
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100/70 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40">
                    CAE-1 • CAE-2 • Unit Test • ESE
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                  Publish examination schedules, session timings, subject codes, and hall seating venues.
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-200/60 dark:border-[#1E1E28]">
                <button
                  type="button"
                  onClick={() => setShowExamDatesManagerModal(true)}
                  className="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-[0.99] text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Exam Dates on Website</span>
                </button>

                <a
                  href={`https://docs.google.com/spreadsheets/d/${examDatesSheetId}/edit`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-[#2A2A36] bg-white dark:bg-[#161620] hover:bg-slate-100 dark:hover:bg-[#20202C] text-slate-700 dark:text-slate-300 text-[11px] font-semibold flex items-center justify-center gap-1 transition-all"
                  title="Open underlying Google Sheet database"
                >
                  <FileSpreadsheet className="w-3 h-3 text-emerald-500" />
                  <span>View Sheet DB</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* BOTTOM ROW (Matches Wireframe: Changes Request | Log History) */}
        {/* ======================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* 5. Changes Request (Left Column) */}
          <div className="lg:col-span-5 bg-white/95 dark:bg-[#0A0A0E]/95 backdrop-blur-md border border-slate-200/90 dark:border-[#222228] rounded-2xl shadow-card dark:shadow-card-dark p-5 flex flex-col">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200/80 dark:border-[#222228] mb-4">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Changes Request</span>
                  {stats.pending_change_requests > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                      {stats.pending_change_requests} Pending
                    </span>
                  )}
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Student submissions for record updates & discrepancies
                </p>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#16161D] p-0.5 rounded-lg border border-slate-200 dark:border-[#262630]">
                {(['ALL', 'PENDING', 'APPROVED'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setRequestFilter(st)}
                    className={`px-2 py-1 rounded-md text-[10px] font-semibold transition-all ${
                      requestFilter === st
                        ? 'bg-white dark:bg-[#22222C] text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Change Requests List */}
            <div className="flex-1 space-y-3 overflow-y-auto max-h-[460px] pr-1">
              {filteredRequests.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  No {requestFilter !== 'ALL' ? requestFilter.toLowerCase() : ''} change requests found.
                </div>
              ) : (
                filteredRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-3.5 rounded-xl border border-slate-200/80 dark:border-[#1E1E26] bg-slate-50/50 dark:bg-[#0F0F14] hover:border-slate-300 dark:hover:border-[#2C2C36] transition-all space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900 dark:text-white">
                            {req.student_name}
                          </span>
                          <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-[#1C1C24]">
                            {req.student_usn}
                          </span>
                        </div>
                        <span className="text-[11px] font-semibold text-[#8048A8] dark:text-[#D1A7FF]">
                          Field: {req.field_name}
                        </span>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          req.status === 'APPROVED'
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                            : req.status === 'REJECTED'
                            ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                            : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {req.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] bg-white dark:bg-[#14141A] p-2 rounded-lg border border-slate-200/60 dark:border-[#202028]">
                      <div>
                        <span className="block text-[10px] text-slate-400">Current Value:</span>
                        <span className="text-slate-600 dark:text-slate-300 truncate block">{req.old_value}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-emerald-500 font-medium">Requested Value:</span>
                        <span className="font-semibold text-slate-900 dark:text-white truncate block">{req.new_value}</span>
                      </div>
                    </div>

                    {req.reason && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                        &quot;{req.reason}&quot;
                      </p>
                    )}

                    {req.status === 'PENDING' && (
                      <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100 dark:border-[#1E1E26]">
                        <button
                          onClick={() => handleRequestAction(req.id, 'REJECTED')}
                          className="px-2.5 py-1 rounded-md text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleRequestAction(req.id, 'APPROVED')}
                          className="px-3 py-1 rounded-md text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
                        >
                          Approve
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 6. Log History (Right Column) */}
          <div className="lg:col-span-7 bg-white/95 dark:bg-[#0A0A0E]/95 backdrop-blur-md border border-slate-200/90 dark:border-[#222228] rounded-2xl shadow-card dark:shadow-card-dark p-5 flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-200/80 dark:border-[#222228] mb-4">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Live Login Audit History</span>
                  <span className="text-xs font-normal text-slate-400">({filteredLogs.length})</span>
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Direct sync with Google Sheet &bull; Real-time successful, denied & unknown login attempts</span>
                </p>
              </div>

              {/* Status Filter Tabs (ALL / SUCCESS / DENIED) */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#16161D] p-0.5 rounded-lg border border-slate-200 dark:border-[#262630]">
                {(['ALL', 'SUCCESS', 'DENIED'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setLogStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
                      logStatusFilter === st
                        ? 'bg-white dark:bg-[#22222C] text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {st === 'ALL'
                      ? `All (${logs.length})`
                      : st === 'SUCCESS'
                      ? `Successful (${stats.successful_logins})`
                      : `Denied (${stats.denied_logins})`}
                  </button>
                ))}
              </div>
            </div>

            {/* Search & Actions Toolbar */}
            <div className="flex flex-col sm:flex-row gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  placeholder="Search by student, email, USN, reason, or device..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#262630] bg-slate-50/50 dark:bg-[#121217] text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#8048A8]"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleManualRefresh}
                  disabled={isRefreshing}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-[#2A2A34] bg-white dark:bg-[#16161D] hover:bg-slate-50 dark:hover:bg-[#1E1E26] text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
                  title="Sync live logs directly from Google Sheet"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-[#8048A8] dark:text-[#D1A7FF] ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>{isRefreshing ? 'Syncing...' : 'Sync Live'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-[#2A2A34] bg-white dark:bg-[#16161D] hover:bg-slate-50 dark:hover:bg-[#1E1E26] text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Download logs as CSV"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>CSV</span>
                </button>

                <a
                  href={`https://docs.google.com/spreadsheets/d/${adminSheetId}/edit`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-[#2A2A34] bg-white dark:bg-[#16161D] hover:bg-slate-50 dark:hover:bg-[#20202C] text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-all"
                  title="Open Dashboard Login Google Sheet"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                  <span>View Sheet DB</span>
                  <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                </a>
              </div>
            </div>

            {/* Logs Table */}
            <div className="flex-1 overflow-x-auto max-h-[440px] border border-slate-200/80 dark:border-[#1E1E26] rounded-xl">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-100/80 dark:bg-[#14141B] text-slate-600 dark:text-slate-400 font-semibold sticky top-0 z-10 border-b border-slate-200 dark:border-[#222228]">
                  <tr>
                    <th className="py-2.5 px-3">Student / User</th>
                    <th className="py-2.5 px-3">Email</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Device / Method</th>
                    <th className="py-2.5 px-3 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#181822]">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-slate-400 text-xs">
                        No login entries matched your filter.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => {
                      const isUnknown = log.student_name === 'Unknown User';
                      const isBlocked = log.status === 'BLOCKED';

                      return (
                        <tr
                          key={log.id}
                          className="hover:bg-slate-50 dark:hover:bg-[#101016] transition-colors"
                        >
                          <td className="py-2.5 px-3">
                            {isUnknown ? (
                              <div>
                                <span className="font-semibold text-rose-600 dark:text-rose-400 block truncate max-w-[130px]">
                                  Unknown User
                                </span>
                                <span className="font-mono text-[9px] text-slate-400">Unauthorized</span>
                              </div>
                            ) : (
                              <div>
                                <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate max-w-[130px]">
                                  {log.student_name}
                                </span>
                                <span className="font-mono text-[10px] text-slate-400">{log.usn}</span>
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[10px] text-slate-600 dark:text-slate-300 truncate max-w-[150px]">
                            {log.email}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                log.status === 'SUCCESS'
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                  : isBlocked
                                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                                  : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                              }`}
                            >
                              {log.status === 'SUCCESS' ? (
                                <CheckCircle2 className="w-2.5 h-2.5" />
                              ) : isBlocked ? (
                                <Lock className="w-2.5 h-2.5" />
                              ) : (
                                <XCircle className="w-2.5 h-2.5" />
                              )}
                              {log.status}
                            </span>
                            {log.reason && (
                              <span
                                className="block text-[9px] text-slate-400 dark:text-slate-500 truncate max-w-[140px] mt-0.5"
                                title={log.reason}
                              >
                                {log.reason}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 truncate max-w-[130px]">
                            {log.device}
                          </td>
                          <td className="py-2.5 px-3 text-right text-[10px] text-slate-400 whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}{' '}
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: Access Any Student (Searchable Picker) */}
      {/* ======================================================== */}
      {showStudentPickerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-xl bg-white dark:bg-[#0E0E14] border border-slate-200 dark:border-[#262632] rounded-2xl shadow-2xl p-5 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#222228]">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#8048A8]" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Access Any Student Record
                </h3>
              </div>
              <button
                onClick={() => setShowStudentPickerModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Student Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={studentSearchQuery}
                onChange={(e) => setStudentSearchQuery(e.target.value)}
                placeholder="Search by student name, USN, or email..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-[#2A2A34] bg-slate-50 dark:bg-[#14141B] text-sm focus:outline-none focus:ring-2 focus:ring-[#8048A8]"
                autoFocus
              />
            </div>

            {/* Students List */}
            <div className="flex-1 overflow-y-auto space-y-1.5 divide-y divide-slate-100 dark:divide-[#181822] pr-1">
              {filteredStudents.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No students found matching &quot;{studentSearchQuery}&quot;
                </div>
              ) : (
                filteredStudents.map((st) => (
                  <div
                    key={st.usn}
                    onClick={() => handleInspectStudent(st)}
                    className="pt-1.5 flex items-center justify-between p-2.5 rounded-xl hover:bg-[#8048A8]/10 dark:hover:bg-[#1A1624] border border-transparent hover:border-[#8048A8]/30 transition-all cursor-pointer group"
                    title={`Click to open homepage for ${st.name}`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-[#8048A8] dark:group-hover:text-[#D1A7FF] transition-colors">
                          {st.name}
                        </span>
                        <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded bg-slate-200 dark:bg-[#202028]">
                          {st.usn}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-mono">{st.college_email}</p>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleInspectStudent(st);
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-[#8048A8] hover:bg-[#6c3990] active:scale-95 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all duration-150 touch-manipulation cursor-pointer border border-[#9b5cc4]"
                    >
                      <span>Open Portal</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: Portal Lock / Maintenance Mode Settings */}
      {/* ======================================================== */}
      {showLockConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-[#0E0E14] border border-slate-200 dark:border-[#262632] rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${settings.is_locked ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                {settings.is_locked ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  {settings.is_locked ? 'Unlock Student Portal' : 'Lock Student Portal'}
                </h3>
                <p className="text-xs text-slate-500">
                  {settings.is_locked
                    ? 'Allow all 68 enrolled students to log in and view records'
                    : 'Prevent students from logging in and show maintenance notice'}
                </p>
              </div>
            </div>

            {!settings.is_locked && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Maintenance Notice Message
                </label>
                <textarea
                  value={lockReasonInput}
                  onChange={(e) => setLockReasonInput(e.target.value)}
                  rows={3}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 dark:border-[#2A2A34] bg-slate-50 dark:bg-[#14141B] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#8048A8]"
                  placeholder="e.g. Portal is temporarily locked for Semester 3 grade updating..."
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowLockConfirmModal(false)}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1E1E26]"
              >
                Cancel
              </button>
              <button
                onClick={handleToggleLock}
                disabled={isUpdatingLock}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md flex items-center justify-center gap-1.5 transition-all disabled:opacity-60 ${
                  settings.is_locked ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {isUpdatingLock ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Syncing...</span>
                  </>
                ) : (
                  <span>{settings.is_locked ? 'Confirm Unlock' : 'Confirm Lock Portal'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: How to Setup Google Sheet for Admin Backend */}
      {/* ======================================================== */}
      {showSheetSetupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-3xl bg-white dark:bg-[#0E0E14] border border-slate-200 dark:border-[#262632] rounded-2xl shadow-2xl p-5 sm:p-7 space-y-5 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#222228]">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Google Sheet Setup Guide for Admin Portal
                  </h3>
                  <p className="text-xs text-slate-500">
                    Connect a Google Sheet to permanently store Log History & Change Requests
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSheetSetupModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-5 text-xs text-slate-600 dark:text-slate-300 pr-1">
              {/* Step 1 */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#14141B] border border-slate-200/80 dark:border-[#202028] space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#8048A8] text-white flex items-center justify-center text-[10px]">1</span>
                  Create a new Google Sheet
                </h4>
                <p>
                  Go to <a href="https://sheets.new" target="_blank" rel="noreferrer" className="text-[#8048A8] dark:text-[#D1A7FF] font-semibold underline">sheets.new</a> and create 3 tabs with these exact names:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[11px] pt-1">
                  <div className="p-2 rounded bg-white dark:bg-[#0A0A0E] border border-slate-200 dark:border-[#2A2A34]">
                    <span className="font-bold text-emerald-500 block mb-1">Tab 1: Logins</span>
                    Row 1: ID, Timestamp, Student Name, USN, Email, Status, Device, Reason
                  </div>
                  <div className="p-2 rounded bg-white dark:bg-[#0A0A0E] border border-slate-200 dark:border-[#2A2A34]">
                    <span className="font-bold text-emerald-500 block mb-1">Tab 2: ChangeRequests</span>
                    Row 1: ID, Submitted At, USN, Name, Field, Old Value, New Value, Reason, Status
                  </div>
                  <div className="p-2 rounded bg-white dark:bg-[#0A0A0E] border border-slate-200 dark:border-[#2A2A34]">
                    <span className="font-bold text-emerald-500 block mb-1">Tab 3: Settings</span>
                    A1: is_locked, B1: FALSE<br />
                    A2: lock_reason, B2: Maintenance
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#14141B] border border-slate-200/80 dark:border-[#202028] space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#8048A8] text-white flex items-center justify-center text-[10px]">2</span>
                    Open Extensions &gt; Apps Script &amp; Paste Script
                  </h4>
                  <button
                    onClick={handleCopyScriptCode}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#8048A8] hover:bg-[#6c3990] text-white text-[11px] font-semibold"
                  >
                    {copiedCode ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedCode ? 'Copied!' : 'Copy Script Code'}</span>
                  </button>
                </div>
                <p>
                  In your Google Sheet, click <strong className="text-slate-800 dark:text-white">Extensions &gt; Apps Script</strong>, delete any code inside, and paste the copied code.
                </p>
              </div>

              {/* Step 3 */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#14141B] border border-slate-200/80 dark:border-[#202028] space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#8048A8] text-white flex items-center justify-center text-[10px]">3</span>
                  Deploy as Web App
                </h4>
                <ol className="list-decimal list-inside space-y-1 pl-1">
                  <li>Click <strong>Deploy &gt; New deployment</strong>.</li>
                  <li>Select type: <strong>Web app</strong> (gear icon).</li>
                  <li>Set <strong>Execute as:</strong> &quot;Me&quot;.</li>
                  <li>Set <strong>Who has access:</strong> &quot;Anyone&quot;.</li>
                  <li>Click <strong>Deploy</strong>, grant permissions, and copy the <strong>Web App URL</strong>.</li>
                </ol>
              </div>

              {/* Step 4: Paste Web App URL */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#14141B] border border-slate-200/80 dark:border-[#202028] space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#8048A8] text-white flex items-center justify-center text-[10px]">4</span>
                  Connect Web App URL Here
                </h4>
                <div className="flex gap-2 pt-1">
                  <input
                    type="url"
                    value={scriptUrlInput}
                    onChange={(e) => setScriptUrlInput(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-[#2A2A34] bg-white dark:bg-[#0A0A0E] text-xs font-mono"
                  />
                  <button
                    onClick={handleSaveScriptUrl}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs whitespace-nowrap shadow-sm"
                  >
                    Save &amp; Connect
                  </button>
                </div>
                {savedUrlSuccess && (
                  <p className="text-emerald-600 dark:text-emerald-400 font-semibold text-[11px] flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Web App URL saved successfully!
                  </p>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-[#222228] flex justify-end">
              <button
                onClick={() => setShowSheetSetupModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-[#1E1E26] text-white font-semibold text-xs"
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: In-Website Timetable Editor (Google Sheet as Database) */}
      {/* ======================================================== */}
      {showTimetableEditorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-4xl bg-white dark:bg-[#0E0E14] border border-slate-200 dark:border-[#262632] rounded-3xl shadow-2xl p-4 sm:p-7 space-y-4 sm:space-y-5 max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200/80 dark:border-[#222228]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-[#1A1626] border border-purple-200 dark:border-purple-800/40 text-[#8048A8] dark:text-[#D1A7FF] flex items-center justify-center font-bold flex-shrink-0">
                  <Clock className="w-5 h-5 text-[#8048A8] dark:text-[#D1A7FF]" />
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Timetable Editor</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      Live DB Sync
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Edit lecture periods, subjects, rooms, and faculty directly on the website.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTimetableEditorModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1A1A24] transition-all"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Success alert */}
            {timetableSaveSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Timetable successfully saved and synchronized with Google Sheet database!</span>
              </div>
            )}

            {/* Controls: Semester Selector + Day Selector */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-[#14141C] border border-slate-200/80 dark:border-[#202028]">
              {/* Semester buttons */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mr-1">Semester:</span>
                {[1, 2, 3].map((sem) => (
                  <button
                    key={sem}
                    type="button"
                    onClick={() => setEditorSemester(sem)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                      editorSemester === sem
                        ? 'bg-[#8048A8] text-white shadow-xs'
                        : 'bg-white dark:bg-[#1E1E28] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-zinc-800 hover:bg-slate-100'
                    }`}
                  >
                    Sem {sem}
                  </button>
                ))}
              </div>

              {/* Day Selector */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                {DAYS_OF_WEEK.map((d) => (
                  <button
                    key={d.full}
                    type="button"
                    onClick={() => {
                      setEditorDay(d.full);
                      setShowAddLectureRow(false);
                    }}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                      editorDay === d.full
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                        : 'bg-white dark:bg-[#1E1E28] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-zinc-800 hover:bg-slate-100'
                    }`}
                  >
                    {d.short}
                  </button>
                ))}
              </div>
            </div>

            {/* Lectures List for Selected Day */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{editorDay} Schedule</span>
                  <span className="text-[11px] text-slate-500 font-normal">
                    ({currentDaySchedule.lectures.length} lecture{currentDaySchedule.lectures.length === 1 ? '' : 's'})
                  </span>
                </h4>
                <button
                  type="button"
                  onClick={() => setShowAddLectureRow((prev) => !prev)}
                  className="px-2.5 py-1 rounded-lg bg-[#8048A8]/10 hover:bg-[#8048A8]/20 text-[#8048A8] dark:text-[#D1A7FF] text-xs font-bold flex items-center gap-1 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{showAddLectureRow ? 'Cancel Add' : 'Add Lecture'}</span>
                </button>
              </div>

              {/* Add Lecture Form */}
              {showAddLectureRow && (
                <form
                  onSubmit={handleAddLecture}
                  className="p-4 rounded-2xl border-2 border-[#8048A8]/40 bg-purple-50/40 dark:bg-[#1A1626]/60 space-y-3 animate-in fade-in"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#8048A8] dark:text-[#D1A7FF]">
                      Add New Period for {editorDay}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAddLectureRow(false)}
                      className="text-slate-400 hover:text-slate-600 text-xs"
                    >
                      Dismiss
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Period #
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="8"
                        value={newLecturePeriod}
                        onChange={(e) => setNewLecturePeriod(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-[#121218] text-slate-900 dark:text-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Timings
                      </label>
                      <input
                        type="text"
                        value={newLectureTimings}
                        onChange={(e) => setNewLectureTimings(e.target.value)}
                        placeholder="09:15 AM - 10:15 AM"
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-[#121218] text-slate-900 dark:text-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Subject Code
                      </label>
                      <input
                        type="text"
                        value={newLectureCode}
                        onChange={(e) => setNewLectureCode(e.target.value)}
                        placeholder="e.g. CS301"
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-[#121218] text-slate-900 dark:text-white uppercase font-bold"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Subject Name
                      </label>
                      <input
                        type="text"
                        value={newLectureName}
                        onChange={(e) => setNewLectureName(e.target.value)}
                        placeholder="Data Structures"
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-[#121218] text-slate-900 dark:text-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Classroom / Hall
                      </label>
                      <input
                        type="text"
                        value={newLectureRoom}
                        onChange={(e) => setNewLectureRoom(e.target.value)}
                        placeholder="Hall 304 / Lab 2"
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-[#121218] text-slate-900 dark:text-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Faculty Name
                      </label>
                      <input
                        type="text"
                        value={newLectureFaculty}
                        onChange={(e) => setNewLectureFaculty(e.target.value)}
                        placeholder="Prof. Sharma"
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-[#121218] text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Type
                      </label>
                      <select
                        value={newLectureType}
                        onChange={(e) => setNewLectureType(e.target.value as any)}
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-[#121218] text-slate-900 dark:text-white"
                      >
                        <option value="Theory">Theory</option>
                        <option value="Lab">Lab</option>
                        <option value="Tutorial">Tutorial</option>
                      </select>
                    </div>

                    <div className="flex items-end">
                      <button
                        type="submit"
                        className="w-full py-1.5 px-3 rounded-xl bg-[#8048A8] hover:bg-[#6c3990] text-white font-bold text-xs shadow-sm transition-all"
                      >
                        + Add Period
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Current Lectures */}
              {isLoadingTimetable ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Loading Semester {editorSemester} timetable...
                </div>
              ) : currentDaySchedule.lectures.length === 0 ? (
                <div className="py-12 text-center text-slate-400 border border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl p-6 text-xs">
                  <Clock className="w-6 h-6 mx-auto mb-2 text-slate-300 dark:text-zinc-600" />
                  <p className="font-semibold text-slate-600 dark:text-slate-300">No lectures scheduled for {editorDay}</p>
                  <p className="text-[11px] text-slate-400 mt-1">Click &quot;Add Lecture&quot; above to add periods for this day.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {currentDaySchedule.lectures.map((lec) => (
                    <div
                      key={lec.id}
                      className="p-3 rounded-2xl border border-slate-200/90 dark:border-[#22222E] bg-white dark:bg-[#121218] flex items-center justify-between gap-3 shadow-xs hover:border-[#8048A8]/40 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-[#8048A8] dark:text-[#D1A7FF] flex items-center justify-center font-black text-xs flex-shrink-0">
                          {lec.period}
                        </span>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                              {lec.subjectCode}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md border bg-slate-100 dark:bg-[#1A1A24] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-zinc-800">
                              {lec.type}
                            </span>
                            <span className="text-xs text-slate-500 font-mono">
                              {lec.timings}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                            <span className="truncate">{lec.subjectName}</span>
                            <span>•</span>
                            <span className="truncate font-medium text-slate-600 dark:text-slate-300">{lec.room}</span>
                            {lec.faculty && (
                              <>
                                <span>•</span>
                                <span className="truncate">{lec.faculty}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteLecture(lec.id)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all flex-shrink-0"
                        title="Delete Lecture"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-slate-200/80 dark:border-[#222228] flex items-center justify-between gap-3">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono hidden sm:inline">
                Database: {timetableSheetId.slice(0, 16)}...
              </span>

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => setShowTimetableEditorModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1E1E26] transition-all"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleSaveTimetable}
                  disabled={isSavingTimetable}
                  className="px-5 py-2 rounded-xl bg-[#8048A8] hover:bg-[#6c3990] active:scale-95 text-white font-bold text-xs shadow-md flex items-center gap-1.5 transition-all disabled:opacity-60 cursor-pointer"
                >
                  {isSavingTimetable ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving to Database...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Timetable to Database</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 5: In-Website Exam Dates Manager (Google Sheet as Database) */}
      {/* ======================================================== */}
      {showExamDatesManagerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-4xl bg-white dark:bg-[#0E0E14] border border-slate-200 dark:border-[#262632] rounded-3xl shadow-2xl p-4 sm:p-7 space-y-4 sm:space-y-5 max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200/80 dark:border-[#222228]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-[#1F1910] border border-amber-200 dark:border-amber-800/40 text-amber-500 flex items-center justify-center font-bold flex-shrink-0">
                  <CalendarDays className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Exam Dates Manager</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      Live DB Sync
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Add and publish exam schedules directly from the website. Synced with Google Sheet.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowExamDatesManagerModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1A1A24] transition-all"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Success alert */}
            {examSaveSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>New exam date added and saved to Google Sheet database!</span>
              </div>
            )}

            {/* Add Exam Form */}
            <form
              onSubmit={handleAddExam}
              className="p-4 rounded-2xl border border-slate-200/90 dark:border-[#20202C] bg-slate-50/70 dark:bg-[#121218] space-y-3"
            >
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-amber-500" />
                <span>Add New Exam Schedule</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Semester
                  </label>
                  <select
                    value={newExamSemester}
                    onChange={(e) => setNewExamSemester(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-[#1A1A24] text-slate-900 dark:text-white"
                  >
                    <option value="1">Semester 1</option>
                    <option value="2">Semester 2</option>
                    <option value="3">Semester 3</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Exam Category
                  </label>
                  <select
                    value={newExamType}
                    onChange={(e) => setNewExamType(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-[#1A1A24] text-slate-900 dark:text-white"
                  >
                    <option value="CAE-1">CAE-1</option>
                    <option value="CAE-2">CAE-2</option>
                    <option value="Unit Test">Unit Test</option>
                    <option value="ESE">End Semester Exam (ESE)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Subject Code
                  </label>
                  <input
                    type="text"
                    value={newExamCode}
                    onChange={(e) => setNewExamCode(e.target.value)}
                    placeholder="e.g. CS301"
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-[#1A1A24] text-slate-900 dark:text-white uppercase font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Subject Name
                  </label>
                  <input
                    type="text"
                    value={newExamName}
                    onChange={(e) => setNewExamName(e.target.value)}
                    placeholder="Data Structures"
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-[#1A1A24] text-slate-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Exam Date
                  </label>
                  <input
                    type="date"
                    value={newExamDate}
                    onChange={(e) => setNewExamDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-[#1A1A24] text-slate-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Timings
                  </label>
                  <input
                    type="text"
                    value={newExamTimings}
                    onChange={(e) => setNewExamTimings(e.target.value)}
                    placeholder="10:00 AM - 01:00 PM"
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-[#1A1A24] text-slate-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Venue / Hall
                  </label>
                  <input
                    type="text"
                    value={newExamVenue}
                    onChange={(e) => setNewExamVenue(e.target.value)}
                    placeholder="Hall B-102"
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-[#1A1A24] text-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={isSavingExam}
                    className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-all disabled:opacity-60 cursor-pointer"
                  >
                    {isSavingExam ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add &amp; Save Exam</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>

            {/* Filter & Scheduled Exams List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              <div className="flex items-center justify-between pb-1">
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  Scheduled Exams ({filteredExamDates.length})
                </h4>

                <div className="flex items-center gap-1">
                  {(['ALL', '1', '2', '3'] as const).map((sf) => (
                    <button
                      key={sf}
                      type="button"
                      onClick={() => setExamSemesterFilter(sf)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                        examSemesterFilter === sf
                          ? 'bg-amber-500 text-slate-950 shadow-xs'
                          : 'bg-slate-100 dark:bg-[#1A1A24] text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      {sf === 'ALL' ? 'All Sems' : `Sem ${sf}`}
                    </button>
                  ))}
                </div>
              </div>

              {isLoadingExams ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Loading scheduled exams...
                </div>
              ) : filteredExamDates.length === 0 ? (
                <div className="py-12 text-center text-slate-400 border border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl p-6 text-xs">
                  <CalendarDays className="w-6 h-6 mx-auto mb-2 text-slate-300 dark:text-zinc-600" />
                  <p className="font-semibold text-slate-600 dark:text-slate-300">No exams scheduled yet</p>
                  <p className="text-[11px] text-slate-400 mt-1">Use the form above to add an exam date.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredExamDates.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-2xl border border-slate-200/90 dark:border-[#22222E] bg-white dark:bg-[#121218] flex items-center justify-between gap-3 shadow-xs hover:border-amber-400/50 transition-all"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${
                            item.examType.toUpperCase().includes('UNIT') || item.examType.toUpperCase().startsWith('UT')
                              ? 'bg-emerald-100/80 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40'
                              : item.examType.toUpperCase().includes('CAE-1')
                              ? 'bg-indigo-100/80 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/40'
                              : item.examType.toUpperCase().includes('CAE-2')
                              ? 'bg-purple-100/80 dark:bg-purple-950/50 text-[#8048A8] dark:text-[#D1A7FF] border-purple-200 dark:border-purple-800/40'
                              : 'bg-amber-100/80 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/40'
                          }`}>
                            Sem {item.semester} • {item.examType}
                          </span>
                          <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                            {item.subjectCode}
                          </span>
                          <span className="text-xs text-slate-500 font-mono">
                            {item.formattedDate || item.date}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                          <span className="truncate">{item.subjectName}</span>
                          <span>•</span>
                          <span className="font-mono">{item.timings}</span>
                          {item.venue && (
                            <>
                              <span>•</span>
                              <span className="font-medium text-slate-600 dark:text-slate-300">{item.venue}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteExam(item.id)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all flex-shrink-0"
                        title="Delete Exam Date"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-slate-200/80 dark:border-[#222228] flex items-center justify-between gap-3">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono hidden sm:inline">
                Database: {examDatesSheetId.slice(0, 16)}...
              </span>

              <button
                type="button"
                onClick={() => setShowExamDatesManagerModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-[#1E1E26] text-white font-semibold text-xs ml-auto transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPortalPage;
