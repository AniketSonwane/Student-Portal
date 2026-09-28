import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, BookOpen, CalendarCheck, User, Settings } from 'lucide-react';
import { ROUTES } from '../../utils/constants';
import { useAuth } from '../../hooks/useAuth';

export const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();

  // Only show bottom navigation for authenticated student sessions (hidden on Admin Portal)
  if (!isAuthenticated || location.pathname === ROUTES.ADMIN) return null;

  const isDashboard = location.pathname === ROUTES.DASHBOARD;
  const isProfile = location.pathname === ROUTES.PROFILE;
  const isMarks = location.pathname === ROUTES.MARKS;
  const isAttendance = location.pathname === ROUTES.ATTENDANCE;
  const isSettings = location.pathname === ROUTES.SETTINGS;

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-white/95 dark:bg-[#09090D]/95 backdrop-blur-xl border-t border-slate-200/90 dark:border-[#202028] px-2 pt-2 pb-[max(0.6rem,env(safe-area-inset-bottom))] shadow-lg transition-colors duration-200"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {/* Dashboard Tab */}
        <button
          type="button"
          onClick={() => navigate(ROUTES.DASHBOARD)}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all duration-150 touch-manipulation active:scale-95 ${
            isDashboard
              ? 'text-[#8048A8] dark:text-[#D1A7FF] font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <div className="relative">
            <LayoutDashboard className="w-5 h-5" />
            {isDashboard && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#8048A8] dark:bg-[#D1A7FF]" />
            )}
          </div>
          <span className="text-[10px] mt-1 tracking-tight">Home</span>
        </button>

        {/* Marks Tab */}
        <button
          type="button"
          onClick={() => navigate(`${ROUTES.MARKS}?sem=${user?.current_semester || 3}`)}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all duration-150 touch-manipulation active:scale-95 ${
            isMarks
              ? 'text-[#8048A8] dark:text-[#D1A7FF] font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <div className="relative">
            <BookOpen className="w-5 h-5" />
            {isMarks && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#8048A8] dark:bg-[#D1A7FF]" />
            )}
          </div>
          <span className="text-[10px] mt-1 tracking-tight">Marks</span>
        </button>

        {/* Attendance Tab */}
        <button
          type="button"
          onClick={() => navigate(ROUTES.ATTENDANCE)}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all duration-150 touch-manipulation active:scale-95 ${
            isAttendance
              ? 'text-amber-500 dark:text-[#F8D299] font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <div className="relative">
            <CalendarCheck className="w-5 h-5" />
            {isAttendance && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-amber-500 dark:bg-[#F8D299]" />
            )}
          </div>
          <span className="text-[10px] mt-1 tracking-tight">Attend</span>
        </button>

        {/* Profile Tab */}
        <button
          type="button"
          onClick={() => navigate(ROUTES.PROFILE)}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-150 touch-manipulation active:scale-95 ${
            isProfile
              ? 'text-[#8048A8] dark:text-[#D1A7FF] font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <div className="relative">
            <User className="w-5 h-5" />
            {isProfile && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#8048A8] dark:bg-[#D1A7FF]" />
            )}
          </div>
          <span className="text-[10px] mt-1 tracking-tight">Profile</span>
        </button>

        {/* Setting Tab */}
        <button
          type="button"
          onClick={() => navigate(ROUTES.SETTINGS)}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-150 touch-manipulation active:scale-95 ${
            isSettings
              ? 'text-[#8048A8] dark:text-[#D1A7FF] font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <div className="relative">
            <Settings className="w-5 h-5" />
            {isSettings && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#8048A8] dark:bg-[#D1A7FF]" />
            )}
          </div>
          <span className="text-[10px] mt-1 tracking-tight">Setting</span>
        </button>
      </div>
    </nav>
  );
};
