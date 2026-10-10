import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
  MapPin,
  User as UserIcon,
  ArrowLeft,
  Calendar,
  X,
  ChevronLeft,
  ChevronRight,
  Radio,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import {
  timetableService,
  DAYS_OF_WEEK,
  isToday,
  isLectureLiveNow,
} from '../../services/timetable';
import { DayName, DaySchedule, LectureItem } from '../../types/timetable';
import { ThemeToggle } from '../../components/common/ThemeToggle';
import { Button } from '../../components/ui/Button';
import { LoadingState } from '../../components/common/LoadingState';
import { SemesterSelector } from '../../components/marks/SemesterSelector';
import { ROUTES } from '../../utils/constants';

export const TimetablePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Selected Semester (defaults to student's current semester or 3)
  const [selectedSemester, setSelectedSemester] = useState<number>(() => {
    return user?.current_semester || 3;
  });

  // State
  const [scheduleData, setScheduleData] = useState<DaySchedule[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Active modal day (opens the wireframe overlay card when a day is clicked on desktop)
  const [activeModalDay, setActiveModalDay] = useState<DayName | null>(null);

  // Mobile: Active expanded day (shows only days initially, click day to expand its lectures)
  const [expandedMobileDay, setExpandedMobileDay] = useState<DayName | null>(null);

  // Fetch timetable on semester change
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await timetableService.fetchTimetable(selectedSemester);
        if (isMounted) {
          if (res.success && res.data) {
            setScheduleData(res.data);
          } else {
            setError(res.error || 'Failed to load timetable.');
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || 'Error communicating with timetable service.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [selectedSemester]);

  // Handle ESC key to dismiss modal card
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveModalDay(null);
      }
    };
    if (activeModalDay) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeModalDay]);

  // Active day schedule for the opened modal card
  const selectedDaySchedule = useMemo(() => {
    if (!activeModalDay) return null;
    return scheduleData.find((d) => d.day === activeModalDay) || null;
  }, [scheduleData, activeModalDay]);

  // Navigate next/previous day inside the modal card
  const handleNavigateDay = (direction: 'prev' | 'next') => {
    if (!activeModalDay) return;
    const currentIndex = DAYS_OF_WEEK.findIndex((d) => d.full === activeModalDay);
    if (currentIndex === -1) return;

    if (direction === 'prev') {
      const prevIdx = (currentIndex - 1 + DAYS_OF_WEEK.length) % DAYS_OF_WEEK.length;
      setActiveModalDay(DAYS_OF_WEEK[prevIdx].full);
    } else {
      const nextIdx = (currentIndex + 1) % DAYS_OF_WEEK.length;
      setActiveModalDay(DAYS_OF_WEEK[nextIdx].full);
    }
  };

  // Badge styling for lecture types (Theory / Lab / Tutorial)
  const getLectureBadgeStyle = (_type?: LectureItem['type']) => {
    return 'bg-slate-100 dark:bg-[#1E1E28] text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-zinc-800';
  };

  return (
    <div className="min-h-screen bg-transparent text-slate-900 dark:text-slate-100 pb-20 transition-colors duration-200">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-[#000000]/95 backdrop-blur-md border-b border-slate-200 dark:border-[#222228] px-3 sm:px-6 py-2.5 sm:py-3 transition-colors duration-200">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
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
                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#F8D299]" />
              </div>
              <h1 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-tight truncate">
                Weekly Timetable
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Top: Semester Selection Card (Same standalone card layout as Marks, Attendance, Exam Dates) */}
        <SemesterSelector
          currentSemester={selectedSemester}
          availableSemesters={[1, 2, 3]}
          onSelectSemester={setSelectedSemester}
          badgeText="Weekly Schedule"
        />

        {/* Loading State */}
        {isLoading && (
          <div className="py-20 flex justify-center">
            <LoadingState message={`Loading Semester ${selectedSemester} Timetable...`} />
          </div>
        )}

        {/* Error Alert */}
        {!isLoading && error && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs">
            {error}
          </div>
        )}

        {/* Mobile View: Shows only days initially; click on a day to expand its lectures */}
        {!isLoading && !error && (
          <div className="block sm:hidden space-y-2.5">
            {DAYS_OF_WEEK.map((dayObj) => {
              const dayData = scheduleData.find((d) => d.day === dayObj.full);
              const lectures = dayData?.lectures || [];
              const isCurrentDay = isToday(dayObj.full);
              const isExpanded = expandedMobileDay === dayObj.full;
              const hasLiveLecture = isCurrentDay && lectures.some((lec) => isLectureLiveNow(lec.timings));

              return (
                <div
                  key={dayObj.full}
                  className={`rounded-2xl border transition-all duration-300 ease-out overflow-hidden backdrop-blur-md group ${
                    isCurrentDay
                      ? 'bg-purple-50/40 dark:bg-[#181324]/80 border-[#8048A8] dark:border-[#9D5DD4] ring-1 ring-[#8048A8]/30 shadow-sm'
                      : 'bg-white/95 dark:bg-[#0A0A0E]/95 border-slate-200/90 dark:border-[#222228] hover:border-[#8048A8]/50 shadow-xs'
                  }`}
                >
                  {/* Clickable Day Header */}
                  <button
                    type="button"
                    onClick={() => setExpandedMobileDay(isExpanded ? null : dayObj.full)}
                    className="w-full p-3.5 flex items-center justify-between text-left gap-3 select-none touch-manipulation focus:outline-hidden transition-colors duration-200 hover:bg-slate-50/70 dark:hover:bg-[#13131A] active:scale-[0.99]"
                    aria-expanded={isExpanded}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Day Short Pill */}
                      <div
                        className={`w-9 h-9 rounded-xl flex flex-col items-center justify-center font-black text-xs flex-shrink-0 border transition-all duration-200 group-hover:scale-105 ${
                          isCurrentDay
                            ? 'bg-[#8048A8] text-white border-[#8048A8] shadow-xs'
                            : 'bg-slate-100 dark:bg-[#16161F] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#252532] group-hover:border-[#8048A8]/40'
                        }`}
                      >
                        <span className="text-[10px] uppercase font-bold tracking-tight">
                          {dayObj.short}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-black text-slate-900 dark:text-white group-hover:text-[#8048A8] dark:group-hover:text-[#D1A7FF] transition-colors">
                            {dayObj.full}
                          </span>
                          {isCurrentDay && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded-full bg-emerald-500 text-white shadow-xs animate-pulse">
                              <span className="w-1 h-1 rounded-full bg-white" />
                              TODAY
                            </span>
                          )}
                          {hasLiveLecture && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded-full bg-amber-500 text-white shadow-xs animate-pulse">
                              <Radio className="w-2.5 h-2.5" />
                              LIVE
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                          <span>
                            {lectures.length === 0
                              ? 'No lectures'
                              : `${lectures.length} lecture${lectures.length === 1 ? '' : 's'}`}
                          </span>
                          {lectures.length > 0 && (
                            <>
                              <span>•</span>
                              <span className="font-mono text-[10px]">
                                {lectures[0].timings.split('-')[0].trim()} – {lectures[lectures.length - 1].timings.split('-')[1]?.trim() || ''}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[11px] font-bold text-[#8048A8] dark:text-[#D1A7FF]">
                        {isExpanded ? 'Hide' : 'View'}
                      </span>
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-300 ease-out ${
                          isExpanded
                            ? 'rotate-180 bg-purple-100 dark:bg-purple-950/60 text-[#8048A8] dark:text-[#D1A7FF] scale-105'
                            : 'bg-slate-100 dark:bg-[#16161F] text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    </div>
                  </button>

                  {/* Expanded Lecture List */}
                  {isExpanded && (
                    <div className="px-3.5 pb-3.5 pt-1 border-t border-slate-100 dark:border-[#1E1E28] space-y-2.5 animate-accordion-expand">
                      {lectures.length === 0 ? (
                        <div className="py-6 text-center text-slate-400 dark:text-zinc-600 flex flex-col items-center justify-center">
                          <Clock className="w-6 h-6 stroke-1 text-slate-300 dark:text-zinc-700 mb-1.5" />
                          <p className="text-xs font-semibold text-slate-500 dark:text-zinc-500">No Lectures Scheduled</p>
                          <p className="text-[10px] text-slate-400 dark:text-zinc-600">No classes scheduled for this day</p>
                        </div>
                      ) : (
                        lectures.map((lec) => {
                          const isLive = isCurrentDay && isLectureLiveNow(lec.timings);

                          return (
                            <div
                              key={lec.id}
                              className={`p-3 rounded-xl border text-left transition-all duration-200 ease-out hover:scale-[1.01] active:scale-[0.99] ${
                                isLive
                                  ? 'bg-amber-500/10 dark:bg-amber-500/15 border-amber-400/50 ring-1 ring-amber-400/30 shadow-xs'
                                  : 'bg-slate-50/70 dark:bg-[#14141A] border-slate-200/80 dark:border-[#22222E] hover:border-[#8048A8]/40 dark:hover:border-[#8048A8]/50 shadow-xs'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1 text-[10px] font-semibold mb-1.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold border bg-white dark:bg-[#1C1C24] text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-zinc-800">
                                    {lec.periodLabel}
                                  </span>
                                  <span
                                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${getLectureBadgeStyle(
                                      lec.type
                                    )}`}
                                  >
                                    {lec.type}
                                  </span>
                                </div>

                                {isLive ? (
                                  <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-0.5 animate-pulse">
                                    <Radio className="w-2.5 h-2.5" /> LIVE NOW
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-slate-400" />
                                    {lec.timings}
                                  </span>
                                )}
                              </div>

                              <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                                {lec.subjectCode}
                              </h4>
                              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-medium leading-relaxed">
                                {lec.subjectName}
                              </p>

                              <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-[#1E1E28] flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 gap-2">
                                <div className="flex items-center gap-1 truncate font-semibold text-slate-700 dark:text-slate-300">
                                  <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                  <span className="truncate">{lec.room}</span>
                                </div>
                                {lec.faculty && (
                                  <div className="flex items-center gap-1 truncate text-slate-500 dark:text-slate-400">
                                    <UserIcon className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                    <span className="truncate">{lec.faculty}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Desktop View: 6 Weekly Day Cards / Columns (Matching Wireframe 1: Monday, Tue, Wed, Thur, Fri, Sat) */}
        {!isLoading && !error && (
          <div className="hidden sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4">
            {DAYS_OF_WEEK.map((dayObj) => {
              const dayData = scheduleData.find((d) => d.day === dayObj.full);
              const lectures = dayData?.lectures || [];
              const isCurrentDay = isToday(dayObj.full);

              return (
                <div
                  key={dayObj.full}
                  onClick={() => setActiveModalDay(dayObj.full)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setActiveModalDay(dayObj.full);
                    }
                  }}
                  className={`relative flex flex-col justify-between rounded-2xl border p-4 transition-all duration-300 ease-out cursor-pointer min-h-[380px] select-none group touch-manipulation active:scale-[0.985] backdrop-blur-md card-sheen ${
                    isCurrentDay
                      ? 'bg-purple-50/40 dark:bg-[#181324]/80 border-[#8048A8] dark:border-[#9D5DD4] ring-2 ring-[#8048A8]/20 dark:ring-[#8048A8]/30 shadow-card dark:shadow-[0_12px_32px_-6px_rgba(128,72,168,0.35)] -translate-y-1 hover:-translate-y-2 hover:shadow-xl'
                      : 'bg-white/95 dark:bg-[#0A0A0E]/95 border-slate-200/90 dark:border-[#222228] hover:border-[#8048A8]/70 dark:hover:border-[#9D5DD4]/80 hover:-translate-y-1.5 hover:shadow-xl dark:hover:shadow-[0_14px_34px_-8px_rgba(128,72,168,0.28)] shadow-card dark:shadow-card-dark'
                  }`}
                >
                  {/* Top Day Header */}
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 group-hover:text-[#8048A8] dark:group-hover:text-[#D1A7FF] transition-colors duration-200">
                        {dayObj.short}
                      </span>
                      {isCurrentDay && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-500 text-white shadow-xs animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-white" />
                          TODAY
                        </span>
                      )}
                    </div>

                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight group-hover:text-[#8048A8] dark:group-hover:text-[#D1A7FF] group-hover:translate-x-0.5 transition-all duration-200">
                      {dayObj.full}
                    </h3>

                    <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      <span>{lectures.length} Lectures</span>
                    </div>

                    <div className="my-3 border-t border-slate-200/80 dark:border-[#20202C]" />

                    {/* Lecture Snippets Preview */}
                    <div className="space-y-2">
                      {lectures.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 dark:text-zinc-600 flex flex-col items-center justify-center">
                          <Clock className="w-6 h-6 stroke-1 text-slate-300 dark:text-zinc-700 mb-1.5" />
                          <p className="text-xs font-semibold text-slate-500 dark:text-zinc-500">No Lectures</p>
                          <p className="text-[10px] text-slate-400 dark:text-zinc-600">No classes scheduled</p>
                        </div>
                      ) : (
                        lectures.map((lec) => {
                          const isLive = isCurrentDay && isLectureLiveNow(lec.timings);

                          return (
                            <div
                              key={lec.id}
                              className={`p-2.5 rounded-xl border text-left transition-all duration-200 ease-out hover:scale-[1.02] active:scale-[0.99] ${
                                isLive
                                  ? 'bg-amber-500/10 dark:bg-amber-500/15 border-amber-400/50 ring-1 ring-amber-400/30 shadow-xs'
                                  : 'bg-slate-50/70 dark:bg-[#14141A] border-slate-200/80 dark:border-[#22222E] hover:border-[#8048A8]/40 dark:hover:border-[#8048A8]/50 hover:bg-white dark:hover:bg-[#181824] hover:shadow-xs'
                              }`}
                            >
                              <div className="flex items-center justify-between text-[10px] font-semibold mb-1">
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold border bg-white dark:bg-[#1C1C24] text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-zinc-800">
                                  {lec.periodLabel}
                                </span>
                                {isLive ? (
                                  <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-0.5 animate-pulse">
                                    <Radio className="w-2.5 h-2.5" /> LIVE
                                  </span>
                                ) : (
                                  <span className="text-[9px] text-slate-500 dark:text-slate-400 font-mono">
                                    {lec.timings.split('-')[0].trim()}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs font-bold truncate tracking-tight text-slate-900 dark:text-white">
                                {lec.subjectCode}
                              </p>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5 font-medium">
                                {lec.room}
                              </p>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Bottom Action Prompt */}
                  <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-[#202028] text-center">
                    <span className="text-[11px] font-bold text-[#8048A8] dark:text-[#D1A7FF] flex items-center justify-center gap-1 group-hover:gap-2 transition-all duration-300">
                      <span>Open Card</span>
                      <span className="group-hover:translate-x-1 transition-transform duration-300">&rarr;</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Wireframe 2 Modal Card: "on clicking a day it will open a card" (Large overlay card showing lec 1, lec 2, lec 3, lec 4) */}
      {selectedDaySchedule && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 dark:bg-black/80 backdrop-blur-md animate-backdrop-in"
          onClick={() => setActiveModalDay(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-5xl rounded-3xl border border-slate-200 dark:border-[#262634] bg-white/95 dark:bg-[#101016]/95 backdrop-blur-xl shadow-2xl p-4 sm:p-7 text-slate-900 dark:text-slate-100 max-h-[90vh] overflow-y-auto animate-modal-in card-sheen"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Card Header */}
            <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 dark:border-[#20202C] pb-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-[#1A1626] border border-purple-200/60 dark:border-purple-800/40 text-[#8048A8] dark:text-[#D1A7FF] flex items-center justify-center font-bold">
                  <Calendar className="w-5 h-5 text-[#8048A8] dark:text-[#D1A7FF]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                      {selectedDaySchedule.day}
                    </h2>
                    {isToday(selectedDaySchedule.day) && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500 text-white animate-pulse">
                        TODAY
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Semester {selectedSemester} • {selectedDaySchedule.lectures.length} Lectures Scheduled
                  </p>
                </div>
              </div>

              {/* Day Navigators & Close */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleNavigateDay('prev')}
                  title="Previous Day"
                  className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-[#1A1A24] hover:bg-slate-200 dark:hover:bg-[#242432] text-slate-700 dark:text-slate-300 flex items-center justify-center transition-all duration-200 hover:-translate-x-0.5 active:scale-90"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleNavigateDay('next')}
                  title="Next Day"
                  className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-[#1A1A24] hover:bg-slate-200 dark:hover:bg-[#242432] text-slate-700 dark:text-slate-300 flex items-center justify-center transition-all duration-200 hover:translate-x-0.5 active:scale-90"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModalDay(null)}
                  title="Close"
                  className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-[#1A1A24] hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-950/60 dark:hover:text-rose-300 text-slate-700 dark:text-slate-300 flex items-center justify-center transition-all duration-200 hover:rotate-90 active:scale-90 ml-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Wireframe 2 Grid: 4 Cards or Empty State */}
            {selectedDaySchedule.lectures.length === 0 ? (
              <div className="py-16 text-center text-slate-500 dark:text-slate-400">
                <Clock className="w-10 h-10 mx-auto text-slate-300 dark:text-zinc-700 mb-2 stroke-1" />
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  No Lectures Scheduled for {selectedDaySchedule.day}
                </p>
                <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">
                  There are no lecture records for this day in the timetable.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
                {selectedDaySchedule.lectures.map((lec) => {
                  const isLive = isToday(selectedDaySchedule.day) && isLectureLiveNow(lec.timings);

                  return (
                    <div
                      key={lec.id}
                      className={`rounded-2xl border p-4 flex flex-col justify-between transition-all duration-300 ease-out min-h-[220px] shadow-xs group card-sheen hover:-translate-y-1.5 hover:shadow-lg active:scale-[0.99] ${
                        isLive
                          ? 'bg-amber-500/10 dark:bg-amber-500/15 border-amber-400/50 ring-2 ring-amber-400/30'
                          : 'bg-white dark:bg-[#14141B] border-slate-200/90 dark:border-[#22222E] hover:border-[#8048A8]/60 dark:hover:border-[#9D5DD4]/70 dark:hover:shadow-[0_10px_30px_-6px_rgba(128,72,168,0.25)]'
                      }`}
                    >
                      {/* Top: Period Label & Type */}
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-2.5">
                          <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg border bg-slate-100 dark:bg-[#1E1E28] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-zinc-800">
                            {lec.periodLabel}
                          </span>
                          <div className="flex items-center gap-1">
                            {isLive && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-500 text-white animate-pulse">
                                <Radio className="w-2.5 h-2.5" /> LIVE
                              </span>
                            )}
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getLectureBadgeStyle(
                                lec.type
                              )}`}
                            >
                              {lec.type}
                            </span>
                          </div>
                        </div>

                        {/* Timings */}
                        <div className="flex items-center gap-1.5 text-xs font-medium mb-3 p-2 rounded-xl border border-slate-200/70 dark:border-[#22222E] bg-slate-50/70 dark:bg-[#1A1A24] text-slate-700 dark:text-slate-300 group-hover:border-[#8048A8]/40 transition-colors">
                          <Clock className="w-3.5 h-3.5 flex-shrink-0 text-slate-400 dark:text-slate-500" />
                          <span className="truncate">{lec.timings}</span>
                        </div>

                        {/* Subject Code & Name */}
                        <h4 className="text-base font-black leading-tight text-slate-900 dark:text-white group-hover:text-[#8048A8] dark:group-hover:text-[#D1A7FF] transition-colors">
                          {lec.subjectCode}
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-2 leading-relaxed font-medium">
                          {lec.subjectName}
                        </p>
                      </div>

                      {/* Bottom: Room & Faculty */}
                      <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-zinc-800/80 space-y-1.5 text-[11px]">
                        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                          <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-slate-400 dark:text-slate-500" />
                          <span className="font-semibold truncate">{lec.room}</span>
                        </div>
                        {lec.faculty && (
                          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                            <UserIcon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span className="truncate">{lec.faculty}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
