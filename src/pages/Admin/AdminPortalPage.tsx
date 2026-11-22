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
  Check,
  AlertTriangle,
  ArrowLeft,
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
  Bell,
  FileText,
  Upload,
  UserX,
  FolderUp,
} from 'lucide-react';
import { adminSheetService } from '../../services/adminSheetService';
import { profileService } from '../../services/profile';
import { timetableService, DAYS_OF_WEEK, TIMETABLE_TIMINGS_PRESETS } from '../../services/timetable';
import { examDatesService } from '../../services/examDates';
import { noticeService } from '../../services/noticeService';
import { semesterDataService, SemesterDriveFile, formatFileSize } from '../../services/semesterData';
import { DaySchedule, LectureItem, DayName } from '../../types/timetable';
import { ExamDateItem, ExamType } from '../../types/exam';
import { NoticeItem, NoticeDocument } from '../../types/notice';
import { LoginLog, ChangeRequest, PortalSettings, AdminStats, BlockedUser } from '../../types/admin';
import { Student } from '../../types/auth';
import { ThemeToggle } from '../../components/common/ThemeToggle';
import { ROUTES, APP_CONFIG } from '../../utils/constants';
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
  const [hasAdminGsiButton, setHasAdminGsiButton] = useState(false);
  const adminGsiButtonRef = useRef<HTMLDivElement>(null);

  // Dashboard Data State
  const [stats, setStats] = useState<AdminStats>(() => adminSheetService.getAdminStats());
  const [logs, setLogs] = useState<LoginLog[]>(() => adminSheetService.getLogs());
  const [requests, setRequests] = useState<ChangeRequest[]>(() => adminSheetService.getChangeRequests());
  const [settings, setSettings] = useState<PortalSettings>(() => adminSheetService.getPortalSettings());

  // Search & Filter States
  const [logSearch, setLogSearch] = useState('');

  // Modals & Panels
  const [showStudentPickerModal, setShowStudentPickerModal] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [showLockConfirmModal, setShowLockConfirmModal] = useState(false);
  const [lockReasonInput, setLockReasonInput] = useState(settings.lock_reason || 'System maintenance in progress.');
  const [isUpdatingLock, setIsUpdatingLock] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Academic Management States
  const [showTimetableEditorModal, setShowTimetableEditorModal] = useState(false);
  const [showExamDatesManagerModal, setShowExamDatesManagerModal] = useState(false);
  const [showNoticesManagerModal, setShowNoticesManagerModal] = useState(false);
  const [showBlockedUsersModal, setShowBlockedUsersModal] = useState(false);
  const [showSemesterDataUploadModal, setShowSemesterDataUploadModal] = useState(false);

  // Semester Data Files Upload State
  const [semDataUploadSemester, setSemDataUploadSemester] = useState<number>(3);
  const [semDataSubject, setSemDataSubject] = useState<string>('');
  const [semDataTopic, setSemDataTopic] = useState<string>('');
  const [semAutoRename, setSemAutoRename] = useState<boolean>(true);
  const [semFilesToUpload, setSemFilesToUpload] = useState<Array<{ name: string; type: string; base64: string; size: number }>>([]);
  const [isUploadingSemFiles, setIsUploadingSemFiles] = useState(false);
  const [semUploadSuccessMsg, setSemUploadSuccessMsg] = useState<string | null>(null);
  const [semUploadErrorMsg, setSemUploadErrorMsg] = useState<string | null>(null);
  const [existingSemFiles, setExistingSemFiles] = useState<SemesterDriveFile[]>([]);
  const [isLoadingExistingSemFiles, setIsLoadingExistingSemFiles] = useState(false);
  const [isDeletingSemFileId, setIsDeletingSemFileId] = useState<string | null>(null);
  const [semFilesFilterQuery, setSemFilesFilterQuery] = useState('');
  const [showSemUploadForm, setShowSemUploadForm] = useState(false);

  // Blocked Users Management state
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>(() => adminSheetService.getBlockedUsers());
  const [isLoadingBlockedUsers, setIsLoadingBlockedUsers] = useState(false);
  const [newBlockUserId, setNewBlockUserId] = useState('');
  const [newBlockStudentName, setNewBlockStudentName] = useState('');
  const [newBlockReason, setNewBlockReason] = useState('');
  const [isSubmittingBlock, setIsSubmittingBlock] = useState(false);
  const [isUnblockingUserId, setIsUnblockingUserId] = useState<string | null>(null);
  const [blockActionMessage, setBlockActionMessage] = useState<string | null>(null);

  // Students list loaded dynamically
  const [allStudents, setAllStudents] = useState<Student[]>(() => profileService.getAllLocal());

  // Blocked Users Filters & Inline block states
  const [blockStatusFilter, setBlockStatusFilter] = useState<'ALL' | 'BLOCKED' | 'ACTIVE'>('ALL');
  const [blockSearchQuery, setBlockSearchQuery] = useState('');
  const [showManualBlockRow, setShowManualBlockRow] = useState(false);
  const [blockingUserId, setBlockingUserId] = useState<string | null>(null);
  const [blockingStudentName, setBlockingStudentName] = useState<string>('');
  const [blockingReasonInput, setBlockingReasonInput] = useState<string>('Administrative hold');

  // Change Details Modal state
  const [showChangeRequestsModal, setShowChangeRequestsModal] = useState<boolean>(false);
  const [changeSearchQuery, setChangeSearchQuery] = useState<string>('');
  const [changeActionMessage, setChangeActionMessage] = useState<string | null>(null);
  const [resolvingRequestId, setResolvingRequestId] = useState<string | null>(null);

  // Notices Manager state
  const [allNotices, setAllNotices] = useState<NoticeItem[]>([]);
  const [isLoadingNotices, setIsLoadingNotices] = useState(false);
  const [isPublishingNotice, setIsPublishingNotice] = useState(false);
  const [noticePublishSuccess, setNoticePublishSuccess] = useState(false);
  const [noticeError, setNoticeError] = useState('');
  const [noticeSemesterFilter, setNoticeSemesterFilter] = useState<'ALL' | number>('ALL');
  const [noticeSearchQuery, setNoticeSearchQuery] = useState<string>('');
  const [showAddNoticeRow, setShowAddNoticeRow] = useState<boolean>(false);

  // New Notice Form
  const [newNoticeId, setNewNoticeId] = useState<string>(
    () => `NTC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [newNoticeSemester, setNewNoticeSemester] = useState<'ALL' | number>('ALL');
  const [newNoticeTitle, setNewNoticeTitle] = useState<string>('');
  const [newNoticeContent, setNewNoticeContent] = useState<string>('');
  const [newNoticeLinks, setNewNoticeLinks] = useState<string>('');
  const [newNoticeFiles, setNewNoticeFiles] = useState<Array<{ name: string; type: string; base64: string }>>([]);

  // Editing existing Notice
  const [editingNoticeId, setEditingNoticeId] = useState<string | null>(null);
  const [editNoticeSemester, setEditNoticeSemester] = useState<'ALL' | number>('ALL');
  const [editNoticeTitle, setEditNoticeTitle] = useState<string>('');
  const [editNoticeContent, setEditNoticeContent] = useState<string>('');
  const [editNoticeLinks, setEditNoticeLinks] = useState<string>('');
  const [editNoticeDocuments, setEditNoticeDocuments] = useState<NoticeDocument[]>([]);
  const [editNoticeDeletedDocuments, setEditNoticeDeletedDocuments] = useState<NoticeDocument[]>([]);
  const [editNoticeNewFiles, setEditNoticeNewFiles] = useState<Array<{ name: string; type: string; base64: string }>>([]);
  const [isUpdatingNotice, setIsUpdatingNotice] = useState<boolean>(false);

  // Timetable Editor state
  const [editorSemester, setEditorSemester] = useState<number>(3);
  const [editorDay, setEditorDay] = useState<DayName>('Monday');
  const [editorSchedule, setEditorSchedule] = useState<DaySchedule[]>([]);
  const [isLoadingTimetable, setIsLoadingTimetable] = useState(false);
  const [isSavingTimetable, setIsSavingTimetable] = useState(false);
  const [timetableSaveSuccess, setTimetableSaveSuccess] = useState(false);

  // New Lecture Form inside Timetable Editor
  const [newLecturePeriod, setNewLecturePeriod] = useState<number>(1);
  const [newLectureTimings, setNewLectureTimings] = useState<string>('10:30 AM - 11:30 AM');
  const [newLectureCode, setNewLectureCode] = useState<string>('');
  const [newLectureName, setNewLectureName] = useState<string>('');
  const [newLectureRoom, setNewLectureRoom] = useState<string>('Hall 304');
  const [newLectureFaculty, setNewLectureFaculty] = useState<string>('');
  const [newLectureType, setNewLectureType] = useState<'Theory' | 'Lab' | 'Tutorial'>('Theory');
  const [showAddLectureRow, setShowAddLectureRow] = useState<boolean>(false);

  // Editing existing lecture inside Timetable Editor
  const [editingLectureId, setEditingLectureId] = useState<string | null>(null);
  const [editLecturePeriod, setEditLecturePeriod] = useState<number>(1);
  const [editLectureTimings, setEditLectureTimings] = useState<string>('10:30 AM - 11:30 AM');
  const [editLectureCode, setEditLectureCode] = useState<string>('');
  const [editLectureName, setEditLectureName] = useState<string>('');
  const [editLectureRoom, setEditLectureRoom] = useState<string>('Hall 304');
  const [editLectureFaculty, setEditLectureFaculty] = useState<string>('');
  const [editLectureType, setEditLectureType] = useState<'Theory' | 'Lab' | 'Tutorial'>('Theory');

  // Exam Dates Manager state
  const [allExamDates, setAllExamDates] = useState<ExamDateItem[]>([]);
  const [examSemesterFilter, setExamSemesterFilter] = useState<'ALL' | '1' | '2' | '3'>('ALL');
  const [examTypeFilter, setExamTypeFilter] = useState<'ALL' | 'CAE-1' | 'CAE-2' | 'Unit Test' | 'ESE'>('ALL');
  const [isLoadingExams, setIsLoadingExams] = useState(false);
  const [isSavingExam, setIsSavingExam] = useState(false);
  const [examSaveSuccess, setExamSaveSuccess] = useState(false);
  const [showAddExamRow, setShowAddExamRow] = useState<boolean>(false);

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

  // Editing existing Exam Date
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [editExamSemester, setEditExamSemester] = useState<number>(3);
  const [editExamType, setEditExamType] = useState<ExamType>('CAE-1');
  const [editExamCode, setEditExamCode] = useState<string>('');
  const [editExamName, setEditExamName] = useState<string>('');
  const [editExamDate, setEditExamDate] = useState<string>('');
  const [editExamTimings, setEditExamTimings] = useState<string>('10:00 AM - 01:00 PM');
  const [editExamVenue, setEditExamVenue] = useState<string>('Hall B-102');
  const [editExamStatus, setEditExamStatus] = useState<'Upcoming' | 'Today' | 'Completed'>('Upcoming');


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
    let list = allExamDates;
    if (examSemesterFilter !== 'ALL') {
      list = list.filter((e) => e.semester === Number(examSemesterFilter));
    }
    if (examTypeFilter !== 'ALL') {
      list = list.filter((e) => e.examType === examTypeFilter || e.examType.toUpperCase().includes(examTypeFilter.toUpperCase()));
    }
    return list;
  }, [allExamDates, examSemesterFilter, examTypeFilter]);

  // Filtered notices in manager
  const filteredNotices = useMemo(() => {
    let list = allNotices;
    if (noticeSemesterFilter !== 'ALL') {
      list = list.filter((n) => {
        if (!n.semester || n.semester === 'ALL') return true;
        return Number(n.semester) === Number(noticeSemesterFilter);
      });
    }
    if (noticeSearchQuery.trim()) {
      const q = noticeSearchQuery.toLowerCase().trim();
      list = list.filter((n) => {
        const matchTitle = (n.title || '').toLowerCase().includes(q);
        const matchContent = (n.content || '').toLowerCase().includes(q);
        const matchId = (n.id || '').toLowerCase().includes(q);
        const matchDoc = (n.documentName || '').toLowerCase().includes(q);
        return matchTitle || matchContent || matchId || matchDoc;
      });
    }
    return list;
  }, [allNotices, noticeSemesterFilter, noticeSearchQuery]);

  // Load notices whenever notice manager opens
  useEffect(() => {
    if (showNoticesManagerModal) {
      setIsLoadingNotices(true);
      noticeService.fetchNotices(true).then((res) => {
        if (res.success && res.data) {
          setAllNotices(res.data);
        }
        setIsLoadingNotices(false);
      });
    }
  }, [showNoticesManagerModal]);

  // Load blocked users & students whenever blocked users manager opens
  useEffect(() => {
    if (showBlockedUsersModal) {
      setIsLoadingBlockedUsers(true);
      adminSheetService.fetchBlockedUsers(true).then((list) => {
        if (Array.isArray(list)) setBlockedUsers(list);
        setIsLoadingBlockedUsers(false);
      });
      if (!allStudents || allStudents.length === 0) {
        profileService.fetchAllStudents().then((res) => {
          if (res.success && res.data && res.data.length > 0) {
            setAllStudents(res.data);
          }
        });
      }
    }
  }, [showBlockedUsersModal]);

  // Display students with block status, filtered by semester, status, and search query
  const displayStudents = useMemo(() => {
    const mappedStudents = allStudents.map((st) => {
      const blockedInfo = adminSheetService.checkIfStudentIsBlocked([
        st.student_id,
        st.usn,
        st.google_email,
        st.college_email,
      ]);
      return {
        id: st.usn || st.student_id,
        name: st.name,
        email: st.college_email || st.google_email || '',
        semester: st.current_semester || 3,
        isCustomEntry: false,
        isBlocked: Boolean(blockedInfo),
        blockedInfo: blockedInfo || undefined,
      };
    });

    const existingIds = new Set(
      mappedStudents.flatMap((s) => [
        s.id.toLowerCase(),
        s.email.toLowerCase(),
        (s.blockedInfo?.userId || '').toLowerCase(),
      ])
    );

    const customBlocked = blockedUsers
      .filter((b) => !existingIds.has((b.userId || '').trim().toLowerCase()))
      .map((b) => ({
        id: b.userId,
        name: b.studentName || 'Custom Blocked User',
        email: b.userId.includes('@') ? b.userId : '',
        semester: 'N/A' as any,
        isCustomEntry: true,
        isBlocked: true,
        blockedInfo: b,
      }));

    let combined = [...customBlocked, ...mappedStudents];

    if (blockStatusFilter === 'BLOCKED') {
      combined = combined.filter((s) => s.isBlocked);
    } else if (blockStatusFilter === 'ACTIVE') {
      combined = combined.filter((s) => !s.isBlocked);
    }

    if (blockSearchQuery.trim()) {
      const q = blockSearchQuery.toLowerCase().trim();
      combined = combined.filter(
        (s) =>
          s.id.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q) ||
          (s.blockedInfo?.reason || '').toLowerCase().includes(q)
      );
    }

    return combined;
  }, [allStudents, blockedUsers, blockStatusFilter, blockSearchQuery]);

  // Filtered Semester Drive Files
  const filteredExistingSemFiles = useMemo(() => {
    if (!semFilesFilterQuery.trim()) return existingSemFiles;
    const q = semFilesFilterQuery.toLowerCase().trim();
    return existingSemFiles.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        (f.subject && f.subject.toLowerCase().includes(q)) ||
        (f.topic && f.topic.toLowerCase().includes(q))
    );
  }, [existingSemFiles, semFilesFilterQuery]);

  // Filtered Change Requests
  const filteredChangeRequests = useMemo(() => {
    let list = requests;
    if (changeSearchQuery.trim()) {
      const q = changeSearchQuery.toLowerCase();
      list = list.filter((r) =>
        (r.student_name || '').toLowerCase().includes(q) ||
        (r.student_usn || '').toLowerCase().includes(q) ||
        (r.field_name || '').toLowerCase().includes(q) ||
        (r.old_value || '').toLowerCase().includes(q) ||
        (r.new_value || '').toLowerCase().includes(q) ||
        (r.reason || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [requests, changeSearchQuery]);

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
    const nextPeriod = Number(newLecturePeriod) + 1;
    setNewLecturePeriod(nextPeriod);
    if (TIMETABLE_TIMINGS_PRESETS[nextPeriod - 1]) {
      setNewLectureTimings(TIMETABLE_TIMINGS_PRESETS[nextPeriod - 1]);
    }
    setShowAddLectureRow(false);
  };

  const handleStartEditLecture = (lec: LectureItem) => {
    setEditingLectureId(lec.id);
    setEditLecturePeriod(lec.period);
    setEditLectureTimings(lec.timings);
    setEditLectureCode(lec.subjectCode);
    setEditLectureName(lec.subjectName);
    setEditLectureRoom(lec.room || '');
    setEditLectureFaculty(lec.faculty || '');
    setEditLectureType(lec.type || 'Theory');
  };

  const handleCancelEditLecture = () => {
    setEditingLectureId(null);
  };

  const handleSaveEditedLecture = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingLectureId || !editLectureCode.trim()) return;

    setEditorSchedule((prev) => {
      return prev.map((dayItem) => {
        if (dayItem.day !== editorDay) return dayItem;
        const updatedLectures = dayItem.lectures
          .map((l) => {
            if (l.id !== editingLectureId) return l;
            return {
              ...l,
              period: Number(editLecturePeriod),
              periodLabel: `Period ${editLecturePeriod}`,
              timings: editLectureTimings.trim(),
              subjectCode: editLectureCode.trim().toUpperCase(),
              subjectName: editLectureName.trim() || editLectureCode.trim().toUpperCase(),
              room: editLectureRoom.trim() || 'Room 304',
              faculty: editLectureFaculty.trim() || undefined,
              type: editLectureType,
            };
          })
          .sort((a, b) => a.period - b.period);

        return {
          ...dayItem,
          lectures: updatedLectures,
        };
      });
    });

    setEditingLectureId(null);
  };

  const handleDeleteLecture = (lecId: string) => {
    if (editingLectureId === lecId) {
      setEditingLectureId(null);
    }
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
      setShowAddExamRow(false);
      setTimeout(() => setExamSaveSuccess(false), 3000);
    }
  };

  const handleStartEditExam = (item: ExamDateItem) => {
    setEditingExamId(item.id);
    setEditExamSemester(item.semester);
    setEditExamType(item.examType);
    setEditExamCode(item.subjectCode);
    setEditExamName(item.subjectName);
    setEditExamDate(item.date);
    setEditExamTimings(item.timings);
    setEditExamVenue(item.venue || '');
    setEditExamStatus(item.status);
  };

  const handleCancelEditExam = () => {
    setEditingExamId(null);
  };

  const handleSaveEditedExam = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingExamId || !editExamCode.trim() || !editExamName.trim() || !editExamDate) return;

    const originalExam = allExamDates.find((ex) => ex.id === editingExamId);
    if (!originalExam) return;

    setIsSavingExam(true);
    const res = await examDatesService.updateExamDate(originalExam, {
      semester: editExamSemester,
      examType: editExamType,
      subjectCode: editExamCode.trim().toUpperCase(),
      subjectName: editExamName.trim(),
      date: editExamDate,
      timings: editExamTimings.trim(),
      venue: editExamVenue.trim() || undefined,
      status: editExamStatus,
    });
    setIsSavingExam(false);

    if (res.success && res.data) {
      setAllExamDates((prev) =>
        prev.map((item) => (item.id === editingExamId ? res.data! : item))
      );
      setExamSaveSuccess(true);
      setEditingExamId(null);
      setTimeout(() => setExamSaveSuccess(false), 3000);
    }
  };

  const handleDeleteExam = async (id: string) => {
    if (editingExamId === id) {
      setEditingExamId(null);
    }
    const item = allExamDates.find((e) => e.id === id);
    await examDatesService.deleteExamDate(id, item);
    setAllExamDates((prev) => prev.filter((e) => e.id !== id));
  };

  const handleNoticeFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (file.size > 20 * 1024 * 1024) {
        alert(`Selected file "${file.name}" is larger than 20MB. Please choose a file smaller than 20MB.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setNewNoticeFiles((prev) => [
          ...prev,
          {
            name: file.name,
            type: file.type || 'application/octet-stream',
            base64,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const handleRemoveNoticeFile = (index: number) => {
    setNewNoticeFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePublishNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoticeTitle.trim() || !newNoticeContent.trim()) {
      alert('Please fill in both the Notice Title and Content.');
      return;
    }

    setIsPublishingNotice(true);
    setNoticeError('');

    const parsedLinks = newNoticeLinks
      .split(/[\n,]/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .map((l) => (l.startsWith('http://') || l.startsWith('https://') ? l : `https://${l}`));

    const res = await noticeService.createNotice({
      id: newNoticeId.trim() || undefined,
      semester: newNoticeSemester,
      title: newNoticeTitle.trim(),
      content: newNoticeContent.trim(),
      links: parsedLinks,
      files: newNoticeFiles,
    });

    setIsPublishingNotice(false);

    if (res.success) {
      setNoticePublishSuccess(true);
      if (res.data) {
        setAllNotices((prev) => [res.data!, ...prev.filter((n) => n.id !== res.data!.id)]);
      } else {
        noticeService.fetchNotices(true).then((r) => {
          if (r.data) setAllNotices(r.data);
        });
      }

      setNewNoticeSemester('ALL');
      setNewNoticeTitle('');
      setNewNoticeContent('');
      setNewNoticeLinks('');
      setNewNoticeFiles([]);
      setShowAddNoticeRow(false);
      setNewNoticeId(
        `NTC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`
      );
      setTimeout(() => setNoticePublishSuccess(false), 4000);
    } else {
      setNoticeError(res.error || 'Failed to publish notice. Check your Google Apps Script configuration.');
    }
  };

  const handleStartEditNotice = (n: NoticeItem) => {
    setEditingNoticeId(n.id);
    setEditNoticeSemester(n.semester !== undefined ? n.semester : 'ALL');
    setEditNoticeTitle(n.title || '');
    setEditNoticeContent(n.content || '');
    setEditNoticeLinks(n.links && n.links.length > 0 ? n.links.join(', ') : '');
    const docs = n.documents && n.documents.length > 0
      ? [...n.documents]
      : n.documentUrl
      ? [{ name: n.documentName || 'Document', url: n.documentUrl }]
      : [];
    setEditNoticeDocuments(docs);
    setEditNoticeDeletedDocuments([]);
    setEditNoticeNewFiles([]);
    setShowAddNoticeRow(false);
  };

  const handleCancelEditNotice = () => {
    setEditingNoticeId(null);
    setEditNoticeNewFiles([]);
    setEditNoticeDeletedDocuments([]);
  };

  const handleRemoveEditExistingDoc = (docIdx: number) => {
    const docToRemove = editNoticeDocuments[docIdx];
    if (docToRemove) {
      setEditNoticeDeletedDocuments((prev) => [...prev, docToRemove]);
    }
    setEditNoticeDocuments((prev) => prev.filter((_, idx) => idx !== docIdx));
  };

  const handleEditNoticeFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (file.size > 20 * 1024 * 1024) {
        alert(`Selected file "${file.name}" is larger than 20MB. Please choose a file smaller than 20MB.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setEditNoticeNewFiles((prev) => [
          ...prev,
          {
            name: file.name,
            type: file.type || 'application/octet-stream',
            base64,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const handleRemoveEditNewFile = (fIdx: number) => {
    setEditNoticeNewFiles((prev) => prev.filter((_, idx) => idx !== fIdx));
  };

  const handleSaveEditedNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNoticeId) return;
    if (!editNoticeTitle.trim() || !editNoticeContent.trim()) {
      alert('Please fill in both Notice Title and Content.');
      return;
    }

    setIsUpdatingNotice(true);
    setNoticeError('');

    const parsedLinks = editNoticeLinks
      .split(/[\n,]/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .map((l) => (l.startsWith('http://') || l.startsWith('https://') ? l : `https://${l}`));

    try {
      const res = await noticeService.updateNotice(editingNoticeId, {
        semester: editNoticeSemester,
        title: editNoticeTitle.trim(),
        content: editNoticeContent.trim(),
        links: parsedLinks,
        documents: editNoticeDocuments,
        deletedDocuments: editNoticeDeletedDocuments,
        files: editNoticeNewFiles,
      });

      if (res.success) {
        setAllNotices((prev) =>
          prev.map((item) =>
            item.id === editingNoticeId
              ? {
                  ...item,
                  semester: editNoticeSemester,
                  title: editNoticeTitle.trim(),
                  content: editNoticeContent.trim(),
                  links: parsedLinks,
                  documents: res.data?.documents !== undefined ? res.data.documents : editNoticeDocuments,
                  documentName: res.data ? (res.data.documentName || res.data.documents?.[0]?.name || '') : (editNoticeDocuments[0]?.name || ''),
                  documentUrl: res.data ? (res.data.documentUrl || res.data.documents?.[0]?.url || '') : (editNoticeDocuments[0]?.url || ''),
                }
              : item
          )
        );
        setNoticePublishSuccess(true);
        setTimeout(() => setNoticePublishSuccess(false), 4000);
        setEditingNoticeId(null);
        setEditNoticeNewFiles([]);
        setEditNoticeDeletedDocuments([]);
      } else {
        setNoticeError(res.error || 'Failed to update notice');
      }
    } catch (err: any) {
      setNoticeError(err.message || 'Error saving notice');
    } finally {
      setIsUpdatingNotice(false);
    }
  };

  const handleDeleteNotice = async (id: string) => {
    if (!window.confirm(`Are you sure you want to delete notice "${id}" ?`)) {
      return;
    }
    setAllNotices((prev) => prev.filter((n) => n.id !== id));
    await noticeService.deleteNotice(id);
  };

  // Block / Unblock Handlers
  const handleBlockUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBlockUserId.trim()) return;
    setIsSubmittingBlock(true);
    setBlockActionMessage(null);
    try {
      const res = await adminSheetService.blockUser({
        userId: newBlockUserId.trim(),
        studentName: newBlockStudentName.trim() || undefined,
        reason: newBlockReason.trim() || 'Administrative hold',
        blockedBy: adminUser?.email || 'admin',
      });
      if (res.success) {
        setBlockedUsers(adminSheetService.getBlockedUsers());
        setNewBlockUserId('');
        setNewBlockStudentName('');
        setNewBlockReason('');
        setShowManualBlockRow(false);
        setBlockActionMessage(`User "${newBlockUserId.trim()}" has been successfully blocked.`);
        setTimeout(() => setBlockActionMessage(null), 4000);
      } else {
        setBlockActionMessage(`Error: ${res.error || 'Failed to block user'}`);
      }
    } finally {
      setIsSubmittingBlock(false);
    }
  };

  const handleStartInlineBlock = (studentId: string, studentName: string) => {
    setBlockingUserId(studentId);
    setBlockingStudentName(studentName);
    setBlockingReasonInput('Administrative hold');
    setShowManualBlockRow(false);
  };

  const handleCancelInlineBlock = () => {
    setBlockingUserId(null);
    setBlockingStudentName('');
  };

  const handleConfirmInlineBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockingUserId) return;
    setIsSubmittingBlock(true);
    setBlockActionMessage(null);
    try {
      const res = await adminSheetService.blockUser({
        userId: blockingUserId,
        studentName: blockingStudentName || undefined,
        reason: blockingReasonInput.trim() || 'Administrative hold',
        blockedBy: adminUser?.email || 'admin',
      });
      if (res.success) {
        setBlockedUsers(adminSheetService.getBlockedUsers());
        setBlockActionMessage(`Student "${blockingStudentName || blockingUserId}" has been blocked.`);
        setTimeout(() => setBlockActionMessage(null), 4000);
        setBlockingUserId(null);
      } else {
        alert(res.error || 'Failed to block student');
      }
    } finally {
      setIsSubmittingBlock(false);
    }
  };

  const handleUnblockStudent = async (identifier: string) => {
    setIsUnblockingUserId(identifier);
    try {
      const res = await adminSheetService.unblockUser(identifier);
      if (res.success) {
        setBlockedUsers(adminSheetService.getBlockedUsers());
        setBlockActionMessage(`User "${identifier}" unblocked.`);
        setTimeout(() => setBlockActionMessage(null), 3000);
      } else {
        alert(res.error || 'Failed to unblock user');
      }
    } finally {
      setIsUnblockingUserId(null);
    }
  };

  const handleUnblockUserClick = async (userId: string) => {
    if (!window.confirm(`Are you sure you want to unblock user "${userId}"?`)) return;
    await handleUnblockStudent(userId);
  };

  const handleQuickToggleBlock = async (userId: string, studentName?: string) => {
    const isCurrentlyBlocked = adminSheetService.isUserBlocked(userId);
    if (isCurrentlyBlocked) {
      if (window.confirm(`Unblock ${studentName ? `${studentName} (${userId})` : userId}?`)) {
        await handleUnblockUserClick(userId);
      }
    } else {
      handleStartInlineBlock(userId, studentName || userId);
    }
  };

  // Sync blocked users on mount and listen to changes
  useEffect(() => {
    adminSheetService.fetchBlockedUsers(false).then((list) => {
      if (Array.isArray(list)) {
        setBlockedUsers(list);
      }
    });

    const handleBlockedChanged = (e: Event) => {
      const customEvt = e as CustomEvent<BlockedUser[]>;
      if (customEvt.detail) {
        setBlockedUsers(customEvt.detail);
      }
    };
    window.addEventListener('portal_blocked_users_changed', handleBlockedChanged);
    return () => {
      window.removeEventListener('portal_blocked_users_changed', handleBlockedChanged);
    };
  }, []);

  // Load existing semester files when modal opens or semester changes
  const loadExistingSemesterFiles = async (sem: number, force = false) => {
    setIsLoadingExistingSemFiles(true);
    try {
      const res = await semesterDataService.fetchSemesterFiles(sem, force);
      if (res.success && res.files) {
        setExistingSemFiles(res.files);
      }
    } finally {
      setIsLoadingExistingSemFiles(false);
    }
  };

  useEffect(() => {
    if (showSemesterDataUploadModal) {
      loadExistingSemesterFiles(semDataUploadSemester, true);
    }
  }, [showSemesterDataUploadModal, semDataUploadSemester]);

  // Handle file selection for Semester Data upload
  const handleSelectSemFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        if (base64) {
          setSemFilesToUpload((prev) => [
            ...prev,
            {
              name: file.name,
              type: file.type || 'application/octet-stream',
              base64,
              size: file.size,
            },
          ]);
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleRemoveSelectedSemFile = (idx: number) => {
    setSemFilesToUpload((prev) => prev.filter((_, i) => i !== idx));
  };

  // Upload semester files handler
  const handleUploadSemesterFilesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (semFilesToUpload.length === 0) {
      alert('Please select at least one file to upload.');
      return;
    }

    setIsUploadingSemFiles(true);
    setSemUploadSuccessMsg(null);
    setSemUploadErrorMsg(null);

    // Format file names if auto-rename is enabled
    const preparedFiles = semFilesToUpload.map((f) => {
      let finalName = f.name;
      if (semAutoRename) {
        const lastDot = f.name.lastIndexOf('.');
        const ext = lastDot !== -1 ? f.name.slice(lastDot + 1) : '';
        const cleanSub = semDataSubject.trim().toUpperCase() || 'GENERAL';
        const cleanTop = semDataTopic.trim()
          ? semDataTopic.trim().replace(/\s+/g, '_')
          : lastDot !== -1
          ? f.name.slice(0, lastDot).replace(/\s+/g, '_')
          : f.name;
        finalName = `SEM${semDataUploadSemester}-${cleanSub}-${cleanTop}${ext ? `.${ext}` : ''}`;
      }
      return {
        name: finalName,
        type: f.type,
        base64: f.base64,
      };
    });

    try {
      const res = await semesterDataService.uploadSemesterFiles({
        semester: semDataUploadSemester,
        subject: semDataSubject.trim().toUpperCase() || undefined,
        files: preparedFiles,
      });

      if (res.success) {
        setSemUploadSuccessMsg(
          `Successfully uploaded ${preparedFiles.length} file(s) for Semester ${semDataUploadSemester}!`
        );
        setSemFilesToUpload([]);
        setSemDataTopic('');
        setShowSemUploadForm(false);
        loadExistingSemesterFiles(semDataUploadSemester, true);
        setTimeout(() => setSemUploadSuccessMsg(null), 5000);
      } else {
        setSemUploadErrorMsg(res.error || 'Failed to upload files.');
      }
    } catch (err: any) {
      setSemUploadErrorMsg(err.message || 'Error uploading files.');
    } finally {
      setIsUploadingSemFiles(false);
    }
  };

  // Delete semester file handler
  const handleDeleteSemFile = async (fileId: string, fileName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${fileName}" ?`)) {
      return;
    }
    setIsDeletingSemFileId(fileId);
    try {
      const res = await semesterDataService.deleteSemesterFile(fileId, semDataUploadSemester);
      if (res.success) {
        setExistingSemFiles((prev) => prev.filter((f) => f.id !== fileId));
      } else {
        alert(res.error || 'Failed to delete file');
      }
    } finally {
      setIsDeletingSemFileId(null);
    }
  };

  // Sync reason input whenever live settings are fetched
  useEffect(() => {
    if (settings.lock_reason) {
      setLockReasonInput(settings.lock_reason);
    }
  }, [settings.lock_reason]);



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

  // Refresh All Data directly
  const refreshData = async () => {
    setIsRefreshing(true);
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
    } finally {
      setIsRefreshing(false);
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
          setHasAdminGsiButton(true);
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

  const handleAdminGoogleClick = () => {
    setGoogleError('');
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
    if (!clientId) {
      setGoogleError('Google Client ID is missing. Please ensure VITE_GOOGLE_CLIENT_ID is configured in Netlify.');
      return;
    }
    if (!window.google) {
      setGoogleError('Google Identity Services failed to load. Please disable ad blockers and refresh.');
      return;
    }
    if (window.google?.accounts?.oauth2) {
      try {
        setGoogleLoading(true);
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'email profile openid',
          callback: async (tokenResponse: any) => {
            if (tokenResponse.error) {
              setGoogleLoading(false);
              setGoogleError(`Google Sign-In failed: ${tokenResponse.error_description || tokenResponse.error}`);
              return;
            }
            if (tokenResponse.access_token) {
              try {
                const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                  headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
                });
                const userInfo = await userRes.json();
                const email = (userInfo.email || '').toLowerCase().trim();
                if (adminSheetService.isAuthorizedAdminEmail(email)) {
                  const userObj = {
                    email,
                    name: userInfo.name || 'Administrator',
                    picture: userInfo.picture,
                  };
                  adminSheetService.setAdminAuthenticated(true, userObj);
                  setAdminUser(userObj);
                  setIsAuthenticated(true);
                  refreshData();
                } else {
                  setGoogleError(`Access Denied: The account "${email}" is not authorized for administrative access.`);
                }
              } catch (err: any) {
                setGoogleError('Failed to verify Google credentials: ' + (err?.message || 'Network error'));
              } finally {
                setGoogleLoading(false);
              }
            } else {
              setGoogleLoading(false);
            }
          },
        });
        tokenClient.requestAccessToken({ prompt: 'select_account' });
        return;
      } catch (err) {
        setGoogleLoading(false);
        console.warn('Admin tokenClient failed:', err);
      }
    }
  };

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
      const finalReason = lockReasonInput.trim() || 'System maintenance in progress.';
      const updated = await adminSheetService.setPortalLock(nextLocked, finalReason);
      setSettings(updated);
      setStats(adminSheetService.getAdminStats());
      setShowLockConfirmModal(false);
    } finally {
      setIsUpdatingLock(false);
    }
  };

  // Handle Request Done / Dismiss Action
  const handleRequestDone = async (id: string) => {
    setResolvingRequestId(id);
    // Instantly remove from local view
    setRequests((prev) => prev.filter((r) => r.id !== id));
    setStats((prev) => ({
      ...prev,
      pending_change_requests: Math.max(0, prev.pending_change_requests - 1),
    }));
    try {
      await adminSheetService.deleteChangeRequest(id);
      setChangeActionMessage('Change request resolved and removed.');
      setTimeout(() => setChangeActionMessage(null), 3500);
      refreshData();
    } finally {
      setResolvingRequestId(null);
    }
  };

  // Manual Refresh
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
                  {!hasAdminGsiButton && (
                    <button
                      type="button"
                      onClick={handleAdminGoogleClick}
                      disabled={googleLoading}
                      className="w-full min-h-[48px] py-3 px-4 rounded-xl border border-slate-300 dark:border-[#2A2A32] bg-white dark:bg-[#121216] hover:bg-slate-50 dark:hover:bg-[#18181F] text-slate-800 dark:text-slate-100 font-medium text-sm flex items-center justify-center gap-3 shadow-sm hover:shadow transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#8048A8] disabled:opacity-60 disabled:cursor-not-allowed group touch-manipulation"
                    >
                      <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.14z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                        />
                      </svg>
                      <span className="font-semibold text-sm group-hover:text-slate-900 dark:group-hover:text-white leading-tight">
                        {googleLoading ? 'Signing In...' : 'Sign in with Google'}
                      </span>
                    </button>
                  )}
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
                  <Sparkles className="w-3 h-3" /> Active
                </span>
              </div>

              <div className="flex items-baseline gap-3 my-2">
                <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  {isRefreshing && logs.length === 0 ? (
                    <span className="inline-block animate-pulse text-slate-400">...</span>
                  ) : (
                    stats.total_logins
                  )}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {isRefreshing && logs.length === 0 ? 'syncing records...' : 'recorded attempts'}
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
          <div className={`lg:col-span-2 rounded-2xl shadow-card dark:shadow-card-dark p-5 relative overflow-hidden flex flex-col justify-between transition-all ${settings.is_locked
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
              {settings.is_locked && settings.lock_reason && (
                <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium truncate mt-0.5" title={settings.lock_reason}>
                  Notice: &ldquo;{settings.lock_reason}&rdquo;
                </p>
              )}
            </div>

            <button
              onClick={() => {
                setLockReasonInput(settings.lock_reason || '');
                setShowLockConfirmModal(true);
              }}
              className={`w-full mt-4 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all ${settings.is_locked
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
        {/* Academic & Schedule Management Tools */}
        {/* ======================================================== */}
        <div className="bg-white/95 dark:bg-[#0A0A0E]/95 backdrop-blur-md border border-slate-200/90 dark:border-[#222228] rounded-2xl shadow-card dark:shadow-card-dark p-5 sm:p-6 lg:p-7 relative overflow-hidden">
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
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Administrative control center to manage timetables, exams, semester files, notices, change requests, and student access
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
            </div>
          </div>

          {/* 6 Management Tools: 1. Timetable | 2. Exam Dates | 3. Semester Files | 4. Notices | 5. Change Details | 6. Block / Unblock */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
            {/* 1. Class Timetable */}
            <div className="rounded-2xl border border-slate-200/90 dark:border-[#22222E] bg-white dark:bg-[#111116] p-5 sm:p-6 flex flex-col justify-between shadow-xs hover:shadow-md hover:border-[#8048A8]/50 dark:hover:border-[#8048A8]/50 hover:-translate-y-0.5 transition-all duration-200 group">
              <div>
                <div className="flex items-center justify-between gap-2 mb-3.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-7 h-7 rounded-xl bg-[#8048A8] text-white flex items-center justify-center text-xs font-black shadow-xs flex-shrink-0">
                      1
                    </span>
                    <h3 className="text-sm sm:text-[15px] font-bold text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                      <Clock className="w-4 h-4 text-[#8048A8] dark:text-[#D1A7FF] flex-shrink-0" />
                      <span className="truncate">Class Timetable</span>
                    </h3>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-purple-100/70 dark:bg-purple-950/40 text-[#8048A8] dark:text-[#D1A7FF] border border-purple-200 dark:border-purple-800/40 whitespace-nowrap flex-shrink-0">
                    Weekly (Mon–Sat)
                  </span>
                </div>

                <p className="text-xs sm:text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed mb-5 min-h-[42px] flex items-center">
                  Modify class periods, subjects, faculties, timings, and lab venues across Semesters 1, 2, and 3.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-[#1E1E28]">
                <button
                  type="button"
                  onClick={() => setShowTimetableEditorModal(true)}
                  className="w-full py-2.5 sm:py-3 px-4 rounded-xl bg-[#8048A8] hover:bg-[#6c3990] active:scale-[0.98] text-white font-bold text-xs sm:text-[13px] flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Manage Timetable</span>
                </button>
              </div>
            </div>

            {/* 2. Exam Schedule */}
            <div className="rounded-2xl border border-slate-200/90 dark:border-[#22222E] bg-white dark:bg-[#111116] p-5 sm:p-6 flex flex-col justify-between shadow-xs hover:shadow-md hover:border-amber-500/50 dark:hover:border-amber-500/50 hover:-translate-y-0.5 transition-all duration-200 group">
              <div>
                <div className="flex items-center justify-between gap-2 mb-3.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-7 h-7 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center text-xs font-black shadow-xs flex-shrink-0">
                      2
                    </span>
                    <h3 className="text-sm sm:text-[15px] font-bold text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                      <CalendarDays className="w-4 h-4 text-amber-500 flex-shrink-0" />
                      <span className="truncate">Exam Schedule</span>
                    </h3>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-amber-100/70 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40 whitespace-nowrap flex-shrink-0">
                    CAE-1 • CAE-2 • Unit Test • ESE
                  </span>
                </div>

                <p className="text-xs sm:text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed mb-5 min-h-[42px] flex items-center">
                  Publish examination schedules, session timings, subject codes, and hall seating venues.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-[#1E1E28]">
                <button
                  type="button"
                  onClick={() => setShowExamDatesManagerModal(true)}
                  className="w-full py-2.5 sm:py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-slate-950 font-bold text-xs sm:text-[13px] flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                  <span>Manage Exam Dates</span>
                </button>
              </div>
            </div>

            {/* 3. Semester Files */}
            <div className="rounded-2xl border border-slate-200/90 dark:border-[#22222E] bg-white dark:bg-[#111116] p-5 sm:p-6 flex flex-col justify-between shadow-xs hover:shadow-md hover:border-cyan-500/50 dark:hover:border-cyan-500/50 hover:-translate-y-0.5 transition-all duration-200 group">
              <div>
                <div className="flex items-center justify-between gap-2 mb-3.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-7 h-7 rounded-xl bg-cyan-600 text-white flex items-center justify-center text-xs font-black shadow-xs flex-shrink-0">
                      3
                    </span>
                    <h3 className="text-sm sm:text-[15px] font-bold text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                      <FolderUp className="w-4 h-4 text-cyan-500 flex-shrink-0" />
                      <span className="truncate">Semester Files</span>
                    </h3>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-cyan-100/70 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/40 whitespace-nowrap flex-shrink-0">
                    Sem 1 • 2 • 3
                  </span>
                </div>

                <p className="text-xs sm:text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed mb-5 min-h-[42px] flex items-center">
                  Upload and organize study materials, notes, lab manuals, and syllabus for students.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-[#1E1E28]">
                <button
                  type="button"
                  onClick={() => setShowSemesterDataUploadModal(true)}
                  className="w-full py-2.5 sm:py-3 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-700 active:scale-[0.98] text-white font-bold text-xs sm:text-[13px] flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Manage Semester Files</span>
                </button>
              </div>
            </div>

            {/* 4. Circulars & Notices */}
            <div className="rounded-2xl border border-slate-200/90 dark:border-[#22222E] bg-white dark:bg-[#111116] p-5 sm:p-6 flex flex-col justify-between shadow-xs hover:shadow-md hover:border-blue-500/50 dark:hover:border-blue-500/50 hover:-translate-y-0.5 transition-all duration-200 group">
              <div>
                <div className="flex items-center justify-between gap-2 mb-3.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xs font-black shadow-xs flex-shrink-0">
                      4
                    </span>
                    <h3 className="text-sm sm:text-[15px] font-bold text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                      <Bell className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      <span className="truncate">Notices &amp; Docs</span>
                    </h3>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-blue-100/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40 whitespace-nowrap flex-shrink-0">
                    Circulars &amp; Docs
                  </span>
                </div>

                <p className="text-xs sm:text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed mb-5 min-h-[42px] flex items-center">
                  Publish announcements, circulars, and document attachments for student access.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-[#1E1E28]">
                <button
                  type="button"
                  onClick={() => setShowNoticesManagerModal(true)}
                  className="w-full py-2.5 sm:py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold text-xs sm:text-[13px] flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>Manage Notices</span>
                </button>
              </div>
            </div>

            {/* 5. Change Details */}
            <div className="rounded-2xl border border-slate-200/90 dark:border-[#22222E] bg-white dark:bg-[#111116] p-5 sm:p-6 flex flex-col justify-between shadow-xs hover:shadow-md hover:border-emerald-500/50 dark:hover:border-emerald-500/50 hover:-translate-y-0.5 transition-all duration-200 group">
              <div>
                <div className="flex items-center justify-between gap-2 mb-3.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-xs font-black shadow-xs flex-shrink-0">
                      5
                    </span>
                    <h3 className="text-sm sm:text-[15px] font-bold text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                      <UserCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      <span className="truncate">Change Details</span>
                    </h3>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-100/70 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40 whitespace-nowrap flex-shrink-0">
                    {requests.length > 0 ? `${requests.length} Active` : 'All Resolved'}
                  </span>
                </div>

                <p className="text-xs sm:text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed mb-5 min-h-[42px] flex items-center">
                  Review student submissions for profile details, contact updates, and record corrections.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-[#1E1E28]">
                <button
                  type="button"
                  onClick={() => setShowChangeRequestsModal(true)}
                  className="w-full py-2.5 sm:py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-xs sm:text-[13px] flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Review Change Requests</span>
                </button>
              </div>
            </div>

            {/* 6. Block / Unblock */}
            <div className="rounded-2xl border border-slate-200/90 dark:border-[#22222E] bg-white dark:bg-[#111116] p-5 sm:p-6 flex flex-col justify-between shadow-xs hover:shadow-md hover:border-rose-500/50 dark:hover:border-rose-500/50 hover:-translate-y-0.5 transition-all duration-200 group">
              <div>
                <div className="flex items-center justify-between gap-2 mb-3.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-7 h-7 rounded-xl bg-rose-600 text-white flex items-center justify-center text-xs font-black shadow-xs flex-shrink-0">
                      6
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                      <UserX className="w-4 h-4 text-rose-500 flex-shrink-0" />
                      <span className="truncate">Block / Unblock</span>
                    </h3>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-rose-100/70 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40 whitespace-nowrap flex-shrink-0">
                    {blockedUsers.length} Blocked
                  </span>
                </div>

                <p className="text-xs sm:text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed mb-5 min-h-[42px] flex items-center">
                  View enrolled students and manage active portal access permissions and locks.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-[#1E1E28]">
                <button
                  type="button"
                  onClick={() => setShowBlockedUsersModal(true)}
                  className="w-full py-2.5 sm:py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white font-bold text-xs sm:text-[13px] flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <UserX className="w-3.5 h-3.5" />
                  <span>Manage Block / Unblock</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* BOTTOM ROW: System Login Audit History */}
        {/* ======================================================== */}
        <div className="w-full bg-white/95 dark:bg-[#0A0A0E]/95 backdrop-blur-md border border-slate-200/90 dark:border-[#222228] rounded-2xl shadow-card dark:shadow-card-dark p-5 flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-200/80 dark:border-[#222228] mb-4">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Login Audit History</span>
                  <span className="text-xs font-normal text-slate-400">({filteredLogs.length})</span>
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>System Audit &bull; Successful, denied & unknown login attempts</span>
                </p>
              </div>

              {/* Status Filter Tabs (ALL / SUCCESS / DENIED) */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#16161D] p-0.5 rounded-lg border border-slate-200 dark:border-[#262630]">
                {(['ALL', 'SUCCESS', 'DENIED'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setLogStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${logStatusFilter === st
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
                  title="Refresh audit logs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-[#8048A8] dark:text-[#D1A7FF] ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
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
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#181822]">
                  {isRefreshing && logs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <RefreshCw className="w-5 h-5 text-[#8048A8] dark:text-[#D1A7FF] animate-spin" />
                          <span>Loading audit log entries...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400 text-xs">
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
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${log.status === 'SUCCESS'
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
                          <td className="py-2.5 px-3 text-right">
                            {(() => {
                              const targetId = log.usn || log.email;
                              if (!targetId || targetId === 'N/A') return null;
                              const blocked = adminSheetService.isUserBlocked(targetId) || adminSheetService.isUserBlocked(log.email);
                              return (
                                <button
                                  type="button"
                                  onClick={() => handleQuickToggleBlock(targetId, log.student_name)}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                                    blocked
                                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-100'
                                      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-500/30 hover:bg-rose-100'
                                  }`}
                                  title={blocked ? 'Click to unblock user' : 'Click to block user from portal'}
                                >
                                  {blocked ? 'Unblock' : 'Block'}
                                </button>
                              );
                            })()}
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
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md flex items-center justify-center gap-1.5 transition-all disabled:opacity-60 ${settings.is_locked ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
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
      {/* MODAL 4: Timetable Editor */}
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

                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Edit lecture periods, subjects, rooms, and faculty directly on the website.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowTimetableEditorModal(false);
                  setEditingLectureId(null);
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1A1A24] transition-all cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Success alert */}
            {timetableSaveSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Timetable successfully saved and updated!</span>
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
                    onClick={() => {
                      setEditorSemester(sem);
                      setEditingLectureId(null);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${editorSemester === sem
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
                      setEditingLectureId(null);
                    }}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${editorDay === d.full
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
                        onChange={(e) => {
                          const p = Number(e.target.value);
                          setNewLecturePeriod(p);
                          if (TIMETABLE_TIMINGS_PRESETS[p - 1]) {
                            setNewLectureTimings(TIMETABLE_TIMINGS_PRESETS[p - 1]);
                          }
                        }}
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
                        placeholder="10:30 AM - 11:30 AM"
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
                        className="w-full py-1.5 px-3 rounded-xl bg-[#8048A8] hover:bg-[#6c3990] text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
                      >
                        + Add Period
                      </button>
                    </div>
                  </div>

                  {/* Quick Timings helper */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[10px]">
                    <span className="text-slate-500 font-semibold">Quick timings:</span>
                    {TIMETABLE_TIMINGS_PRESETS.map((timePreset) => (
                      <button
                        key={timePreset}
                        type="button"
                        onClick={() => setNewLectureTimings(timePreset)}
                        className="px-1.5 py-0.5 rounded bg-white dark:bg-[#121218] border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-slate-300 hover:border-[#8048A8] hover:text-[#8048A8] transition-colors cursor-pointer"
                      >
                        {timePreset.replace(/\s*AM|\s*PM/g, '')}
                      </button>
                    ))}
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
                  {currentDaySchedule.lectures.map((lec) => {
                    const isEditingThis = editingLectureId === lec.id;
                    if (isEditingThis) {
                      return (
                        <form
                          key={lec.id}
                          onSubmit={handleSaveEditedLecture}
                          className="p-4 rounded-2xl border-2 border-[#8048A8] bg-purple-50/50 dark:bg-[#1A1626]/90 shadow-md space-y-3 animate-in fade-in transition-all"
                        >
                          <div className="flex items-center justify-between pb-2 border-b border-[#8048A8]/20">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-lg bg-[#8048A8] text-white flex items-center justify-center font-black text-xs">
                                {editLecturePeriod}
                              </span>
                              <span className="text-xs font-bold text-[#8048A8] dark:text-[#D1A7FF]">
                                Edit Period {editLecturePeriod} ({editorDay})
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={handleCancelEditLecture}
                                className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                className="px-3 py-1 rounded-lg bg-[#8048A8] hover:bg-[#6c3990] active:scale-95 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition-all cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Save Period</span>
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                                Period #
                              </label>
                              <input
                                type="number"
                                min="1"
                                max="10"
                                value={editLecturePeriod}
                                onChange={(e) => setEditLecturePeriod(Number(e.target.value))}
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
                                value={editLectureTimings}
                                onChange={(e) => setEditLectureTimings(e.target.value)}
                                placeholder="10:30 AM - 11:30 AM"
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
                                value={editLectureCode}
                                onChange={(e) => setEditLectureCode(e.target.value)}
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
                                value={editLectureName}
                                onChange={(e) => setEditLectureName(e.target.value)}
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
                                value={editLectureRoom}
                                onChange={(e) => setEditLectureRoom(e.target.value)}
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
                                value={editLectureFaculty}
                                onChange={(e) => setEditLectureFaculty(e.target.value)}
                                placeholder="Prof. Sharma"
                                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-[#121218] text-slate-900 dark:text-white"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                                Type
                              </label>
                              <select
                                value={editLectureType}
                                onChange={(e) => setEditLectureType(e.target.value as any)}
                                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-[#121218] text-slate-900 dark:text-white"
                              >
                                <option value="Theory">Theory</option>
                                <option value="Lab">Lab</option>
                                <option value="Tutorial">Tutorial</option>
                              </select>
                            </div>

                            <div className="flex items-end gap-2">
                              <button
                                type="button"
                                onClick={handleCancelEditLecture}
                                className="w-1/2 py-1.5 px-3 rounded-xl border border-slate-300 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-[#1E1E28] text-slate-700 dark:text-slate-300 font-bold text-xs transition-all cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                className="w-1/2 py-1.5 px-3 rounded-xl bg-[#8048A8] hover:bg-[#6c3990] active:scale-95 text-white font-bold text-xs shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1"
                              >
                                <Save className="w-3.5 h-3.5" />
                                <span>Save</span>
                              </button>
                            </div>
                          </div>

                          {/* Quick Timings helper */}
                          <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[10px]">
                            <span className="text-slate-500 font-semibold">Quick timings:</span>
                            {TIMETABLE_TIMINGS_PRESETS.map((timePreset) => (
                              <button
                                key={timePreset}
                                type="button"
                                onClick={() => setEditLectureTimings(timePreset)}
                                className="px-1.5 py-0.5 rounded bg-white dark:bg-[#121218] border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-slate-300 hover:border-[#8048A8] hover:text-[#8048A8] transition-colors cursor-pointer"
                              >
                                {timePreset.replace(/\s*AM|\s*PM/g, '')}
                              </button>
                            ))}
                          </div>
                        </form>
                      );
                    }

                    return (
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

                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => handleStartEditLecture(lec)}
                            className="p-2 rounded-xl text-slate-400 hover:text-[#8048A8] hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-all flex-shrink-0 cursor-pointer"
                            title="Edit Period"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteLecture(lec.id)}
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all flex-shrink-0 cursor-pointer"
                            title="Delete Period"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-slate-200/80 dark:border-[#222228] flex items-center justify-end gap-2">
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
                    <span>Saving Timetable...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Timetable</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 5: Exam Dates Manager */}
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

                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Add, edit, and publish exam schedules directly on the website.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowExamDatesManagerModal(false);
                  setEditingExamId(null);
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1A1A24] transition-all cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Success alert */}
            {examSaveSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Exam dates updated and saved successfully!</span>
              </div>
            )}

            {/* Controls Bar: Semester Selector + Exam Category Selector (Matching Timetable Modal layout) */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-[#14141C] border border-slate-200/80 dark:border-[#202028]">
              {/* Semester buttons */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mr-1">Semester:</span>
                {(['ALL', '1', '2', '3'] as const).map((sem) => (
                  <button
                    key={sem}
                    type="button"
                    onClick={() => {
                      setExamSemesterFilter(sem);
                      setEditingExamId(null);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${examSemesterFilter === sem
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'bg-white dark:bg-[#1E1E28] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-zinc-800 hover:bg-slate-100'
                      }`}
                  >
                    {sem === 'ALL' ? 'All Sems' : `Sem ${sem}`}
                  </button>
                ))}
              </div>

              {/* Category / Type Selector */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                {(['ALL', 'CAE-1', 'CAE-2', 'Unit Test', 'ESE'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setExamTypeFilter(cat);
                      setEditingExamId(null);
                    }}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${examTypeFilter === cat
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                      : 'bg-white dark:bg-[#1E1E28] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-zinc-800 hover:bg-slate-100'
                      }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Exams List area */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{examSemesterFilter === 'ALL' ? 'All Semesters' : `Semester ${examSemesterFilter}`} Exam Schedule</span>
                  <span className="text-[11px] text-slate-500 font-normal">
                    ({filteredExamDates.length} exam{filteredExamDates.length === 1 ? '' : 's'})
                  </span>
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddExamRow((prev) => !prev);
                    setEditingExamId(null);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{showAddExamRow ? 'Cancel Add' : 'Add Exam Date'}</span>
                </button>
              </div>

              {/* Add Exam Form (Collapsible matching Timetable layout) */}
              {showAddExamRow && (
                <form
                  onSubmit={handleAddExam}
                  className="p-4 rounded-2xl border-2 border-amber-500/40 bg-amber-50/40 dark:bg-[#1F1910]/60 space-y-3 animate-in fade-in"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
                      Add New Exam Date
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAddExamRow(false)}
                      className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Semester
                      </label>
                      <select
                        value={newExamSemester}
                        onChange={(e) => setNewExamSemester(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-[#121218] text-slate-900 dark:text-white"
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
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-[#121218] text-slate-900 dark:text-white"
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
                        value={newExamName}
                        onChange={(e) => setNewExamName(e.target.value)}
                        placeholder="Data Structures"
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-[#121218] text-slate-900 dark:text-white"
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
                        value={newExamTimings}
                        onChange={(e) => setNewExamTimings(e.target.value)}
                        placeholder="10:00 AM - 01:00 PM"
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-[#121218] text-slate-900 dark:text-white"
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
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-[#121218] text-slate-900 dark:text-white"
                      />
                    </div>

                    <div className="flex items-end">
                      <button
                        type="submit"
                        disabled={isSavingExam}
                        className="w-full py-1.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-sm transition-all disabled:opacity-60 cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        {isSavingExam ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Exam Date</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Quick Exam Timings helper */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[10px]">
                    <span className="text-slate-500 font-semibold">Quick timings:</span>
                    {[
                      '10:00 AM - 01:00 PM',
                      '02:00 PM - 05:00 PM',
                      '10:30 AM - 01:30 PM',
                      '09:30 AM - 12:30 PM',
                    ].map((timePreset) => (
                      <button
                        key={timePreset}
                        type="button"
                        onClick={() => setNewExamTimings(timePreset)}
                        className="px-1.5 py-0.5 rounded bg-white dark:bg-[#121218] border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-slate-300 hover:border-amber-500 hover:text-amber-600 transition-colors cursor-pointer"
                      >
                        {timePreset}
                      </button>
                    ))}
                  </div>
                </form>
              )}

              {/* Current Exam Dates List */}
              {isLoadingExams ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Loading scheduled exams...
                </div>
              ) : filteredExamDates.length === 0 ? (
                <div className="py-12 text-center text-slate-400 border border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl p-6 text-xs">
                  <CalendarDays className="w-6 h-6 mx-auto mb-2 text-slate-300 dark:text-zinc-600" />
                  <p className="font-semibold text-slate-600 dark:text-slate-300">No exams scheduled for this filter</p>
                  <p className="text-[11px] text-slate-400 mt-1">Click &quot;Add Exam Date&quot; above to add dates.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredExamDates.map((item) => {
                    const isEditingThis = editingExamId === item.id;
                    if (isEditingThis) {
                      return (
                        <form
                          key={item.id}
                          onSubmit={handleSaveEditedExam}
                          className="p-4 rounded-2xl border-2 border-amber-500 bg-amber-50/50 dark:bg-[#1F1910]/90 shadow-md space-y-3 animate-in fade-in transition-all"
                        >
                          <div className="flex items-center justify-between pb-2 border-b border-amber-500/20">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
                                Edit Exam: {item.subjectCode} ({item.examType})
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={handleCancelEditExam}
                                className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                disabled={isSavingExam}
                                className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-bold text-xs flex items-center gap-1 shadow-xs transition-all cursor-pointer disabled:opacity-60"
                              >
                                {isSavingExam ? (
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Check className="w-3.5 h-3.5" />
                                )}
                                <span>Save Exam</span>
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                                Semester
                              </label>
                              <select
                                value={editExamSemester}
                                onChange={(e) => setEditExamSemester(Number(e.target.value))}
                                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-[#121218] text-slate-900 dark:text-white"
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
                                value={editExamType}
                                onChange={(e) => setEditExamType(e.target.value as any)}
                                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-[#121218] text-slate-900 dark:text-white"
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
                                value={editExamCode}
                                onChange={(e) => setEditExamCode(e.target.value)}
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
                                value={editExamName}
                                onChange={(e) => setEditExamName(e.target.value)}
                                placeholder="Data Structures"
                                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-[#121218] text-slate-900 dark:text-white"
                                required
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                                Exam Date
                              </label>
                              <input
                                type="date"
                                value={editExamDate}
                                onChange={(e) => setEditExamDate(e.target.value)}
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
                                value={editExamTimings}
                                onChange={(e) => setEditExamTimings(e.target.value)}
                                placeholder="10:00 AM - 01:00 PM"
                                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-[#121218] text-slate-900 dark:text-white"
                                required
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                                Venue / Hall
                              </label>
                              <input
                                type="text"
                                value={editExamVenue}
                                onChange={(e) => setEditExamVenue(e.target.value)}
                                placeholder="Hall B-102"
                                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-[#121218] text-slate-900 dark:text-white"
                              />
                            </div>

                            <div className="flex items-end gap-2">
                              <button
                                type="button"
                                onClick={handleCancelEditExam}
                                className="w-1/2 py-1.5 px-3 rounded-xl border border-slate-300 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-[#1E1E28] text-slate-700 dark:text-slate-300 font-bold text-xs transition-all cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                disabled={isSavingExam}
                                className="w-1/2 py-1.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-bold text-xs shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1 disabled:opacity-60"
                              >
                                <Save className="w-3.5 h-3.5" />
                                <span>Save</span>
                              </button>
                            </div>
                          </div>

                          {/* Quick Exam Timings helper */}
                          <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[10px]">
                            <span className="text-slate-500 font-semibold">Quick timings:</span>
                            {[
                              '10:00 AM - 01:00 PM',
                              '02:00 PM - 05:00 PM',
                              '10:30 AM - 01:30 PM',
                              '09:30 AM - 12:30 PM',
                            ].map((timePreset) => (
                              <button
                                key={timePreset}
                                type="button"
                                onClick={() => setEditExamTimings(timePreset)}
                                className="px-1.5 py-0.5 rounded bg-white dark:bg-[#121218] border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-slate-300 hover:border-amber-500 hover:text-amber-600 transition-colors cursor-pointer"
                              >
                                {timePreset}
                              </button>
                            ))}
                          </div>
                        </form>
                      );
                    }

                    return (
                      <div
                        key={item.id}
                        className="p-3 rounded-2xl border border-slate-200/90 dark:border-[#22222E] bg-white dark:bg-[#121218] flex items-center justify-between gap-3 shadow-xs hover:border-amber-400/50 transition-all"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${item.examType.toUpperCase().includes('UNIT') || item.examType.toUpperCase().startsWith('UT')
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

                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => handleStartEditExam(item)}
                            className="p-2 rounded-xl text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-all flex-shrink-0 cursor-pointer"
                            title="Edit Exam Date"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteExam(item.id)}
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all flex-shrink-0 cursor-pointer"
                            title="Delete Exam Date"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-slate-200/80 dark:border-[#222228] flex items-center justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowExamDatesManagerModal(false);
                  setEditingExamId(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1E1E26] transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}


        

      {/* ======================================================== */}
      {/* MODAL 7: Notices & Documents Manager */}
      {/* ======================================================== */}
      {showNoticesManagerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-4xl bg-white dark:bg-[#0E0E14] border border-slate-200 dark:border-[#262632] rounded-3xl shadow-2xl p-4 sm:p-7 space-y-4 max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200/80 dark:border-[#222228]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold flex-shrink-0">
                  <Bell className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Notices &amp; Docs Manager</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                      Drive + Sheet
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Publish announcements, edit notices, upload documents to Drive, and sync instantly with students.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowNoticesManagerModal(false);
                  setEditingNoticeId(null);
                  setShowAddNoticeRow(false);
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1A1A24] transition-all cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Success Alert */}
            {noticePublishSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                <span>Notice saved successfully!</span>
              </div>
            )}

            {/* Error Alert */}
            {noticeError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
                <span>{noticeError}</span>
              </div>
            )}

            {/* Controls Bar: Semester Filters + Search & Refresh (Matching Timetable/Exam Dates) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1">
              {/* Semester Selector Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {(['ALL', 1, 2, 3] as const).map((sem) => (
                  <button
                    key={sem}
                    type="button"
                    onClick={() => {
                      setNoticeSemesterFilter(sem);
                      setEditingNoticeId(null);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                      noticeSemesterFilter === sem
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white dark:bg-[#1E1E28] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-[#252535]'
                    }`}
                  >
                    {sem === 'ALL' ? 'All Sems' : `Sem ${sem}`}
                  </button>
                ))}
              </div>

              {/* Search Bar & Refresh */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:w-56">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={noticeSearchQuery}
                    onChange={(e) => setNoticeSearchQuery(e.target.value)}
                    placeholder="Search notices, title, id..."
                    className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#1E1E28] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsLoadingNotices(true);
                    noticeService.fetchNotices(true).then((res) => {
                      if (res.data) setAllNotices(res.data);
                      setIsLoadingNotices(false);
                    });
                  }}
                  className="p-2 rounded-xl border border-slate-200 dark:border-[#262632] hover:bg-slate-100 dark:hover:bg-[#1E1E28] text-slate-500 hover:text-slate-800 dark:hover:text-white transition-all cursor-pointer"
                  title="Refresh notices from database"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingNotices ? 'animate-spin text-blue-500' : ''}`} />
                </button>
              </div>
            </div>

            {/* Notices List Area */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>
                    {noticeSemesterFilter === 'ALL' ? 'All Semesters' : `Semester ${noticeSemesterFilter}`} Notices
                  </span>
                  <span className="text-[11px] text-slate-500 font-normal">
                    ({filteredNotices.length} notice{filteredNotices.length === 1 ? '' : 's'})
                  </span>
                  {isLoadingNotices && <RefreshCw className="w-3 h-3 text-blue-500 animate-spin" />}
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddNoticeRow((prev) => !prev);
                    setEditingNoticeId(null);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-400 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{showAddNoticeRow ? 'Cancel Add' : 'Add Notice'}</span>
                </button>
              </div>

              {/* Collapsible Add Notice Form (Matching Timetable/Exam Dates design) */}
              {showAddNoticeRow && (
                <form
                  onSubmit={handlePublishNotice}
                  className="p-4 rounded-2xl border-2 border-blue-500/40 bg-blue-50/40 dark:bg-[#101424]/60 space-y-3 animate-in fade-in"
                >
                  <div className="flex items-center justify-between pb-1 border-b border-blue-500/20">
                    <span className="text-xs font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5" />
                      <span>Publish New Notice</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAddNoticeRow(false)}
                      className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Target Semester *
                      </label>
                      <select
                        value={newNoticeSemester}
                        onChange={(e) => setNewNoticeSemester(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-[#121218] text-slate-900 dark:text-white"
                      >
                        <option value="ALL">All Semesters (General)</option>
                        <option value="1">Semester 1</option>
                        <option value="2">Semester 2</option>
                        <option value="3">Semester 3</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Notice ID (Auto or Custom) *
                      </label>
                      <input
                        type="text"
                        value={newNoticeId}
                        onChange={(e) => setNewNoticeId(e.target.value)}
                        required
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-[#121218] text-slate-900 dark:text-white font-mono text-[11px]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        External Links (Optional)
                      </label>
                      <input
                        type="text"
                        value={newNoticeLinks}
                        onChange={(e) => setNewNoticeLinks(e.target.value)}
                        placeholder="https://link1.com, https://link2.com"
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-[#121218] text-slate-900 dark:text-white text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Notice Title / Subject *
                    </label>
                    <input
                      type="text"
                      value={newNoticeTitle}
                      onChange={(e) => setNewNoticeTitle(e.target.value)}
                      placeholder="e.g. Schedule for Mid-Term Examination / Fee Submission"
                      required
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-[#121218] text-slate-900 dark:text-white text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Notice Content / Description *
                    </label>
                    <textarea
                      value={newNoticeContent}
                      onChange={(e) => setNewNoticeContent(e.target.value)}
                      placeholder="Enter notice announcements, instructions, deadlines, or room details..."
                      rows={3}
                      required
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-[#121218] text-slate-900 dark:text-white text-xs resize-none"
                    />
                  </div>

                  {/* Document Attachments */}
                  <div className="p-3 rounded-xl border border-dashed border-slate-300 dark:border-zinc-700 bg-white/70 dark:bg-[#161622] space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                          <Upload className="w-3.5 h-3.5 text-blue-500" />
                          <span>Attach Documents (Optional, Multiple)</span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          PDF, Word doc, image, or ZIP documents.
                        </p>
                      </div>

                      <label className="cursor-pointer px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold flex items-center gap-1.5 transition-all self-start sm:self-auto">
                        <Plus className="w-3.5 h-3.5" />
                        <span>Select Files</span>
                        <input
                          type="file"
                          multiple
                          onChange={handleNoticeFilesChange}
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.zip"
                          className="hidden"
                        />
                      </label>
                    </div>

                    {newNoticeFiles.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-200 dark:border-zinc-800">
                        {newNoticeFiles.map((f, fIdx) => (
                          <div
                            key={fIdx}
                            className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/60 px-2.5 py-1 rounded-lg"
                          >
                            <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                            <span className="text-xs font-medium text-blue-900 dark:text-blue-200 max-w-[160px] truncate">
                              {f.name}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveNoticeFile(fIdx)}
                              className="text-rose-500 hover:text-rose-700 ml-1 cursor-pointer"
                              title="Remove file"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={isPublishingNotice}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {isPublishingNotice ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Publishing Notice...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>Publish Notice to Drive &amp; Sheet</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* Existing Notices List */}
              {isLoadingNotices ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Loading notices from database...
                </div>
              ) : filteredNotices.length === 0 ? (
                <div className="py-12 text-center text-slate-400 border border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl p-6 text-xs">
                  <Bell className="w-6 h-6 mx-auto mb-2 text-slate-300 dark:text-zinc-600" />
                  <p className="font-semibold text-slate-600 dark:text-slate-300">No notices found for this filter</p>
                  <p className="text-[11px] text-slate-400 mt-1">Click &quot;Add Notice&quot; above to publish announcements.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredNotices.map((n) => {
                    const isEditingThis = editingNoticeId === n.id;
                    if (isEditingThis) {
                      return (
                        <form
                          key={n.id}
                          onSubmit={handleSaveEditedNotice}
                          className="p-4 rounded-2xl border-2 border-blue-500 bg-blue-50/50 dark:bg-[#101424]/90 shadow-md space-y-3 animate-in fade-in transition-all"
                        >
                          <div className="flex items-center justify-between pb-2 border-b border-blue-500/20">
                            <span className="text-xs font-bold text-blue-700 dark:text-blue-400 truncate max-w-[70%]">
                              Edit Notice: {n.title} ({n.id})
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={handleCancelEditNotice}
                                className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                disabled={isUpdatingNotice}
                                className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition-all cursor-pointer disabled:opacity-60"
                              >
                                {isUpdatingNotice ? (
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Check className="w-3.5 h-3.5" />
                                )}
                                <span>Save Notice</span>
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                                Target Semester
                              </label>
                              <select
                                value={editNoticeSemester}
                                onChange={(e) => setEditNoticeSemester(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-[#121218] text-slate-900 dark:text-white"
                              >
                                <option value="ALL">All Semesters (General)</option>
                                <option value="1">Semester 1</option>
                                <option value="2">Semester 2</option>
                                <option value="3">Semester 3</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                                Notice ID
                              </label>
                              <input
                                type="text"
                                value={n.id}
                                disabled
                                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-slate-100 dark:bg-[#181820] text-slate-500 font-mono text-[11px] cursor-not-allowed"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                                External Links (Comma-separated)
                              </label>
                              <input
                                type="text"
                                value={editNoticeLinks}
                                onChange={(e) => setEditNoticeLinks(e.target.value)}
                                placeholder="https://link1.com, https://link2.com"
                                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-[#121218] text-slate-900 dark:text-white text-xs"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                              Notice Title / Subject *
                            </label>
                            <input
                              type="text"
                              value={editNoticeTitle}
                              onChange={(e) => setEditNoticeTitle(e.target.value)}
                              required
                              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-[#121218] text-slate-900 dark:text-white text-xs font-semibold"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                              Notice Content / Description *
                            </label>
                            <textarea
                              value={editNoticeContent}
                              onChange={(e) => setEditNoticeContent(e.target.value)}
                              rows={3}
                              required
                              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-[#121218] text-slate-900 dark:text-white text-xs resize-none"
                            />
                          </div>

                          {/* Documents Section: Existing & New */}
                          <div className="p-3 rounded-xl border border-dashed border-slate-300 dark:border-zinc-700 bg-white/70 dark:bg-[#161622] space-y-2">
                            {/* Existing attached docs */}
                            {editNoticeDocuments.length > 0 && (
                              <div className="space-y-1">
                                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">
                                  Current Documents ({editNoticeDocuments.length}):
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                  {editNoticeDocuments.map((doc, dIdx) => (
                                    <div
                                      key={dIdx}
                                      className="flex items-center gap-1.5 bg-slate-100 dark:bg-[#1A1A26] border border-slate-200 dark:border-zinc-700 px-2 py-1 rounded-lg text-xs"
                                    >
                                      <FileText className="w-3 h-3 text-blue-500 flex-shrink-0" />
                                      <a
                                        href={doc.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline max-w-[140px] truncate"
                                      >
                                        {doc.name}
                                      </a>
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveEditExistingDoc(dIdx)}
                                        className="text-rose-500 hover:text-rose-700 ml-1 cursor-pointer"
                                        title="Remove this document"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Upload new files to add */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-slate-200/60 dark:border-zinc-800">
                              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                Attach additional files to this notice
                              </span>
                              <label className="cursor-pointer px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold flex items-center gap-1 transition-all self-start sm:self-auto">
                                <Plus className="w-3 h-3" />
                                <span>Attach More</span>
                                <input
                                  type="file"
                                  multiple
                                  onChange={handleEditNoticeFilesChange}
                                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.zip"
                                  className="hidden"
                                />
                              </label>
                            </div>

                            {editNoticeNewFiles.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {editNoticeNewFiles.map((f, fIdx) => (
                                  <div
                                    key={fIdx}
                                    className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/60 px-2 py-1 rounded-lg text-xs"
                                  >
                                    <Upload className="w-3 h-3 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                                    <span className="text-[11px] font-medium text-blue-900 dark:text-blue-200 max-w-[140px] truncate">
                                      {f.name}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveEditNewFile(fIdx)}
                                      className="text-rose-500 hover:text-rose-700 ml-1 cursor-pointer"
                                      title="Remove file"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={handleCancelEditNotice}
                              className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-[#1E1E28] text-slate-700 dark:text-slate-300 font-bold text-xs transition-all cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={isUpdatingNotice}
                              className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-60"
                            >
                              {isUpdatingNotice ? (
                                <>
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  <span>Saving Timetable...</span>
                                </>
                              ) : (
                                <>
                                  <Save className="w-3.5 h-3.5" />
                                  <span>Save Changes</span>
                                </>
                              )}
                            </button>
                          </div>
                        </form>
                      );
                    }

                    // Normal Notice Row View
                    const noticeDocs = n.documents && n.documents.length > 0
                      ? n.documents
                      : n.documentUrl
                      ? [{ name: n.documentName || 'Document', url: n.documentUrl }]
                      : [];

                    return (
                      <div
                        key={n.id}
                        className="p-3.5 rounded-2xl border border-slate-200/90 dark:border-[#22222E] bg-white dark:bg-[#121218] flex flex-col sm:flex-row sm:items-start justify-between gap-3 shadow-xs hover:border-blue-400/50 transition-all"
                      >
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#1A1A24] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-zinc-800">
                              {n.id}
                            </span>
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-md border bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/40">
                              {!n.semester || n.semester === 'ALL' ? 'All Semesters' : `Sem ${n.semester}`}
                            </span>
                            <span className="text-xs text-slate-400 font-mono">
                              {n.timestamp ? new Date(n.timestamp).toLocaleDateString() : ''}
                            </span>
                          </div>

                          <h5 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white break-words">
                            {n.title}
                          </h5>

                          <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 whitespace-pre-wrap break-words line-clamp-2">
                            {n.content}
                          </p>

                          {/* Attachments, Links, Drive Folder */}
                          <div className="flex items-center gap-2 pt-1 flex-wrap text-[11px]">
                            {noticeDocs.map((doc, dIdx) => (
                              <a
                                key={dIdx}
                                href={doc.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#1A1A26] text-blue-600 dark:text-blue-400 hover:underline border border-slate-200/80 dark:border-zinc-800 font-medium"
                              >
                                <FileText className="w-3 h-3 flex-shrink-0" />
                                <span className="max-w-[130px] truncate">{doc.name}</span>
                                <ExternalLink className="w-2.5 h-2.5 opacity-60 flex-shrink-0" />
                              </a>
                            ))}

                            {n.links && n.links.length > 0 && n.links.map((link, lIdx) => (
                              <a
                                key={lIdx}
                                href={link}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 hover:underline border border-purple-200/80 dark:border-purple-800/40 font-medium"
                              >
                                <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                <span className="max-w-[120px] truncate">{link.replace(/^https?:\/\//, '')}</span>
                              </a>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 flex-shrink-0 self-end sm:self-center">
                          <button
                            type="button"
                            onClick={() => handleStartEditNotice(n)}
                            className="p-2 rounded-xl text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-all flex-shrink-0 cursor-pointer"
                            title="Edit Notice"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteNotice(n.id)}
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all flex-shrink-0 cursor-pointer"
                            title="Delete Notice & Trash Drive Folder"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-slate-200/80 dark:border-[#222228] flex items-center justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowNoticesManagerModal(false);
                  setEditingNoticeId(null);
                  setShowAddNoticeRow(false);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1E1E26] transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 8: Blocked Users Management */}
      {/* ======================================================== */}
      {showBlockedUsersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-4xl bg-white dark:bg-[#0E0E14] border border-slate-200 dark:border-[#262632] rounded-3xl shadow-2xl p-4 sm:p-7 space-y-4 max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200/80 dark:border-[#222228]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold flex-shrink-0">
                  <UserX className="w-5 h-5 text-rose-500" />
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Block / Unblock Students</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                      Access Control
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Manage student portal access. Blocked students are immediately locked out from logging in.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowBlockedUsersModal(false);
                  setBlockingUserId(null);
                  setShowManualBlockRow(false);
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1A1A24] transition-all cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Notification alert */}
            {blockActionMessage && (
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-[#181824] border border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-white text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                <Sparkles className="w-4 h-4 text-[#8048A8] flex-shrink-0" />
                <span>{blockActionMessage}</span>
              </div>
            )}

            {/* Controls Bar: Status Filter Chips + Search & Refresh */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1">
              {/* Status Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {(['ALL', 'BLOCKED', 'ACTIVE'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => {
                      setBlockStatusFilter(st);
                      setBlockingUserId(null);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      blockStatusFilter === st
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-white dark:bg-[#1E1E28] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-[#252535]'
                    }`}
                  >
                    {st === 'ALL' ? 'All Students' : st === 'BLOCKED' ? `Blocked (${blockedUsers.length})` : 'Active'}
                  </button>
                ))}
              </div>

              {/* Search Bar & Refresh */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:w-56">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={blockSearchQuery}
                    onChange={(e) => setBlockSearchQuery(e.target.value)}
                    placeholder="Search name, USN, email..."
                    className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#1E1E28] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsLoadingBlockedUsers(true);
                    adminSheetService.fetchBlockedUsers(true).then((list) => {
                      if (Array.isArray(list)) setBlockedUsers(list);
                      setIsLoadingBlockedUsers(false);
                    });
                    profileService.fetchAllStudents().then((res) => {
                      if (res.success && res.data && res.data.length > 0) {
                        setAllStudents(res.data);
                      }
                    });
                  }}
                  className="p-2 rounded-xl border border-slate-200 dark:border-[#262632] hover:bg-slate-100 dark:hover:bg-[#1E1E28] text-slate-500 hover:text-slate-800 dark:hover:text-white transition-all cursor-pointer"
                  title="Refresh student list and blocked users"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingBlockedUsers ? 'animate-spin text-rose-500' : ''}`} />
                </button>
              </div>
            </div>

            {/* Students List Area */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Enrolled Students</span>
                  <span className="text-[11px] text-slate-500 font-normal">
                    ({displayStudents.length} student{displayStudents.length === 1 ? '' : 's'})
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                    {blockedUsers.length} Blocked
                  </span>
                  {isLoadingBlockedUsers && <RefreshCw className="w-3 h-3 text-rose-500 animate-spin" />}
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    setShowManualBlockRow((prev) => !prev);
                    setBlockingUserId(null);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{showManualBlockRow ? 'Cancel' : 'Block Custom ID'}</span>
                </button>
              </div>

              {/* Collapsible Manual Block Form (Matching other modals) */}
              {showManualBlockRow && (
                <form
                  onSubmit={handleBlockUserSubmit}
                  className="p-4 rounded-2xl border-2 border-rose-500/40 bg-rose-50/40 dark:bg-[#1E1014]/60 space-y-3 animate-in fade-in"
                >
                  <div className="flex items-center justify-between pb-1 border-b border-rose-500/20">
                    <span className="text-xs font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5" />
                      <span>Block User by ID / USN / Email</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowManualBlockRow(false)}
                      className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        User ID / USN / Email *
                      </label>
                      <input
                        type="text"
                        value={newBlockUserId}
                        onChange={(e) => setNewBlockUserId(e.target.value)}
                        placeholder="e.g. 1RV21CS001 or email"
                        required
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-[#121218] text-slate-900 dark:text-white font-mono text-[11px]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Student Name (Optional)
                      </label>
                      <input
                        type="text"
                        value={newBlockStudentName}
                        onChange={(e) => setNewBlockStudentName(e.target.value)}
                        placeholder="e.g. John Doe"
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-[#121218] text-slate-900 dark:text-white text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Reason for Block
                      </label>
                      <input
                        type="text"
                        value={newBlockReason}
                        onChange={(e) => setNewBlockReason(e.target.value)}
                        placeholder="e.g. Administrative hold"
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-[#121218] text-slate-900 dark:text-white text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={isSubmittingBlock || !newBlockUserId.trim()}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmittingBlock ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Saving Timetable...</span>
                        </>
                      ) : (
                        <>
                          <UserX className="w-3.5 h-3.5" />
                          <span>Block User Access</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* Students List */}
              {displayStudents.length === 0 ? (
                <div className="py-12 text-center text-slate-400 border border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl p-6 text-xs">
                  <UserX className="w-6 h-6 mx-auto mb-2 text-slate-300 dark:text-zinc-600" />
                  <p className="font-semibold text-slate-600 dark:text-slate-300">No students found matching your criteria</p>
                  <p className="text-[11px] text-slate-400 mt-1">Try clearing the search or changing filter chips.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {displayStudents.map((st) => {
                    const isBlockingThis = blockingUserId === st.id;

                    if (isBlockingThis) {
                      return (
                        <form
                          key={st.id}
                          onSubmit={handleConfirmInlineBlock}
                          className="p-4 rounded-2xl border-2 border-rose-500 bg-rose-50/50 dark:bg-[#1E1014]/90 shadow-md space-y-3 animate-in fade-in transition-all"
                        >
                          <div className="flex items-center justify-between pb-2 border-b border-rose-500/20">
                            <span className="text-xs font-bold text-rose-700 dark:text-rose-400 truncate max-w-[70%] flex items-center gap-1.5">
                              <UserX className="w-3.5 h-3.5" />
                              <span>Block Student: {st.name} ({st.id})</span>
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={handleCancelInlineBlock}
                                className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                disabled={isSubmittingBlock}
                                className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition-all cursor-pointer disabled:opacity-60"
                              >
                                {isSubmittingBlock ? (
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Check className="w-3.5 h-3.5" />
                                )}
                                <span>Confirm Block</span>
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                              Reason for Blocking *
                            </label>
                            <input
                              type="text"
                              value={blockingReasonInput}
                              onChange={(e) => setBlockingReasonInput(e.target.value)}
                              placeholder="e.g. Administrative hold, Fee pending, Disciplinary action"
                              required
                              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-[#121218] text-slate-900 dark:text-white text-xs font-medium"
                            />
                          </div>
                        </form>
                      );
                    }

                    // Normal Student Row View
                    return (
                      <div
                        key={st.id}
                        className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs ${
                          st.isBlocked
                            ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/20 dark:bg-[#180F12]'
                            : 'border-slate-200/90 dark:border-[#22222E] bg-white dark:bg-[#121218] hover:border-slate-300 dark:hover:border-zinc-700'
                        }`}
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#1A1A24] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-zinc-800">
                              {st.id}
                            </span>
                            {st.semester && st.semester !== 'N/A' && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md border bg-slate-100 dark:bg-[#1A1A24] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-zinc-800">
                                Sem {st.semester}
                              </span>
                            )}
                            {st.isBlocked ? (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-md border bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800/60 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                <span>Blocked</span>
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md border bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span>Active</span>
                              </span>
                            )}
                          </div>

                          <h5 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                            {st.name}
                          </h5>

                          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                            {st.email && (
                              <span className="truncate max-w-[240px]">
                                {st.email}
                              </span>
                            )}
                            {st.isBlocked && st.blockedInfo?.reason && (
                              <>
                                <span className="text-slate-300 dark:text-zinc-700">•</span>
                                <span className="text-rose-600 dark:text-rose-400 font-medium">
                                  Reason: {st.blockedInfo.reason}
                                </span>
                              </>
                            )}
                            {st.isBlocked && st.blockedInfo?.timestamp && (
                              <>
                                <span className="text-slate-300 dark:text-zinc-700">•</span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {new Date(st.blockedInfo.timestamp).toLocaleDateString()}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                          {st.isBlocked ? (
                            <button
                              type="button"
                              onClick={() => handleUnblockStudent(st.blockedInfo?.userId || st.id)}
                              disabled={isUnblockingUserId === (st.blockedInfo?.userId || st.id)}
                              className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                            >
                              {isUnblockingUserId === (st.blockedInfo?.userId || st.id) ? (
                                <>
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  <span>Unblocking...</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Unblock</span>
                                </>
                              )}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleStartInlineBlock(st.id, st.name)}
                              className="py-1.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800/60 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                            >
                              <UserX className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                              <span>Block</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-slate-200/80 dark:border-[#222228] flex items-center justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowBlockedUsersModal(false);
                  setBlockingUserId(null);
                  setShowManualBlockRow(false);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1E1E26] transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 9: Semester Data Files Upload */}
      {/* ======================================================== */}
      {showSemesterDataUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-4xl bg-white dark:bg-[#0E0E14] border border-slate-200 dark:border-[#262632] rounded-3xl shadow-2xl p-4 sm:p-7 space-y-4 max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200/80 dark:border-[#222228]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800/40 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-bold flex-shrink-0">
                  <FolderUp className="w-5 h-5 text-cyan-500" />
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Semester Files Manager</span>

                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Upload and manage notes, syllabus, question papers, and study materials for students.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowSemesterDataUploadModal(false);
                  setShowSemUploadForm(false);
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1A1A24] transition-all cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Success Alert */}
            {semUploadSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                <span>{semUploadSuccessMsg}</span>
              </div>
            )}

            {/* Error Alert */}
            {semUploadErrorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
                <span>{semUploadErrorMsg}</span>
              </div>
            )}

            {/* Controls Bar: Semester Chips + Search + Refresh */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1">
              {/* Semester Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {[1, 2, 3].map((sem) => (
                  <button
                    key={sem}
                    type="button"
                    onClick={() => {
                      setSemDataUploadSemester(sem);
                      loadExistingSemesterFiles(sem, false);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      semDataUploadSemester === sem
                        ? 'bg-cyan-600 text-white shadow-xs'
                        : 'bg-white dark:bg-[#1E1E28] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-[#252535]'
                    }`}
                  >
                    Semester {sem}
                  </button>
                ))}
              </div>

              {/* Search & Refresh */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:w-56">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={semFilesFilterQuery}
                    onChange={(e) => setSemFilesFilterQuery(e.target.value)}
                    placeholder="Search subject, topic, file..."
                    className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#1E1E28] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => loadExistingSemesterFiles(semDataUploadSemester, true)}
                  className="p-2 rounded-xl border border-slate-200 dark:border-[#262632] hover:bg-slate-100 dark:hover:bg-[#1E1E28] text-slate-500 hover:text-slate-800 dark:hover:text-white transition-all cursor-pointer"
                  title="Refresh files list"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingExistingSemFiles ? 'animate-spin text-cyan-500' : ''}`} />
                </button>
              </div>
            </div>

            {/* Files List Area */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Semester {semDataUploadSemester} Files</span>
                  <span className="text-[11px] text-slate-500 font-normal">
                    ({filteredExistingSemFiles.length} file{filteredExistingSemFiles.length === 1 ? '' : 's'})
                  </span>
                  {isLoadingExistingSemFiles && <RefreshCw className="w-3 h-3 text-cyan-500 animate-spin" />}
                </h4>
                <button
                  type="button"
                  onClick={() => setShowSemUploadForm((prev) => !prev)}
                  className="px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{showSemUploadForm ? 'Cancel Upload' : 'Upload Files'}</span>
                </button>
              </div>

              {/* Collapsible Upload Form (Matching other modals) */}
              {showSemUploadForm && (
                <form
                  onSubmit={handleUploadSemesterFilesSubmit}
                  className="p-4 rounded-2xl border-2 border-cyan-500/40 bg-cyan-50/40 dark:bg-[#0c1822]/60 space-y-3 animate-in fade-in"
                >
                  <div className="flex items-center justify-between pb-1 border-b border-cyan-500/20">
                    <span className="text-xs font-bold text-cyan-700 dark:text-cyan-400 flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload New Files to Semester {semDataUploadSemester}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowSemUploadForm(false)}
                      className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Subject Name / Code *
                      </label>
                      <input
                        type="text"
                        value={semDataSubject}
                        onChange={(e) => setSemDataSubject(e.target.value)}
                        placeholder="e.g. DSA, DBMS, MATH, OS, CN"
                        required
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-[#1A1A24] text-slate-900 dark:text-white text-xs font-semibold uppercase"
                      />
                      {/* Quick Subject Chips */}
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {['DSA', 'DBMS', 'MATH', 'OS', 'CN', 'AI', 'GENERAL'].map((chip) => (
                          <button
                            key={chip}
                            type="button"
                            onClick={() => setSemDataSubject(chip)}
                            className="px-1.5 py-0.5 rounded text-[10px] bg-slate-200/70 dark:bg-[#20202C] text-slate-700 dark:text-slate-300 hover:bg-cyan-100 dark:hover:bg-cyan-950/60 hover:text-cyan-600 transition-colors cursor-pointer"
                          >
                            {chip}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Topic / Description (Optional)
                      </label>
                      <input
                        type="text"
                        value={semDataTopic}
                        onChange={(e) => setSemDataTopic(e.target.value)}
                        placeholder="e.g. Unit 1 Linked List, Question Bank 2026"
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-[#1A1A24] text-slate-900 dark:text-white text-xs"
                      />
                      <label className="inline-flex items-center gap-1.5 mt-2 cursor-pointer text-[11px] text-slate-600 dark:text-slate-400">
                        <input
                          type="checkbox"
                          checked={semAutoRename}
                          onChange={(e) => setSemAutoRename(e.target.checked)}
                          className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                        />
                        <span>Auto-standardize filename (<code>SEM{semDataUploadSemester}-{semDataSubject || 'SUB'}-{semDataTopic || 'Topic'}.ext</code>)</span>
                      </label>
                    </div>
                  </div>

                  {/* Select Files Area */}
                  <div className="p-3.5 rounded-xl border border-dashed border-slate-300 dark:border-zinc-700 bg-white/70 dark:bg-[#161622] space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                          <FolderUp className="w-3.5 h-3.5 text-cyan-500" />
                          <span>Select Files to Upload (Multiple Allowed)</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          PDF, PPTX, Word, Excel, Images, or ZIP study materials.
                        </p>
                      </div>

                      <label className="cursor-pointer px-3 py-1.5 rounded-xl bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-950/60 dark:hover:bg-cyan-900/60 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 text-xs font-bold flex items-center gap-1.5 transition-all self-start sm:self-auto">
                        <Plus className="w-3.5 h-3.5" />
                        <span>Choose Files</span>
                        <input
                          type="file"
                          multiple
                          onChange={handleSelectSemFiles}
                          accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg,.zip"
                          className="hidden"
                        />
                      </label>
                    </div>

                    {semFilesToUpload.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-200 dark:border-zinc-800">
                        {semFilesToUpload.map((f, fIdx) => (
                          <div
                            key={fIdx}
                            className="flex items-center gap-2 bg-cyan-50 dark:bg-cyan-950/50 border border-cyan-200 dark:border-cyan-800/60 px-2.5 py-1.5 rounded-xl"
                          >
                            <FileText className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
                            <span className="text-xs font-medium text-cyan-900 dark:text-cyan-200 max-w-[200px] truncate">
                              {f.name}
                            </span>
                            <span className="text-[10px] text-cyan-500">
                              ({formatFileSize(f.size)})
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveSelectedSemFile(fIdx)}
                              className="text-rose-500 hover:text-rose-700 ml-1 cursor-pointer"
                              title="Remove file"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={isUploadingSemFiles || semFilesToUpload.length === 0}
                      className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {isUploadingSemFiles ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Uploading {semFilesToUpload.length} file(s)...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload to Semester {semDataUploadSemester}</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* Scrollable list */}
              {filteredExistingSemFiles.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-[#222230] bg-slate-50/50 dark:bg-[#121218]/40 space-y-2">
                  <FileText className="w-8 h-8 text-slate-300 dark:text-zinc-600 mx-auto" />
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {isLoadingExistingSemFiles
                      ? 'Loading files...'
                      : semFilesFilterQuery
                      ? 'No files matching your search filter.'
                      : `No files found for Semester ${semDataUploadSemester} yet.`}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredExistingSemFiles.map((f) => (
                    <div
                      key={f.id}
                      className="p-3 sm:p-3.5 rounded-2xl border border-slate-200/80 dark:border-[#22222E] bg-white dark:bg-[#14141E] flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-cyan-500/30 transition-all shadow-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-9 h-9 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800/40 flex items-center justify-center text-cyan-600 dark:text-cyan-400 flex-shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 space-y-0.5">
                          <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate" title={f.name}>
                            {f.name}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                            <span className="font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/50 px-1.5 py-0.5 rounded border border-cyan-500/20">
                              {f.subject || 'GENERAL'}
                            </span>
                            <span>&bull;</span>
                            <span>{f.formattedSize}</span>
                            {f.topic && (
                              <>
                                <span>&bull;</span>
                                <span className="truncate max-w-[200px] text-slate-600 dark:text-slate-300 font-medium">
                                  {f.topic}
                                </span>
                              </>
                            )}
                            {f.folderName && (
                              <>
                                <span>&bull;</span>
                                <span className="text-slate-400">Folder: {f.folderName}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                        <a
                          href={f.viewUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-[#1C1C26] hover:bg-slate-200 dark:hover:bg-[#252532] text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 border border-slate-200 dark:border-[#282836] transition-all cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </a>
                        <a
                          href={f.downloadUrl}
                          target="_blank"
                          rel="noreferrer"
                          download={f.name}
                          className="px-2.5 py-1.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-100 text-xs font-semibold flex items-center gap-1.5 border border-cyan-200 dark:border-cyan-800/60 transition-all cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => handleDeleteSemFile(f.id, f.name)}
                          disabled={isDeletingSemFileId === f.id}
                          className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer disabled:opacity-50"
                          title="Delete file"
                        >
                          {isDeletingSemFileId === f.id ? (
                            <RefreshCw className="w-4 h-4 animate-spin text-rose-500" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-slate-200/80 dark:border-[#222228] flex items-center justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowSemesterDataUploadModal(false);
                  setShowSemUploadForm(false);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1E1E26] transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 10: Change Details / Requests Management Modal */}
      {/* ======================================================== */}
      {showChangeRequestsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-4xl bg-white dark:bg-[#0E0E14] border border-slate-200 dark:border-[#262632] rounded-3xl shadow-2xl p-4 sm:p-7 space-y-4 max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200/80 dark:border-[#222228]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold flex-shrink-0">
                  <UserCheck className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Student Change Details</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      {requests.length} Pending
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Review and verify student profile updates, discrepancy reports, and record changes.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowChangeRequestsModal(false);
                  setChangeSearchQuery('');
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1A1A24] transition-all cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Notification alert */}
            {changeActionMessage && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>{changeActionMessage}</span>
              </div>
            )}

            {/* Controls Bar: Search & Refresh */}
            <div className="flex items-center gap-2 pb-1">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={changeSearchQuery}
                  onChange={(e) => setChangeSearchQuery(e.target.value)}
                  placeholder="Search by student name, USN, field name, or requested value..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-[#121218] text-slate-900 dark:text-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <button
                type="button"
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-[#121218] hover:bg-slate-100 dark:hover:bg-[#181822] text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                title="Refresh requests list"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-emerald-500 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>

            {/* Change Requests List */}
            <div className="flex-1 overflow-y-auto max-h-[56vh] pr-1 space-y-3">
              {filteredChangeRequests.length === 0 ? (
                <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-[#121218]">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {changeSearchQuery.trim() ? 'No matching change requests' : 'All change requests resolved'}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                    {changeSearchQuery.trim()
                      ? `No change requests matched "${changeSearchQuery}". Try clearing your search query.`
                      : 'There are currently no pending student profile or record update requests.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredChangeRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-4 rounded-2xl border border-slate-200/90 dark:border-[#20202A] bg-slate-50/60 dark:bg-[#121218] hover:border-slate-300 dark:hover:border-zinc-700 transition-all space-y-3 shadow-xs"
                    >
                      {/* Header: Student Info + Field Badge + Submitted Time */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">
                            {req.student_name}
                          </span>
                          <span className="font-mono text-xs text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-lg bg-slate-200/70 dark:bg-[#1C1C24] font-semibold">
                            {req.student_usn}
                          </span>
                          <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-purple-100/80 dark:bg-purple-950/40 text-[#8048A8] dark:text-[#D1A7FF] border border-purple-200/70 dark:border-purple-800/40">
                            Field: {req.field_name}
                          </span>
                        </div>
                        {req.submitted_at && (
                          <span className="text-[11px] text-slate-400 font-medium">
                            {req.submitted_at}
                          </span>
                        )}
                      </div>

                      {/* Current vs Requested Value Comparison */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="p-3 rounded-xl bg-white dark:bg-[#181822] border border-slate-200/70 dark:border-zinc-800">
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                            Current Value
                          </span>
                          <span className="text-slate-600 dark:text-slate-300 font-medium break-all line-through decoration-slate-400/80">
                            {req.old_value || '(Empty)'}
                          </span>
                        </div>
                        <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-800/30">
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1 flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            <span>Requested Value</span>
                          </span>
                          <span className="font-bold text-emerald-700 dark:text-emerald-300 break-all">
                            {req.new_value}
                          </span>
                        </div>
                      </div>

                      {/* Reason Quote (if any) */}
                      {req.reason && (
                        <div className="px-3 py-2 rounded-xl bg-white/70 dark:bg-[#181822]/70 border border-slate-200/60 dark:border-zinc-800/80 text-xs text-slate-600 dark:text-slate-300 italic flex items-start gap-1.5">
                          <span className="font-semibold not-italic text-slate-400">Note:</span>
                          <span>&quot;{req.reason}&quot;</span>
                        </div>
                      )}

                      {/* Footer Actions */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-[#1E1E26]">
                        <span className="text-[11px] text-slate-400 hidden sm:inline">
                          Review student records and mark as resolved once updated.
                        </span>
                        <div className="flex items-center gap-2 ml-auto">
                          <button
                            type="button"
                            onClick={() => handleRequestDone(req.id)}
                            disabled={resolvingRequestId === req.id}
                            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            {resolvingRequestId === req.id ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>Resolving...</span>
                              </>
                            ) : (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Done / Resolve</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-slate-200/80 dark:border-[#222228] flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                Showing {filteredChangeRequests.length} of {requests.length} total request(s)
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowChangeRequestsModal(false);
                  setChangeSearchQuery('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1E1E26] transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminPortalPage;
