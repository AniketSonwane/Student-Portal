import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarCheck,
  AlertCircle,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { attendanceService } from '../../services/attendance';
import { StudentAttendanceRecord } from '../../types/attendance';
import { ThemeToggle } from '../../components/common/ThemeToggle';
import { Button } from '../../components/ui/Button';
import { LoadingState } from '../../components/common/LoadingState';
import { SemesterSelector } from '../../components/marks/SemesterSelector';
import { ROUTES } from '../../utils/constants';

export const AttendancePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Default to Semester 3 where active attendance is published
  const [selectedSemester, setSelectedSemester] = useState<number>(3);
  const selectedUsn = user?.usn || 'CS25131';

  const [record, setRecord] = useState<StudentAttendanceRecord | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isUnavailable, setIsUnavailable] = useState<boolean>(false);

  // Search state for filtering subjects in nav bar
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [activeSubjectCode, setActiveSubjectCode] = useState<string | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const subjectCardRefs = useRef<{ [code: string]: HTMLDivElement | null }>({});

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filtered subjects in active record based on search
  const filteredSubjects = useMemo(() => {
    if (!record?.subjects) return [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return record.subjects;
    return record.subjects.filter(
      (sub) => sub.code.toLowerCase().includes(q) || sub.name.toLowerCase().includes(q)
    );
  }, [record?.subjects, searchQuery]);

  // Dropdown search results
  const searchResults = useMemo(() => {
    if (!record?.subjects || !searchQuery.trim()) return [];
    const q = searchQuery.trim().toLowerCase();
    return record.subjects.filter(
      (sub) => sub.code.toLowerCase().includes(q) || sub.name.toLowerCase().includes(q)
    );
  }, [record?.subjects, searchQuery]);

  const handleSelectSubject = (code: string) => {
    setActiveSubjectCode(code);
    setIsSearchOpen(false);
    setTimeout(() => {
      const el = subjectCardRefs.current[code];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setIsSearchOpen(false);
    setActiveSubjectCode(null);
  };

  useEffect(() => {
    let isCancelled = false;

    const loadAttendance = async () => {
      setIsLoading(true);
      setIsFadingOut(false);
      setError(null);
      setIsUnavailable(false);

      if (selectedSemester !== 3) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        if (isCancelled) return;
        setIsFadingOut(true);
        setTimeout(() => {
          if (!isCancelled) {
            setIsLoading(false);
            setIsFadingOut(false);
            setIsUnavailable(true);
            setRecord(null);
          }
        }, 180);
        return;
      }

      try {
        const [res] = await Promise.all([
          attendanceService.getStudentAttendance(selectedUsn, 3),
          new Promise((resolve) => setTimeout(resolve, 320)),
        ]);
        if (isCancelled) return;

        if (res.success && res.data) {
          setRecord(res.data);
          setIsUnavailable(false);
        } else if (res.isUnavailable) {
          setIsUnavailable(true);
          setRecord(null);
        } else {
          setError(res.error || 'Unable to load attendance records.');
          setRecord(null);
        }
      } catch (err: any) {
        if (!isCancelled) {
          setError(err?.message || 'Failed to fetch attendance data.');
        }
      } finally {
        if (!isCancelled) {
          setIsFadingOut(true);
          setTimeout(() => {
            if (!isCancelled) {
              setIsLoading(false);
              setIsFadingOut(false);
            }
          }, 180);
        }
      }
    };

    loadAttendance();

    return () => {
      isCancelled = true;
    };
  }, [selectedUsn, selectedSemester]);

  return (
    <div className="min-h-screen bg-transparent text-slate-900 dark:text-slate-100 flex flex-col justify-between selection:bg-[#8048A8]/30">
      {/* Top Header Bar matching Semester Marks header */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-[#000000]/95 backdrop-blur-md border-b border-slate-200 dark:border-[#222228] px-3 sm:px-6 py-2.5 sm:py-3 transition-colors duration-200">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(ROUTES.DASHBOARD)}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
              className="hidden sm:inline-flex px-2 sm:px-3 text-xs flex-shrink-0 min-h-[36px]"
            >
              <span>Dashboard</span>
            </Button>
            <div className="hidden sm:block h-4 w-px bg-slate-200 dark:bg-zinc-800 flex-shrink-0" />
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-900 dark:bg-[#16161B] border border-slate-700/50 dark:border-[#8048A8]/40 flex items-center justify-center text-[#F8D299] shadow-sm flex-shrink-0">
                <CalendarCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#F8D299]" />
              </div>
              <h1 className="hidden lg:block text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-tight truncate">
                Attendance Portal
              </h1>
            </div>
          </div>

          {/* Center: Subject Search in Nav Bar */}
          <div ref={searchContainerRef} className="relative flex-1 max-w-xs sm:max-w-md mx-1 sm:mx-3">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 dark:text-zinc-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(true);
                }}
                onFocus={() => {
                  if (searchQuery.trim()) {
                    setIsSearchOpen(true);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setIsSearchOpen(false);
                  } else if (e.key === 'Enter' && searchResults.length > 0) {
                    handleSelectSubject(searchResults[0].code);
                  }
                }}
                placeholder="Search subject or code..."
                className="w-full pl-8 sm:pl-9 pr-8 py-1.5 sm:py-2 text-xs sm:text-sm rounded-full bg-slate-50 dark:bg-[#121217] border border-slate-200 dark:border-[#262630] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#8048A8]/40 focus:border-[#8048A8] transition-all shadow-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-2.5 p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Floating Dropdown Results */}
            {isSearchOpen && searchQuery.trim() && (
              <div className="absolute top-full left-0 right-0 mt-2 z-50 rounded-2xl bg-white/95 dark:bg-[#0E0E14]/95 backdrop-blur-xl border border-slate-200 dark:border-[#262630] shadow-2xl overflow-hidden max-h-96 overflow-y-auto animate-fade-in divide-y divide-slate-100 dark:divide-[#1C1C24]">
                <div className="px-3 py-2 bg-slate-50/80 dark:bg-[#121218] flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="font-semibold">
                    {searchResults.length > 0
                      ? `${searchResults.length} subject${searchResults.length > 1 ? 's' : ''} found`
                      : 'No matches found'}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-zinc-500">Sem {selectedSemester}</span>
                </div>

                {searchResults.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400 dark:text-slate-500">
                    No attendance subjects match "{searchQuery}"
                  </div>
                ) : (
                  searchResults.map((sub) => (
                    <div
                      key={sub.code}
                      onClick={() => handleSelectSubject(sub.code)}
                      className={`px-3.5 py-2.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-[#16161F] transition-colors ${
                        activeSubjectCode === sub.code ? 'bg-[#8048A8]/10 dark:bg-[#8048A8]/20' : ''
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                            {sub.code}
                          </span>
                          {sub.category && (
                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200/60 dark:border-zinc-700/60">
                              {sub.category}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium truncate mt-0.5">
                          {sub.name}
                        </p>
                      </div>

                      <div className="flex-shrink-0 text-right">
                        <span className={`text-xs font-bold ${
                          sub.numericPercentage >= 75
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : sub.numericPercentage >= 65
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}>
                          {sub.percentage}%
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto w-full px-3 sm:px-8 py-4 sm:py-8 pb-24 sm:pb-8 space-y-4 sm:space-y-6 flex-1">
        {/* Semester Selection Controls */}
        <SemesterSelector
          currentSemester={selectedSemester}
          availableSemesters={[1, 2, 3]}
          onSelectSemester={(sem) => setSelectedSemester(sem)}
        />

        {isLoading ? (
          <div
            className={`bg-white/80 dark:bg-[#0E0E14]/80 backdrop-blur-xl rounded-3xl border border-slate-200 dark:border-[#1F1F28] p-12 text-center shadow-lg ${
              isFadingOut ? 'animate-fade-out' : 'animate-fade-in'
            }`}
          >
            <LoadingState message="Fetching live attendance records from server..." />
          </div>
        ) : isUnavailable ? (
          /* When Sem 1 or Sem 2 is selected: Show Not Available as requested */
          <div className="bg-white/80 dark:bg-[#0E0E14]/80 backdrop-blur-xl rounded-3xl border border-amber-300/60 dark:border-amber-500/20 p-8 sm:p-12 text-center shadow-xl space-y-4 animate-card-slide-1">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 dark:bg-amber-400/10 border border-amber-500/30 text-amber-600 dark:text-[#F8D299] flex items-center justify-center mx-auto shadow-inner">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div className="space-y-1.5 max-w-md mx-auto">
              <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
                Not Available
              </span>
              <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Semester {selectedSemester} Attendance Not Available
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                attendance records for <strong>Semester {selectedSemester}</strong> are not available.
              </p>
            </div>
          </div>
        ) : error || !record ? (
          <div className="bg-white/80 dark:bg-[#0E0E14]/80 backdrop-blur-xl rounded-3xl border border-rose-300 dark:border-rose-900/40 p-8 sm:p-12 text-center shadow-xl space-y-4 animate-card-slide-1">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <XCircle className="w-8 h-8" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Attendance Record Not Found
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                {error || `No attendance entry found for USN: ${selectedUsn} in Semester ${selectedSemester}.`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedSemester(3)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Fetch</span>
            </button>
          </div>
        ) : (
          /* Main Central Attendance Card */
          <div className="bg-white/90 dark:bg-[#0D0D12]/90 backdrop-blur-xl rounded-3xl border border-slate-200/90 dark:border-[#22222C] shadow-xl overflow-hidden transition-all duration-300 animate-card-slide-1">
            {/* Card Header: User Name (Left) & Total Avg (Right) */}
            <div className="p-4 sm:p-6 pb-5 sm:pb-6 border-b border-slate-200/80 dark:border-[#1E1E26] bg-gradient-to-r from-slate-50/50 via-white/40 to-amber-50/20 dark:from-[#111117] dark:via-[#0E0E14] dark:to-[#171410] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {/* Left: User Name & Details (SRN removed as requested) */}
              <div className="space-y-1 min-w-0">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#8048A8]/10 dark:bg-[#8048A8]/20 text-[#8048A8] dark:text-[#D1A7FF] border border-[#8048A8]/30">
                  <ShieldCheck className="w-3 h-3 text-[#F8D299]" />
                  <span>Semester {record.semester} • Section C</span>
                </div>

                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight truncate">
                  {record.name}
                </h2>

                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>
                    USN: <strong className="text-slate-800 dark:text-slate-200 font-mono">{record.usn}</strong>
                  </span>
                </div>
              </div>

              {/* Right: Total Avg Card */}
              <div className="flex-shrink-0 flex items-center sm:justify-end">
                <div className="w-full sm:w-auto p-3.5 sm:px-5 sm:py-3 rounded-2xl bg-amber-500/10 dark:bg-amber-400/10 border-2 border-amber-500/40 dark:border-[#F8D299]/50 shadow-md flex items-center justify-between sm:justify-start gap-4">
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-[#F8D299] block">
                      Total Avg
                    </span>
                    <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-[#F8D299] tracking-tight">
                      {record.totalAverage}%
                    </div>
                  </div>

                  {/* Status indicator badge */}
                  <div className="text-right">
                    {record.numericAverage >= 75 ? (
                      <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Safe (≥75%)</span>
                      </div>
                    ) : record.numericAverage >= 65 ? (
                      <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                        <span>Warning</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                        <XCircle className="w-3.5 h-3.5 text-rose-500" />
                        <span>Shortage</span>
                      </div>
                    )}
                    <span className="block text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                      {record.numericAverage >= 75 ? 'Exam Eligible' : 'Condonation Req.'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card Body: Subject Boxes */}
            <div className="p-4 sm:p-6 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Subject Attendance Breakdown ({filteredSubjects.length}
                  {searchQuery.trim() ? ` of ${record.subjects.length}` : ''} Courses)
                </h3>
                {searchQuery.trim() && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="text-xs font-semibold text-[#8048A8] dark:text-[#D1A7FF] hover:underline"
                  >
                    Clear search filter
                  </button>
                )}
              </div>

              {filteredSubjects.length === 0 ? (
                <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-[#121217]/50">
                  <Search className="w-8 h-8 mx-auto text-slate-400 dark:text-zinc-600 mb-2" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    No subjects match "{searchQuery}"
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Try searching by another subject title or course code
                  </p>
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="mt-3 px-3 py-1.5 text-xs font-bold rounded-lg bg-[#8048A8] text-white hover:bg-[#6c3991] transition-colors"
                  >
                    Clear search filter
                  </button>
                </div>
              ) : (
                /* Grid of Subject Cards */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                  {filteredSubjects.map((sub) => {
                    const isSafe = sub.numericPercentage >= 75;
                    const isWarning = sub.numericPercentage >= 65 && sub.numericPercentage < 75;
                    const isMdm = sub.category === 'MDM';
                    const isOe = sub.category === 'OE';
                    const isSelected = activeSubjectCode === sub.code;

                    return (
                      <div
                        key={sub.code}
                        ref={(el) => {
                          subjectCardRefs.current[sub.code] = el;
                        }}
                        className={`p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 shadow-sm hover:shadow-md flex flex-col justify-between gap-3 group relative overflow-hidden ${
                          isSelected
                            ? 'ring-2 ring-[#8048A8] dark:ring-[#D1A7FF] shadow-lg border-[#8048A8] dark:border-[#D1A7FF] bg-white dark:bg-[#161622]'
                            : isMdm
                            ? 'border-purple-300/80 dark:border-purple-500/30 bg-purple-50/30 dark:bg-[#14101E]/80 hover:border-purple-400 dark:hover:border-purple-400'
                            : isOe
                            ? 'border-cyan-300/80 dark:border-cyan-500/30 bg-cyan-50/30 dark:bg-[#0E161C]/80 hover:border-cyan-400 dark:hover:border-cyan-400'
                            : 'border-slate-200 dark:border-[#22222C] bg-white/70 dark:bg-[#121218]/80 hover:border-amber-400 dark:hover:border-[#F8D299]/50'
                        } hover:-translate-y-1`}
                      >
                        {/* Top indicator bar */}
                        <div
                          className={`absolute top-0 left-0 right-0 h-1 ${
                            isSafe
                              ? 'bg-emerald-500'
                              : isWarning
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                        />

                        <div>
                          {/* Header: Code */}
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span
                              className="inline-flex items-center gap-1 font-mono text-xs font-extrabold px-2 py-0.5 rounded-md border bg-slate-100 dark:bg-[#1C1C24] text-slate-800 dark:text-slate-200 border-slate-200 dark:border-[#282834]"
                            >
                              {sub.code}
                            </span>
                            {isSelected && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#8048A8]/20 text-[#8048A8] dark:text-[#D1A7FF]">
                                Selected
                              </span>
                            )}
                          </div>

                          {/* Full Respective Subject Name */}
                          <h4
                            className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-2 min-h-[32px] group-hover:text-amber-600 dark:group-hover:text-[#F8D299] transition-colors"
                            title={sub.name}
                          >
                            {sub.name}
                          </h4>
                        </div>

                        {/* Percentage & Progress Bar (target: 75% removed as requested) */}
                        <div className="space-y-1.5 pt-1">
                          <div className="flex items-baseline justify-between">
                            <span className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                              {sub.percentage}%
                            </span>
                          </div>

                          {/* Visual Progress Bar */}
                          <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-[#1A1A22] overflow-hidden border border-slate-200/50 dark:border-[#262630]">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                isSafe
                                  ? isMdm
                                    ? 'bg-gradient-to-r from-purple-500 to-indigo-400'
                                    : isOe
                                    ? 'bg-gradient-to-r from-cyan-500 to-teal-400'
                                    : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                                  : isWarning
                                  ? 'bg-gradient-to-r from-amber-500 to-amber-300'
                                  : 'bg-gradient-to-r from-rose-500 to-red-400'
                              }`}
                              style={{ width: `${Math.min(100, Math.max(0, sub.numericPercentage))}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AttendancePage;
