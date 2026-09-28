import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  FileText,
  ExternalLink,
  Search,
  X
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { marksService, GlobalCourseSearchResult } from '../../services/marks';
import { StudentSemesterMarks } from '../../types/marks';
import { SemesterSelector } from '../../components/marks/SemesterSelector';
import { MarksSummary } from '../../components/marks/MarksSummary';
import { MarksTable } from '../../components/marks/MarksTable';
import { StatementModal } from '../../components/marks/DownloadMarks';
import { ThemeToggle } from '../../components/common/ThemeToggle';
import { Button } from '../../components/ui/Button';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';
import { ROUTES } from '../../utils/constants';

export const MarksPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // By default open the current semester (e.g. Sem 3), or ?sem= URL parameter if provided
  const currentSem = user?.current_semester || 3;
  const paramSem = parseInt(new URLSearchParams(location.search).get('sem') || '', 10);
  const initialSem = !isNaN(paramSem) && paramSem > 0 ? paramSem : currentSem;

  const [selectedSemester, setSelectedSemester] = useState<number>(initialSem);
  const selectedUsn = user?.usn || 'CS25131';
  const [availableSemesters, setAvailableSemesters] = useState<number[]>([1, 2, 3]);
  const [marks, setMarks] = useState<StudentSemesterMarks | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Sync selected semester when location.search (?sem=X) changes
  useEffect(() => {
    const s = parseInt(new URLSearchParams(location.search).get('sem') || '', 10);
    if (!isNaN(s) && s > 0 && s !== selectedSemester) {
      setSelectedSemester(s);
    }
  }, [location.search]);

  // When user profile loads with their current_semester, if no explicit ?sem= query param was given, default to user's current semester
  useEffect(() => {
    const hasSemParam = new URLSearchParams(location.search).has('sem');
    if (!hasSemParam && user?.current_semester && selectedSemester !== user.current_semester) {
      setSelectedSemester(user.current_semester);
    }
  }, [user?.current_semester, location.search]);

  // Dynamically detect which semesters have marks available for this student
  useEffect(() => {
    let isCancelled = false;
    const fetchAvailable = async () => {
      if (!selectedUsn) return;
      const sems = await marksService.getAvailableSemestersForStudent(selectedUsn);
      if (!isCancelled && sems && sems.length > 0) {
        setAvailableSemesters(sems);
        if (!sems.includes(selectedSemester)) {
          if (sems.includes(currentSem)) {
            setSelectedSemester(currentSem);
          } else {
            setSelectedSemester(sems[sems.length - 1]);
          }
        }
      }
    };
    fetchAvailable();
    return () => {
      isCancelled = true;
    };
  }, [selectedUsn, currentSem]);

  // Global search across all semesters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [activeSubjectCode, setActiveSubjectCode] = useState<string | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Statement modal visibility
  const [isStatementOpen, setIsStatementOpen] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<GlobalCourseSearchResult[]>([]);

  useEffect(() => {
    loadMarks(selectedUsn, selectedSemester);
  }, [selectedUsn, selectedSemester]);

  // Global search across all connected semester sheets
  useEffect(() => {
    let isCancelled = false;
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    marksService.searchAllSemesters(selectedUsn, searchQuery).then((res) => {
      if (!isCancelled) {
        setSearchResults(res);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [selectedUsn, searchQuery]);

  // Handle outside clicks to close search dropdown
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

  // Listen for bottom-nav statement trigger or URL ?statement=true
  useEffect(() => {
    const handleOpenStatement = () => setIsStatementOpen(true);
    window.addEventListener('portal:open-statement', handleOpenStatement);

    const params = new URLSearchParams(window.location.search);
    if (params.get('statement') === 'true') {
      setIsStatementOpen(true);
    }

    return () => {
      window.removeEventListener('portal:open-statement', handleOpenStatement);
    };
  }, []);

  const loadMarks = async (usn: string, sem: number) => {
    setIsLoading(true);
    setIsFadingOut(false);
    setError(null);
    try {
      const [res] = await Promise.all([
        marksService.getStudentMarks(usn, sem),
        new Promise((resolve) => setTimeout(resolve, 350)),
      ]);
      if (res.success && res.data) {
        setMarks(res.data);
      } else {
        setMarks(null);
        setError(res.error || `No marks found for USN: ${usn} in Semester ${sem}.`);
      }
    } catch {
      setMarks(null);
      setError(`Unable to load semester ${sem} marks from Google Sheets.`);
    } finally {
      setIsFadingOut(true);
      setTimeout(() => {
        setIsLoading(false);
        setIsFadingOut(false);
      }, 180);
    }
  };

  const handleSelectCourse = (course: GlobalCourseSearchResult) => {
    if (course.semester !== selectedSemester) {
      setSelectedSemester(course.semester);
      navigate(`${ROUTES.MARKS}?sem=${course.semester}`, { replace: true });
    }
    setActiveSubjectCode(course.code);
    setIsSearchOpen(false);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setIsSearchOpen(false);
    setActiveSubjectCode(null);
  };

  return (
    <div className="min-h-screen bg-transparent text-slate-900 dark:text-slate-100 transition-colors duration-200">
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
                <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <h1 className="hidden lg:block text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-tight truncate">
                Semester Marks
              </h1>
            </div>
          </div>

          {/* Center: Global Search Bar Across All Semesters */}
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
                    handleSelectCourse(searchResults[0]);
                  }
                }}
                placeholder="Search code or subject..."
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

            {/* Floating Search Dropdown */}
            {isSearchOpen && searchQuery.trim() && (
              <div className="absolute top-full left-0 right-0 mt-2 z-50 rounded-2xl bg-white/95 dark:bg-[#0E0E14]/95 backdrop-blur-xl border border-slate-200 dark:border-[#262630] shadow-2xl overflow-hidden max-h-96 overflow-y-auto animate-fade-in divide-y divide-slate-100 dark:divide-[#1C1C24]">
                <div className="px-3 py-2 bg-slate-50/80 dark:bg-[#121218] flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="font-semibold">
                    {searchResults.length > 0
                      ? `${searchResults.length} subject${searchResults.length > 1 ? 's' : ''} found`
                      : 'No matches'}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-zinc-500">All Semesters</span>
                </div>

                {searchResults.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500 dark:text-zinc-400">
                    No subjects found matching "{searchQuery}" across connected semesters.
                  </div>
                ) : (
                  searchResults.map((course) => (
                    <div
                      key={`${course.semester}-${course.code}`}
                      onClick={() => handleSelectCourse(course)}
                      className="p-3 hover:bg-purple-50/70 dark:hover:bg-[#1A1624] cursor-pointer transition-colors flex items-center justify-between gap-3 group"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                              course.semester === 1
                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40'
                                : course.semester === 2
                                ? 'bg-sky-100 text-sky-700 dark:bg-sky-950/80 dark:text-sky-300 border border-sky-200 dark:border-sky-800/40'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40'
                            }`}
                          >
                            Sem {course.semester}
                          </span>
                          <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-[#8048A8] dark:group-hover:text-[#D1A7FF] transition-colors">
                            {course.code}
                          </span>
                          {course.semester === 3 && ['WFBFD', 'WFBFDL', 'DEFM', 'DEFML', 'BE', 'BA'].includes(course.code) && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40">
                              MDM
                            </span>
                          )}
                          {course.semester === 3 && ['DCD', 'EST', 'EDP', 'SPS'].includes(course.code) && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-700 dark:bg-cyan-950/80 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/40">
                              OE
                            </span>
                          )}
                          {course.semester === 3 && course.code === 'NPTEL' && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                              NPTEL
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 dark:text-zinc-500">
                            ({course.type})
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium truncate mt-0.5">
                          {course.name}
                        </p>
                      </div>

                      <div className="flex-shrink-0 text-right">
                        {course.isCompleted ? (
                          <div className="flex flex-col items-end">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              {course.total} <span className="text-[10px] text-slate-400">/ {course.maxTotal}</span>
                            </span>
                            <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
                              Grade {course.grade}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700">
                            Sem {course.semester}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Right: Statement Action & Theme Toggle */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {marks && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  window.open(`${ROUTES.STATEMENT}?usn=${encodeURIComponent(selectedUsn)}&sem=${selectedSemester}`, '_blank', 'noopener,noreferrer');
                }}
                leftIcon={<FileText className="w-3.5 h-3.5 text-[#8048A8] dark:text-[#D1A7FF]" />}
                rightIcon={<ExternalLink className="w-3 h-3 opacity-70" />}
                className="flex-shrink-0 px-2.5 sm:px-3 py-1.5 text-xs touch-manipulation min-h-[36px]"
                title="Open Official Grade Statement in New Tab to Download / Print PDF"
              >
                <span className="hidden sm:inline">Statement</span>
                <span className="sm:hidden">PDF</span>
              </Button>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-3 sm:px-8 py-4 sm:py-8 pb-24 sm:pb-8 space-y-4 sm:space-y-6">
        {/* Semester Selection Controls */}
        <SemesterSelector
          currentSemester={selectedSemester}
          availableSemesters={availableSemesters}
          onSelectSemester={(sem) => {
            setSelectedSemester(sem);
            setActiveSubjectCode(null);
            navigate(`${ROUTES.MARKS}?sem=${sem}`, { replace: true });
          }}
        />

        {/* Loading State with smooth exit transition */}
        {isLoading && (
          <div
            className={`bg-white/80 dark:bg-[#0E0E14]/80 backdrop-blur-xl rounded-3xl border border-slate-200 dark:border-[#1F1F28] p-12 text-center shadow-lg ${
              isFadingOut ? 'animate-fade-out' : 'animate-fade-in'
            }`}
          >
            <LoadingState message="Fetching live semester marks from server..." />
          </div>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <div className="p-8 rounded-2xl bg-white/90 dark:bg-[#0A0A0E] border border-slate-200 dark:border-[#222228] animate-fade-in">
            <ErrorState
              title="Unable to load marks"
              message={error}
              onRetry={() => loadMarks(selectedUsn, selectedSemester)}
            />
          </div>
        )}

        {/* Marks Content View with Smooth Staggered Card Entrance */}
        {!isLoading && marks && (
          <div className="space-y-6">
            {/* Summary Banner with direct View Statement link */}
            <div className="animate-card-slide-1">
              <MarksSummary
                summary={marks.summary}
                studentName={marks.name}
                usn={marks.usn}
                semester={selectedSemester}
              />
            </div>

            {/* Detailed Subjects & Assessments Breakdown */}
            <div className="space-y-3 animate-card-slide-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Course Assessments & Grades
                  </h3>
                </div>
              </div>

              <MarksTable
                subjects={marks.subjects}
                searchQuery={searchQuery}
                onClearSearch={handleClearSearch}
                activeSubjectCode={activeSubjectCode}
              />
            </div>

            {/* Official Grade Statement Modal */}
            <StatementModal
              isOpen={isStatementOpen}
              onClose={() => setIsStatementOpen(false)}
              marks={marks}
            />
          </div>
        )}
      </main>
    </div>
  );
};
