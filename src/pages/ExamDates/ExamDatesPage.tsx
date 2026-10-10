import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  Clock,
  MapPin,
  ArrowLeft,
  CheckCircle2,
  Search,
  Layers,
  ChevronDown,
  Calendar,
  X,
  AlertCircle,
  Copy,
  Check,
  BookOpen,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { examDatesService } from '../../services/examDates';
import { ExamDateItem } from '../../types/exam';
import { ThemeToggle } from '../../components/common/ThemeToggle';
import { Button } from '../../components/ui/Button';
import { LoadingState } from '../../components/common/LoadingState';
import { SemesterSelector } from '../../components/marks/SemesterSelector';
import { getSubjectTheme } from '../../utils/subjectColors';
import { ROUTES } from '../../utils/constants';

export const ExamDatesPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Selected Semester (defaults to student's current semester or 3)
  const [selectedSemester, setSelectedSemester] = useState<number>(() => {
    return user?.current_semester || 3;
  });

  // Category filter: 'ALL' | 'CAE-1' | 'CAE-2' | 'ESE'
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Search query for filtering subjects
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Completed section collapsed state
  const [isCompletedExpanded, setIsCompletedExpanded] = useState<boolean>(true);

  // Selected exam for modal card view
  const [selectedExam, setSelectedExam] = useState<ExamDateItem | null>(null);
  const [copiedDetails, setCopiedDetails] = useState<boolean>(false);

  // Data fetching state
  const [allExams, setAllExams] = useState<ExamDateItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Handle escape key to close modal and body scroll lock
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedExam(null);
      }
    };
    if (selectedExam) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedExam]);

  // Copy exam details to clipboard
  const handleCopyExamDetails = () => {
    if (!selectedExam) return;
    const details = `${selectedExam.subjectName} (${selectedExam.subjectCode})\nExam: ${selectedExam.examType} (Semester ${selectedExam.semester})\nDate: ${selectedExam.formattedDate} (${selectedExam.dayOfWeek})\nTime: ${selectedExam.timings}\nVenue: ${selectedExam.venue || 'TBA'}`;
    navigator.clipboard
      .writeText(details)
      .then(() => {
        setCopiedDetails(true);
        setTimeout(() => setCopiedDetails(false), 2000);
      })
      .catch(() => {});
  };

  // Load exam schedule
  const loadExams = async (forceRefresh = false) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await examDatesService.fetchExamDates(undefined, forceRefresh);
      if (res.success && res.data) {
        setAllExams(res.data);
      } else {
        setError(res.error || 'Failed to load examination timetable.');
      }
    } catch (err: any) {
      setError(err?.message || 'Error communicating with Google Sheets.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadExams(true);

    const handleUpdate = () => {
      loadExams(true);
    };
    window.addEventListener('exam_dates_updated', handleUpdate);
    return () => {
      window.removeEventListener('exam_dates_updated', handleUpdate);
    };
  }, []);

  // Filter exams by current semester
  const semesterExams = useMemo(() => {
    return allExams.filter((e) => e.semester === selectedSemester);
  }, [allExams, selectedSemester]);

  // Available exam categories for the current semester
  const categories = useMemo(() => {
    const list: { id: string; label: string; count: number }[] = [
      { id: 'ALL', label: 'All Exams', count: semesterExams.length },
    ];

    const standardTypes: { id: string; label: string; match: (t: string) => boolean }[] = [
      {
        id: 'CAE-1',
        label: 'CAE-1',
        match: (t) => {
          const u = t.toUpperCase();
          return u.includes('CAE-1') || u.includes('CAE 1') || u === 'CAE1';
        },
      },
      {
        id: 'CAE-2',
        label: 'CAE-2',
        match: (t) => {
          const u = t.toUpperCase();
          return u.includes('CAE-2') || u.includes('CAE 2') || u === 'CAE2';
        },
      },
      {
        id: 'Unit Test',
        label: 'Unit Test',
        match: (t) => {
          const u = t.toUpperCase();
          return u.includes('UNIT') || u.startsWith('UT') || u.includes('UNITTEST');
        },
      },
      {
        id: 'ESE',
        label: 'ESE',
        match: (t) => {
          const u = t.toUpperCase();
          return u.includes('ESE') || u.includes('END SEM');
        },
      },
    ];

    for (const st of standardTypes) {
      const count = semesterExams.filter((e) => st.match(e.examType)).length;
      list.push({ id: st.id, label: st.label, count });
    }

    // Dynamic extra categories if custom non-standard exams exist
    const otherTypes = new Set<string>();
    semesterExams.forEach((e) => {
      const isKnown = standardTypes.some((st) => st.match(e.examType));
      if (!isKnown && e.examType && e.examType.trim()) {
        otherTypes.add(e.examType.trim());
      }
    });

    otherTypes.forEach((ot) => {
      const count = semesterExams.filter((e) => e.examType.toUpperCase() === ot.toUpperCase()).length;
      list.push({ id: ot, label: ot, count });
    });

    return list;
  }, [semesterExams]);

  // Filtered by selected category and search
  const filteredExams = useMemo(() => {
    let result = semesterExams;

    if (selectedCategory !== 'ALL') {
      if (selectedCategory === 'CAE-1') {
        result = result.filter((e) => {
          const u = e.examType.toUpperCase();
          return u.includes('CAE-1') || u.includes('CAE 1') || u === 'CAE1';
        });
      } else if (selectedCategory === 'CAE-2') {
        result = result.filter((e) => {
          const u = e.examType.toUpperCase();
          return u.includes('CAE-2') || u.includes('CAE 2') || u === 'CAE2';
        });
      } else if (selectedCategory === 'Unit Test') {
        result = result.filter((e) => {
          const u = e.examType.toUpperCase();
          return u.includes('UNIT') || u.startsWith('UT') || u.includes('UNITTEST');
        });
      } else if (selectedCategory === 'ESE') {
        result = result.filter((e) => {
          const u = e.examType.toUpperCase();
          return u.includes('ESE') || u.includes('END SEM');
        });
      } else {
        result = result.filter(
          (e) => e.examType.toUpperCase() === selectedCategory.toUpperCase()
        );
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (e) =>
          e.subjectName.toLowerCase().includes(q) ||
          e.subjectCode.toLowerCase().includes(q) ||
          e.examType.toLowerCase().includes(q) ||
          (e.venue && e.venue.toLowerCase().includes(q))
      );
    }

    return result;
  }, [semesterExams, selectedCategory, searchQuery]);

  // Separate upcoming and completed exams (Upcoming sorted ASC, Completed pushed down)
  const upcomingExams = useMemo(() => {
    return filteredExams
      .filter((e) => !e.isCompleted)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredExams]);

  const completedExams = useMemo(() => {
    return filteredExams
      .filter((e) => e.isCompleted)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [filteredExams]);



  // Relative days calculation
  const getRelativeDaysText = (isoDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [y, m, d] = isoDate.split('-').map(Number);
    const target = new Date(y, m - 1, d);
    target.setHours(0, 0, 0, 0);

    const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays > 1) return `In ${diffDays} days`;
    if (diffDays === -1) return 'Yesterday';
    return `${Math.abs(diffDays)} days ago`;
  };

  // Badge color helper for exam types
  const getExamTypeBadgeClass = (type: string) => {
    const t = type.toUpperCase();
    if (t.includes('CAE-1')) {
      return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
    }
    if (t.includes('CAE-2')) {
      return 'bg-purple-100 text-purple-700 dark:bg-purple-950/70 dark:text-[#D1A7FF] border-purple-200 dark:border-purple-800';
    }
    if (t.includes('UNIT') || t.startsWith('UT')) {
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
    }
    if (t.includes('ESE')) {
      return 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-[#F8D299] border-amber-200 dark:border-amber-800';
    }
    return 'bg-teal-100 text-teal-800 dark:bg-teal-950/70 dark:text-teal-300 border-teal-200 dark:border-teal-800';
  };

  return (
    <div className="min-h-screen bg-transparent text-slate-900 dark:text-slate-100 pb-20 transition-colors duration-200">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-[#000000]/95 backdrop-blur-md border-b border-slate-200 dark:border-[#222228] px-3 sm:px-6 py-2.5 sm:py-3 transition-colors duration-200">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
          {/* Left: Back + Title */}
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
                <CalendarDays className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#F8D299]" />
              </div>
              <h1 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-tight truncate">
                Exam Dates
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
        {/* Error Alert if sheet fetch fails */}
        {error && (
          <div className="mb-4 p-3.5 rounded-xl border border-rose-300 dark:border-rose-900 bg-rose-50/90 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="py-20 flex justify-center">
            <LoadingState message="Fetching examination timetable from Google Sheets..." />
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {/* Top Wireframe Box: "Select Sem" */}
            <SemesterSelector
              currentSemester={selectedSemester}
              availableSemesters={[1, 2, 3]}
              onSelectSemester={setSelectedSemester}
              badgeText={`${semesterExams.length} Total Exams`}
            />



            {/* Main Two-Column Structure (Matching Wireframe) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
              {/* Left Column / Sidebar: "Subjects / CAE-1 / CAE-2 / ESE" */}
              <div className="lg:col-span-4 xl:col-span-3 space-y-3">
                <div className="rounded-2xl border border-slate-200/90 dark:border-[#222228] bg-white/95 dark:bg-[#0A0A0E]/95 p-3.5 sm:p-4 shadow-card dark:shadow-card-dark backdrop-blur-md sticky top-16">
                  {/* Category Title from Wireframe */}
                  <div className="flex items-center justify-between mb-3 px-1">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-[#8048A8] dark:text-[#D1A7FF]" />
                      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Exam Categories
                      </h2>
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">
                      Sem {selectedSemester}
                    </span>
                  </div>

                  {/* Search box for subjects */}
                  <div className="relative mb-3">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search subject or code..."
                      className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-[#14141A] border border-slate-200 dark:border-[#252530] text-slate-900 dark:text-slate-100 placeholder-slate-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#8048A8]/40 focus:border-[#8048A8] focus:bg-white dark:focus:bg-[#181822]"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:scale-110 active:scale-90 transition-all duration-150"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Wireframe Vertical Filter List: CAE-1 / CAE-2 / ESE */}
                  <div className="flex lg:flex-col gap-1.5 overflow-x-auto no-scrollbar pb-1 lg:pb-0">
                    {categories.map((cat) => {
                      const isSelected = selectedCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setSelectedCategory(cat.id)}
                          className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 ease-out touch-manipulation text-left flex-shrink-0 lg:flex-shrink w-auto lg:w-full group active:scale-[0.98] ${
                            isSelected
                              ? 'bg-slate-900 text-white dark:bg-[#1E1E26] dark:text-white dark:ring-1 dark:ring-[#8048A8]/60 shadow-sm scale-[1.01]'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#16161E] hover:translate-x-1 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          <span className="font-semibold">{cat.label}</span>
                          <span
                            className={`ml-2 text-[10px] px-2 py-0.5 rounded-full font-bold transition-all duration-200 group-hover:scale-105 ${
                              isSelected
                                ? 'bg-white/20 text-white'
                                : 'bg-slate-200/70 dark:bg-[#20202A] text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {cat.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Summary counts badge */}
                  <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-[#222228] flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1">
                    <span>Upcoming: <strong className="text-slate-800 dark:text-slate-200">{upcomingExams.length}</strong></span>
                    <span>Completed: <strong className="text-slate-800 dark:text-slate-200">{completedExams.length}</strong></span>
                  </div>
                </div>
              </div>

              {/* Right Column / Main Content: "date - Name - Timings" */}
              <div className="lg:col-span-8 xl:col-span-9 space-y-4">
                {/* Active / Upcoming Exams List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                      <span>Scheduled & Upcoming Examinations</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-[#221B2E] text-[#8048A8] dark:text-[#D1A7FF] font-semibold">
                        {upcomingExams.length}
                      </span>
                    </h2>
                    <span className="text-[11px] text-slate-400">
                      Arranged by Date
                    </span>
                  </div>

                  {upcomingExams.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 dark:border-[#282834] bg-white/50 dark:bg-[#0B0B0F]/50 p-8 text-center">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-[#16161E] text-slate-400 flex items-center justify-center mx-auto mb-2">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        No upcoming exams found in this view
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        {searchQuery
                          ? `No matches for "${searchQuery}". Try clearing search.`
                          : 'All exams for this category may be completed or not scheduled yet.'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {upcomingExams.map((exam) => {
                        const relative = getRelativeDaysText(exam.date);
                        const isToday = exam.status === 'Today';

                        return (
                          <div
                            key={exam.id}
                            onClick={() => setSelectedExam(exam)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                setSelectedExam(exam);
                              }
                            }}
                            className={`rounded-2xl border p-3.5 sm:p-4.5 transition-all duration-300 ease-out cursor-pointer hover:-translate-y-1.5 hover:shadow-xl dark:hover:shadow-[0_16px_36px_-8px_rgba(128,72,168,0.28)] group select-none active:scale-[0.99] touch-manipulation card-sheen ${
                              isToday
                                ? 'bg-amber-50/70 dark:bg-[#1A160F] border-amber-300 dark:border-amber-700/60 ring-1 ring-amber-400/30'
                                : 'bg-white/95 dark:bg-[#0C0C10]/95 border-slate-200/90 dark:border-[#222228] hover:border-[#8048A8]/70 dark:hover:border-[#9D5DD4]/80'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              {/* Left & Middle: Date block + Subject Name + Details */}
                              <div className="flex items-start sm:items-center gap-3 min-w-0">
                                {/* Date Block */}
                                <div className="w-14 h-14 rounded-xl bg-slate-900 dark:bg-[#16161E] border border-slate-800 dark:border-[#2A2A38] text-white flex flex-col items-center justify-center flex-shrink-0 shadow-xs group-hover:scale-105 group-hover:rotate-[-1deg] group-hover:shadow-md transition-all duration-300 ease-out">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#F8D299] leading-tight group-hover:text-amber-300 transition-colors">
                                    {(() => {
                                      const parts = exam.date.split('-');
                                      if (parts.length >= 2) {
                                        const mIdx = parseInt(parts[1], 10) - 1;
                                        const mNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
                                        return mNames[mIdx] || 'EXAM';
                                      }
                                      return 'EXAM';
                                    })()}
                                  </span>
                                  <span className="text-lg font-black text-white leading-tight">
                                    {exam.date.split('-')[2] || '01'}
                                  </span>
                                  <span className="text-[9px] text-slate-400 leading-tight">
                                    {exam.dayOfWeek}
                                  </span>
                                </div>

                                {/* Subject Name & Badges (Matching "date - Name - Timings") */}
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <span
                                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border transition-transform duration-200 group-hover:scale-105 ${getExamTypeBadgeClass(
                                        exam.examType
                                      )}`}
                                    >
                                      {exam.examType}
                                    </span>
                                    <span className="flex items-center gap-1 text-xs font-bold text-slate-900 dark:text-slate-100">
                                      <span className={`w-2 h-2 rounded-full ${getSubjectTheme(exam.subjectCode).dotColor} group-hover:scale-125 transition-transform duration-200`} />
                                      <span>{exam.subjectCode}</span>
                                    </span>
                                    {isToday ? (
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white animate-pulse">
                                        TODAY
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-medium text-purple-700 dark:text-[#D1A7FF]">
                                        {relative}
                                      </span>
                                    )}
                                  </div>
                                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug break-words group-hover:text-[#8048A8] dark:group-hover:text-[#D1A7FF] group-hover:translate-x-0.5 transition-all duration-200">
                                    {exam.subjectName}
                                  </h3>
                                  {exam.venue && (
                                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                                      <MapPin className="w-3 h-3 text-[#8048A8] dark:text-[#D1A7FF] flex-shrink-0 group-hover:scale-110 transition-transform" />
                                      <span>{exam.venue}</span>
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Right: Timings */}
                              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2.5 sm:pt-0 border-slate-100 dark:border-[#1E1E28] flex-shrink-0 gap-1.5">
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-100/80 dark:bg-[#16161E] px-2.5 py-1.5 rounded-lg border border-slate-200/60 dark:border-[#262634] group-hover:border-[#8048A8]/40 group-hover:bg-purple-50/50 dark:group-hover:bg-[#1C1726] transition-all duration-200">
                                  <Clock className="w-3.5 h-3.5 text-[#8048A8] dark:text-[#D1A7FF] group-hover:rotate-12 transition-transform duration-300" />
                                  <span>{exam.timings}</span>
                                </div>
                                <span className="text-[10px] text-[#8048A8] dark:text-[#D1A7FF] font-semibold opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200 hidden sm:inline-block">
                                  View details &rarr;
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Bottom Wireframe Box: "Completed" (arrange them by dated and completed exams get down) */}
                {completedExams.length > 0 && (
                  <div className="mt-6 pt-3 border-t border-slate-200/80 dark:border-[#222228]">
                    <div className="rounded-2xl border border-slate-200/90 dark:border-[#202028] bg-slate-50/70 dark:bg-[#0A0A0D]/70 overflow-hidden shadow-xs">
                      {/* Section Accordion / Header */}
                      <button
                        type="button"
                        onClick={() => setIsCompletedExpanded(!isCompletedExpanded)}
                        className="w-full flex items-center justify-between p-3.5 sm:p-4 text-left hover:bg-slate-100/80 dark:hover:bg-[#121218] transition-colors duration-200 active:scale-[0.99] select-none"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 shadow-xs">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                              Completed Examinations
                            </h3>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              {completedExams.length} exam{completedExams.length > 1 ? 's' : ''} concluded • Click to inspect details
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-[#1E1E28] text-slate-600 dark:text-slate-400">
                            Archived
                          </span>
                          <div className={`transition-transform duration-300 ease-out ${isCompletedExpanded ? 'rotate-180' : 'rotate-0'}`}>
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          </div>
                        </div>
                      </button>

                      {/* Completed List (Dimmed, sorted by date) */}
                      {isCompletedExpanded && (
                        <div className="p-3 sm:p-4 pt-0 space-y-2 animate-accordion-expand">
                          {completedExams.map((exam) => (
                            <div
                              key={exam.id}
                              onClick={() => setSelectedExam(exam)}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  setSelectedExam(exam);
                                }
                              }}
                              className="rounded-xl border border-slate-200/80 dark:border-[#1E1E26] bg-white/70 dark:bg-[#101016]/70 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 opacity-80 hover:opacity-100 hover:border-[#8048A8]/60 dark:hover:border-[#9D5DD4]/70 hover:-translate-y-0.5 hover:shadow-sm cursor-pointer transition-all duration-200 ease-out active:scale-[0.99] touch-manipulation group card-sheen"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-[#181820] text-slate-500 dark:text-slate-400 flex flex-col items-center justify-center flex-shrink-0 text-center font-bold text-xs group-hover:scale-105 group-hover:text-slate-900 dark:group-hover:text-white transition-all duration-200">
                                  <span>{exam.date.split('-')[2] || '01'}</span>
                                  <span className="text-[9px] uppercase font-medium">
                                    {(() => {
                                      const parts = exam.date.split('-');
                                      if (parts.length >= 2) {
                                        const mIdx = parseInt(parts[1], 10) - 1;
                                        const mNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                                        return mNames[mIdx] || 'Exam';
                                      }
                                      return 'Exam';
                                    })()}
                                  </span>
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#1A1A22] text-slate-600 dark:text-slate-400 group-hover:border-[#8048A8]/30 transition-colors">
                                      {exam.examType}
                                    </span>
                                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-[#8048A8] dark:group-hover:text-[#D1A7FF] transition-colors">
                                      {exam.subjectName}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                    {exam.subjectCode} • {exam.formattedDate} • {exam.timings}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 self-end sm:self-center">
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-900/60 shadow-xs">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Completed
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Exam Details Modal Card */}
      {selectedExam && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-md animate-backdrop-in"
          onClick={() => setSelectedExam(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-lg bg-white dark:bg-[#0C0C12] border border-slate-200/90 dark:border-[#262634] rounded-3xl shadow-2xl p-5 sm:p-7 relative overflow-hidden transition-all max-h-[92vh] flex flex-col animate-modal-in card-sheen"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Gradient Accent Bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-[#8048A8] to-[#F8D299]" />

            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 pb-3.5 border-b border-slate-100 dark:border-[#1E1E28]">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span
                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md border transition-transform duration-200 hover:scale-105 ${getExamTypeBadgeClass(
                      selectedExam.examType
                    )}`}
                  >
                    {selectedExam.examType}
                  </span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-[#181822] px-2 py-0.5 rounded-md border border-slate-200/70 dark:border-[#262632]">
                    {selectedExam.subjectCode}
                  </span>
                  {selectedExam.isCompleted ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-900/60">
                      <CheckCircle2 className="w-3 h-3" />
                      Completed
                    </span>
                  ) : selectedExam.status === 'Today' ? (
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500 text-white animate-pulse">
                      TODAY
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-purple-700 dark:text-[#D1A7FF] bg-purple-50 dark:bg-[#1F172C] px-2 py-0.5 rounded-md">
                      {getRelativeDaysText(selectedExam.date)}
                    </span>
                  )}
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-snug break-words">
                  {selectedExam.subjectName}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Semester {selectedExam.semester} Examination Schedule
                </p>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setSelectedExam(null)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-[#181822] hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-950/60 dark:hover:text-rose-300 text-slate-500 hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center flex-shrink-0"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-0.5">
              {/* 4 Quick Stat Cards */}
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                {/* Date */}
                <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-50/80 dark:bg-[#14141C] border border-slate-200/70 dark:border-[#22222E] hover:border-[#8048A8]/40 hover:-translate-y-0.5 hover:shadow-xs transition-all duration-200 group">
                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px] font-medium mb-1">
                    <Calendar className="w-3.5 h-3.5 text-[#8048A8] dark:text-[#D1A7FF] group-hover:scale-110 transition-transform" />
                    <span>Exam Date</span>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    {selectedExam.formattedDate}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {selectedExam.dayOfWeek} • {getRelativeDaysText(selectedExam.date)}
                  </p>
                </div>

                {/* Timings */}
                <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-50/80 dark:bg-[#14141C] border border-slate-200/70 dark:border-[#22222E] hover:border-[#8048A8]/40 hover:-translate-y-0.5 hover:shadow-xs transition-all duration-200 group">
                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px] font-medium mb-1">
                    <Clock className="w-3.5 h-3.5 text-[#8048A8] dark:text-[#D1A7FF] group-hover:rotate-12 transition-transform" />
                    <span>Exam Timings</span>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    {selectedExam.timings}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {selectedExam.shift || 'Regular Session'}
                  </p>
                </div>

                {/* Venue */}
                <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-50/80 dark:bg-[#14141C] border border-slate-200/70 dark:border-[#22222E] hover:border-[#8048A8]/40 hover:-translate-y-0.5 hover:shadow-xs transition-all duration-200 group">
                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px] font-medium mb-1">
                    <MapPin className="w-3.5 h-3.5 text-amber-500 group-hover:scale-110 transition-transform" />
                    <span>Venue / Room</span>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                    {selectedExam.venue || 'To Be Announced'}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Assigned Hall
                  </p>
                </div>

                {/* Examination Type */}
                <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-50/80 dark:bg-[#14141C] border border-slate-200/70 dark:border-[#22222E] hover:border-[#8048A8]/40 hover:-translate-y-0.5 hover:shadow-xs transition-all duration-200 group">
                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px] font-medium mb-1">
                    <BookOpen className="w-3.5 h-3.5 text-emerald-500 group-hover:scale-110 transition-transform" />
                    <span>Exam Type</span>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                    {selectedExam.examType === 'ESE'
                      ? 'End Semester Exam'
                      : selectedExam.examType.startsWith('CAE')
                      ? 'Continuous Assessment'
                      : selectedExam.examType === 'Unit Test'
                      ? 'Unit Test Assessment'
                      : selectedExam.examType}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Semester {selectedExam.semester}
                  </p>
                </div>
              </div>

              {selectedExam.notes && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#14141C] border border-slate-200/70 dark:border-[#22222E] text-xs text-slate-600 dark:text-slate-300">
                  <span className="font-semibold text-slate-900 dark:text-white">Note: </span>
                  {selectedExam.notes}
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="pt-3 border-t border-slate-100 dark:border-[#1E1E28] flex items-center justify-between gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyExamDetails}
                leftIcon={copiedDetails ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                className="text-xs px-3.5 py-1.5 rounded-xl border-slate-200 dark:border-[#282834] hover:scale-[1.02] active:scale-95 transition-all duration-200"
              >
                <span>{copiedDetails ? 'Details Copied!' : 'Copy Schedule'}</span>
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={() => setSelectedExam(null)}
                className="text-xs px-4 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-black font-semibold shadow-sm hover:scale-[1.02] active:scale-95 transition-all duration-200"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamDatesPage;
