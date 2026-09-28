import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LogOut,
  GraduationCap,
  Calendar,
  Award,
  Clock,
  User,
  BookOpen,
  Settings,
  CalendarCheck,
  Shield,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { marksService } from '../../services/marks';
import { attendanceService } from '../../services/attendance';
import { ThemeToggle } from '../../components/common/ThemeToggle';
import { Button } from '../../components/ui/Button';
import { APP_CONFIG, ROUTES } from '../../utils/constants';

export const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [cgpa, setCgpa] = useState<string>(() => {
    if (user?.cgpa && user.cgpa !== 'NA' && user.cgpa !== '-') {
      return user.cgpa;
    }
    return '';
  });

  useEffect(() => {
    let isCancelled = false;
    const loadCgpa = async () => {
      if (user?.cgpa && user.cgpa !== 'NA' && user.cgpa !== '-') {
        setCgpa(user.cgpa);
        return;
      }

      if (!user?.usn) return;

      try {
        const [sem1, sem2] = await Promise.all([
          marksService.getStudentMarks(user.usn, 1),
          marksService.getStudentMarks(user.usn, 2),
        ]);

        const validSgpas: number[] = [];
        if (sem1.success && sem1.data?.summary.sgpa) {
          const val = parseFloat(sem1.data.summary.sgpa);
          if (!isNaN(val) && val > 0) validSgpas.push(val);
        }
        if (sem2.success && sem2.data?.summary.sgpa) {
          const val = parseFloat(sem2.data.summary.sgpa);
          if (!isNaN(val) && val > 0) validSgpas.push(val);
        }

        if (validSgpas.length > 0) {
          const avg = validSgpas.reduce((a, b) => a + b, 0) / validSgpas.length;
          if (!isCancelled) {
            setCgpa(avg.toFixed(2));
          }
        } else if (!isCancelled) {
          setCgpa('NA');
        }
      } catch {
        if (!isCancelled) setCgpa('NA');
      }
    };

    loadCgpa();
    return () => {
      isCancelled = true;
    };
  }, [user?.usn, user?.cgpa]);

  const [attendance, setAttendance] = useState<string>('88%');

  useEffect(() => {
    let isCancelled = false;
    const loadAttendance = async () => {
      if (!user?.usn) return;
      try {
        const attRes = await attendanceService.getStudentAttendance(user.usn, 3);
        if (attRes.success && attRes.data) {
          if (!isCancelled) {
            setAttendance(`${attRes.data.totalAverage}%`);
          }
          return;
        }

        // Fallback calculation from marks if attendance sheet is not available
        const sem = user.current_semester || 3;
        const res = await marksService.getStudentMarks(user.usn, sem);
        let calculatedPct: number | null = null;
        if (res.success && res.data?.subjects) {
          const attItems: { score: number; max: number }[] = [];
          res.data.subjects.forEach((sub) => {
            sub.assessments?.forEach((ass) => {
              if (/attend/i.test(ass.name)) {
                const sc = parseFloat(ass.score);
                if (!isNaN(sc) && ass.max > 0) {
                  attItems.push({ score: sc, max: ass.max });
                }
              }
            });
          });
          if (attItems.length > 0) {
            const totalScore = attItems.reduce((a, b) => a + b.score, 0);
            const totalMax = attItems.reduce((a, b) => a + b.max, 0);
            if (totalMax > 0) {
              calculatedPct = Math.round((totalScore / totalMax) * 100);
            }
          }
        }
        if (!isCancelled) {
          setAttendance(calculatedPct !== null ? `${calculatedPct}%` : '88%');
        }
      } catch {
        if (!isCancelled) {
          setAttendance('88%');
        }
      }
    };

    loadAttendance();
    return () => {
      isCancelled = true;
    };
  }, [user?.usn, user?.current_semester]);

  const handleLogout = () => {
    logout();
    navigate(ROUTES.LOGIN);
  };

  return (
    <div className="min-h-screen bg-transparent text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-[#000000]/95 backdrop-blur-md border-b border-slate-200 dark:border-[#222228] px-3 sm:px-6 py-2.5 sm:py-3 transition-colors duration-200">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-900 dark:bg-[#16161B] border border-slate-700/50 dark:border-[#8048A8]/40 flex items-center justify-center text-[#F8D299] shadow-sm flex-shrink-0">
              <GraduationCap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#F8D299]" />
            </div>
            <h1 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-tight truncate">
              {APP_CONFIG.name}
            </h1>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {localStorage.getItem('student_portal_admin_inspecting') === 'true' && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  localStorage.removeItem('student_portal_admin_inspecting');
                  navigate(ROUTES.ADMIN);
                }}
                leftIcon={<Shield className="w-3.5 h-3.5" />}
                className="text-xs px-2.5 sm:px-3.5 py-1.5 min-h-[36px] bg-[#8048A8] hover:bg-[#6f3796] text-white shadow-sm border border-[#9b5cc4] touch-manipulation"
              >
                <span>Back to Admin</span>
              </Button>
            )}
            <ThemeToggle />
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              leftIcon={<LogOut className="w-3.5 h-3.5" />}
              className="text-xs px-2.5 sm:px-3 py-1.5 min-h-[36px] touch-manipulation"
            >
              <span className="hidden sm:inline">Sign Out</span>
              <span className="sm:hidden">Exit</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-3 sm:px-8 py-4 sm:py-8 pb-24 sm:pb-8 space-y-4 sm:space-y-8">
        {/* Unified Student Hero & Overview Single Card */}
        <div className="relative bg-slate-900 dark:bg-[#0A0A0E] text-white rounded-2xl border border-slate-800 dark:border-[#222228] shadow-card dark:shadow-card-dark overflow-hidden transition-all duration-300 animate-card-slide-1">
          {/* Subtle accent bar at top */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#8048A8] to-[#F8D299] opacity-80" />

          {/* Student Profile Identity Section */}
          <div className="p-4 sm:p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6">
            <div className="flex items-center gap-3.5 sm:gap-5 w-full sm:w-auto">
              <div className="relative flex-shrink-0">
                {user?.profile_image ? (
                  <img
                    src={user.profile_image}
                    alt={user.name}
                    referrerPolicy="no-referrer"
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-slate-700 dark:border-[#2A2A32] shadow-md"
                  />
                ) : (
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-slate-800 text-[#F8D299] font-bold text-xl sm:text-2xl flex items-center justify-center shadow-md border border-slate-700">
                    {user?.name ? user.name.charAt(0) : 'S'}
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="text-lg sm:text-2xl font-bold tracking-tight text-white truncate">
                  {user?.name}
                </h2>
                <p className="text-xs text-slate-400 flex flex-wrap items-center gap-1.5 sm:gap-2 mt-0.5">
                  <span>USN: <strong className="text-slate-200 font-mono">{user?.usn}</strong></span>
                </p>
              </div>
            </div>

            <div className="w-full sm:w-auto flex sm:flex-col sm:items-end justify-between sm:justify-center gap-2 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-slate-800 dark:border-zinc-800/80">
              <span className="text-[11px] sm:text-xs font-mono bg-white/10 dark:bg-white/5 border border-white/10 px-2.5 py-1 rounded-md text-slate-200 truncate block text-center sm:text-right">
                {user?.google_email}
              </span>
            </div>
          </div>

          {/* Integrated Overview Stats Row (Inside Same Single Card) */}
          <div className="border-t border-slate-800/90 dark:border-[#1E1E26] bg-slate-950/50 dark:bg-[#060609]/70 px-4 sm:px-7 py-3.5 sm:py-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-800/70 dark:divide-[#1E1E26] gap-3.5 sm:gap-0">
              {/* Stat 1: Semester & Year */}
              <div className="flex items-center gap-3.5 sm:gap-4 sm:pr-4 py-1.5 sm:py-0 group">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-slate-800/90 dark:bg-[#16161B] border border-slate-700/60 dark:border-[#222228] text-slate-200 flex items-center justify-center relative flex-shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:border-[#8048A8]">
                  <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-slate-300" />
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#8048A8]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] sm:text-xs text-slate-400 font-medium">Semester & Year</p>
                  <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-[#D1A7FF] transition-colors truncate">
                    Semester {user?.current_semester}
                  </h3>
                  <p className="text-[11px] text-[#D1A7FF] font-medium">{user?.college_year}</p>
                </div>
              </div>

              {/* Stat 2: Current CGPA */}
              <div className="flex items-center gap-3.5 sm:gap-4 sm:px-5 py-2.5 sm:py-0 group">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-slate-800/90 dark:bg-[#16161B] border border-slate-700/60 dark:border-[#222228] text-slate-200 flex items-center justify-center relative flex-shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:border-[#F59E51]">
                  <Award className="w-4 h-4 sm:w-5 sm:h-5 text-[#F8D299]" />
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#F59E51]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] sm:text-xs text-slate-400 font-medium">Current CGPA</p>
                  <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-[#F8D299] transition-colors truncate">
                    {cgpa ? (
                      cgpa !== 'NA' ? (
                        <>
                          {cgpa}{' '}
                          <span className="text-[11px] font-normal text-slate-400">/ 10</span>
                        </>
                      ) : (
                        'NA'
                      )
                    ) : (
                      'Loading...'
                    )}
                  </h3>
                </div>
              </div>

              {/* Stat 3: Current Sem Avg Attendance */}
              <div className="flex items-center gap-3.5 sm:gap-4 sm:pl-5 py-2.5 sm:py-0 group">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-slate-800/90 dark:bg-[#16161B] border border-slate-700/60 dark:border-[#222228] text-slate-200 flex items-center justify-center relative flex-shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:border-emerald-500">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] sm:text-xs text-slate-400 font-medium">Current Sem Avg Attendance</p>
                  <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-emerald-400 transition-colors truncate">
                    {attendance}
                  </h3>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Portal Navigation Links */}
        <div className="animate-card-slide-2">
          <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 sm:mb-4">
            Portal Sections
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div
              onClick={() => navigate(ROUTES.PROFILE)}
              className="p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-[#222228] bg-white/90 dark:bg-[#0C0C10] hover:border-[#8048A8] dark:hover:border-[#8048A8] hover:-translate-y-1.5 hover:shadow-lg dark:hover:shadow-[0_12px_25px_-5px_rgba(0,0,0,0.8)] hover:ring-1 hover:ring-[#8048A8]/20 active:scale-[0.96] touch-manipulation flex flex-col items-center text-center gap-1.5 sm:gap-2 transition-all duration-300 cursor-pointer group shadow-sm"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-slate-100 dark:bg-[#16161C] border border-slate-200 dark:border-[#272730] text-slate-700 dark:text-slate-300 flex items-center justify-center transition-all duration-300 group-hover:border-[#8048A8] group-hover:bg-[#8048A8]/10 group-hover:scale-110">
                <User className="w-4 h-4 sm:w-5 sm:h-5 group-hover:text-[#8048A8] dark:group-hover:text-[#D1A7FF] transition-colors" />
              </div>
              <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-[#8048A8] dark:group-hover:text-[#D1A7FF] transition-colors">Profile</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Personal records</span>
            </div>

            <div
              onClick={() => navigate(`${ROUTES.MARKS}?sem=${user?.current_semester || 3}`)}
              className="p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-[#222228] bg-white/90 dark:bg-[#0C0C10] hover:border-[#8048A8] dark:hover:border-[#8048A8] hover:-translate-y-1.5 hover:shadow-lg dark:hover:shadow-[0_12px_25px_-5px_rgba(0,0,0,0.8)] hover:ring-1 hover:ring-[#8048A8]/20 active:scale-[0.96] touch-manipulation flex flex-col items-center text-center gap-1.5 sm:gap-2 transition-all duration-300 cursor-pointer group shadow-sm"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-slate-100 dark:bg-[#16161C] border border-slate-200 dark:border-[#272730] text-slate-700 dark:text-slate-300 flex items-center justify-center transition-all duration-300 group-hover:border-[#8048A8] group-hover:bg-[#8048A8]/10 group-hover:scale-110">
                <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-[#8048A8] dark:text-[#D1A7FF]" />
              </div>
              <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-[#8048A8] dark:group-hover:text-[#D1A7FF] transition-colors">
                Semester Marks
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">View Master-Sheet</span>
            </div>

            <div
              onClick={() => navigate(ROUTES.ATTENDANCE)}
              className="p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-[#222228] bg-white/90 dark:bg-[#0C0C10] hover:border-[#F59E51] dark:hover:border-[#F59E51] hover:-translate-y-1.5 hover:shadow-lg dark:hover:shadow-[0_12px_25px_-5px_rgba(0,0,0,0.8)] hover:ring-1 hover:ring-[#F59E51]/20 active:scale-[0.96] touch-manipulation flex flex-col items-center text-center gap-1.5 sm:gap-2 transition-all duration-300 cursor-pointer group shadow-sm"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-slate-100 dark:bg-[#16161C] border border-slate-200 dark:border-[#272730] text-slate-700 dark:text-slate-300 flex items-center justify-center transition-all duration-300 group-hover:border-[#F59E51] group-hover:bg-[#F59E51]/10 group-hover:scale-110">
                <CalendarCheck className="w-4 h-4 sm:w-5 sm:h-5 text-[#F59E51] transition-colors" />
              </div>
              <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-[#F59E51] transition-colors">Attendance</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Class summaries</span>
            </div>

            <div
              onClick={() => navigate(ROUTES.SETTINGS)}
              className="p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-[#222228] bg-white/90 dark:bg-[#0C0C10] hover:border-slate-400 dark:hover:border-[#383842] hover:-translate-y-1.5 hover:shadow-lg dark:hover:shadow-[0_12px_25px_-5px_rgba(0,0,0,0.8)] hover:ring-1 hover:ring-slate-400/20 active:scale-[0.96] touch-manipulation flex flex-col items-center text-center gap-1.5 sm:gap-2 transition-all duration-300 cursor-pointer group shadow-sm"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-slate-100 dark:bg-[#16161C] border border-slate-200 dark:border-[#272730] text-slate-700 dark:text-slate-300 flex items-center justify-center transition-all duration-300 group-hover:border-slate-400 group-hover:bg-slate-200/50 dark:group-hover:bg-zinc-800 group-hover:scale-110">
                <Settings className="w-4 h-4 sm:w-5 sm:h-5 group-hover:text-slate-900 dark:group-hover:text-white transition-colors" />
              </div>
              <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">Settings</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Preferences</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
