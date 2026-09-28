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
  Mail,
} from 'lucide-react';
import { adminSheetService } from '../../services/adminSheetService';
import { AUTHORIZED_STUDENTS_ROSTER } from '../../data/studentsRoster';
import { LoginLog, ChangeRequest, PortalSettings, AdminStats } from '../../types/admin';
import { Student } from '../../types/auth';
import { ThemeToggle } from '../../components/common/ThemeToggle';
import { ROUTES } from '../../utils/constants';
import { useAuth } from '../../hooks/useAuth';

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
  const [logFilter, setLogFilter] = useState<'ALL' | 'SUCCESS' | 'DENIED'>('ALL');
  const [requestFilter, setRequestFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');

  // Modals & Panels
  const [showSheetSetupModal, setShowSheetSetupModal] = useState(false);
  const [showStudentPickerModal, setShowStudentPickerModal] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [showLockConfirmModal, setShowLockConfirmModal] = useState(false);
  const [lockReasonInput, setLockReasonInput] = useState(settings.lock_reason || 'System maintenance in progress.');
  const [copiedCode, setCopiedCode] = useState(false);

  // Script URL Configuration
  const [scriptUrlInput, setScriptUrlInput] = useState(() => adminSheetService.getScriptUrl());
  const [savedUrlSuccess, setSavedUrlSuccess] = useState(false);

  // All 68 students list
  const allStudents = useMemo(() => {
    return AUTHORIZED_STUDENTS_ROSTER;
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

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch =
        log.student_name.toLowerCase().includes(logSearch.toLowerCase()) ||
        log.email.toLowerCase().includes(logSearch.toLowerCase()) ||
        log.usn.toLowerCase().includes(logSearch.toLowerCase()) ||
        (log.device && log.device.toLowerCase().includes(logSearch.toLowerCase()));

      const matchesStatus =
        logFilter === 'ALL' ||
        (logFilter === 'SUCCESS' && log.status === 'SUCCESS') ||
        (logFilter === 'DENIED' && (log.status === 'DENIED' || log.status === 'BLOCKED'));

      return matchesSearch && matchesStatus;
    });
  }, [logs, logSearch, logFilter]);

  // Filtered Change Requests
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      if (requestFilter === 'ALL') return true;
      return r.status === requestFilter;
    });
  }, [requests, requestFilter]);

  // Refresh All Data from Google Sheet and Local Storage
  const refreshData = async () => {
    try {
      const live = await adminSheetService.fetchLiveFromSheet();
      if (live.success) {
        setLogs(live.logs);
        setRequests(live.requests);
        setSettings(live.settings);
      } else {
        setLogs(adminSheetService.getLogs());
        setRequests(adminSheetService.getChangeRequests());
        setSettings(adminSheetService.getPortalSettings());
      }
    } catch {
      setLogs(adminSheetService.getLogs());
      setRequests(adminSheetService.getChangeRequests());
      setSettings(adminSheetService.getPortalSettings());
    } finally {
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
      const clientId =
        import.meta.env.VITE_GOOGLE_CLIENT_ID ||
        '680316571772-18ug4g3si6294lh7i78elk9q4rir0es6.apps.googleusercontent.com';
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
                        `Access Denied: The account "${email}" is not authorized. Only 2007aniketsonwane@gmail.com has administrative access.`
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
    const nextLocked = !settings.is_locked;
    const updated = await adminSheetService.setPortalLock(nextLocked, lockReasonInput);
    setSettings(updated);
    setStats(adminSheetService.getAdminStats());
    setShowLockConfirmModal(false);
  };

  // Handle Request Status Update
  const handleRequestAction = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    await adminSheetService.updateChangeRequestStatus(id, status);
    refreshData();
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
 * Google Apps Script for Student Portal Admin Backend
 * Paste this in: Extensions > Apps Script in your Google Spreadsheet
 */
function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Logins");
  var data = [];
  if (sheet) {
    data = sheet.getDataRange().getValues();
  }
  return ContentService.createTextOutput(JSON.stringify({ success: true, data: data }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    if (body.action === "ADD_LOG") {
      var logSheet = ss.getSheetByName("Logins") || ss.insertSheet("Logins");
      if (logSheet.getLastRow() === 0) {
        logSheet.appendRow(["ID", "Timestamp", "Student Name", "USN", "Email", "Status", "Device", "Reason"]);
      }
      var log = body.log;
      logSheet.appendRow([log.id, log.timestamp, log.student_name, log.usn, log.email, log.status, log.device || "", log.reason || ""]);
    }
    
    if (body.action === "ADD_REQUEST") {
      var reqSheet = ss.getSheetByName("ChangeRequests") || ss.insertSheet("ChangeRequests");
      if (reqSheet.getLastRow() === 0) {
        reqSheet.appendRow(["ID", "Submitted At", "USN", "Name", "Field", "Old Value", "New Value", "Reason", "Status"]);
      }
      var req = body.request;
      reqSheet.appendRow([req.id, req.submitted_at, req.student_usn, req.student_name, req.field_name, req.old_value, req.new_value, req.reason || "", req.status]);
    }
    
    if (body.action === "SET_LOCK") {
      var setSheet = ss.getSheetByName("Settings") || ss.insertSheet("Settings");
      setSheet.getRange("A1:B1").setValues([["is_locked", body.is_locked ? "TRUE" : "FALSE"]]);
      setSheet.getRange("A2:B2").setValues([["lock_reason", body.lock_reason || ""]]);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;
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
                <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#8048A8]/10 dark:bg-[#8048A8]/20 border border-[#8048A8]/30 text-xs">
                  <Mail className="w-3 h-3 text-[#8048A8] dark:text-[#D1A7FF]" />
                  <span className="font-mono font-medium text-[#8048A8] dark:text-[#D1A7FF]">
                    2007aniketsonwane@gmail.com
                  </span>
                </div>
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

              {/* Google Sign In Container (Exclusive Access for 2007aniketsonwane@gmail.com) */}
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
                {adminUser?.email || '2007aniketsonwane@gmail.com'}
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
                  Total Logins
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <Sparkles className="w-3 h-3" /> Live Active
                </span>
              </div>

              <div className="flex items-baseline gap-3 my-2">
                <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  {stats.total_logins}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  across all student sessions
                </span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#1E1E26] grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <span className="block text-[10px] text-slate-400">Today</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{stats.today_logins}</span>
              </div>
              <div>
                <span className="block text-[10px] text-emerald-500">Allowed</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{stats.successful_logins}</span>
              </div>
              <div>
                <span className="block text-[10px] text-rose-500">Blocked</span>
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
                  <span>Log history</span>
                  <span className="text-xs font-normal text-slate-400">({filteredLogs.length})</span>
                </h2>
              </div>


            </div>

            {/* Search & Filter Toolbar */}
            <div className="flex flex-col sm:flex-row gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  placeholder="Search by student, email, USN, or device..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#262630] bg-slate-50/50 dark:bg-[#121217] text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#8048A8]"
                />
              </div>

              <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#16161D] p-0.5 rounded-lg border border-slate-200 dark:border-[#262630]">
                {(['ALL', 'SUCCESS', 'DENIED'] as const).map((flt) => (
                  <button
                    key={flt}
                    onClick={() => setLogFilter(flt)}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all ${
                      logFilter === flt
                        ? 'bg-white dark:bg-[#22222C] text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {flt}
                  </button>
                ))}
              </div>
            </div>

            {/* Logs Table */}
            <div className="flex-1 overflow-x-auto max-h-[440px] border border-slate-200/80 dark:border-[#1E1E26] rounded-xl">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-100/80 dark:bg-[#14141B] text-slate-600 dark:text-slate-400 font-semibold sticky top-0 z-10 border-b border-slate-200 dark:border-[#222228]">
                  <tr>
                    <th className="py-2.5 px-3">Student</th>
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
                        No log entries matched your filter.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr
                        key={log.id}
                        className="hover:bg-slate-50 dark:hover:bg-[#101016] transition-colors"
                      >
                        <td className="py-2.5 px-3">
                          <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate max-w-[130px]">
                            {log.student_name}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">{log.usn}</span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[10px] text-slate-600 dark:text-slate-300 truncate max-w-[150px]">
                          {log.email}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              log.status === 'SUCCESS'
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {log.status === 'SUCCESS' ? (
                              <CheckCircle2 className="w-2.5 h-2.5" />
                            ) : (
                              <XCircle className="w-2.5 h-2.5" />
                            )}
                            {log.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 truncate max-w-[130px]">
                          {log.device}
                        </td>
                        <td className="py-2.5 px-3 text-right text-[10px] text-slate-400 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))
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
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md ${
                  settings.is_locked ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {settings.is_locked ? 'Confirm Unlock' : 'Confirm Lock Portal'}
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
    </div>
  );
};

export default AdminPortalPage;
