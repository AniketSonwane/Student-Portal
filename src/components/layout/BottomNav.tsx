import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User, Clock, LayoutDashboard, Bell, Settings } from 'lucide-react';
import { ROUTES } from '../../utils/constants';
import { useAuth } from '../../hooks/useAuth';

export const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  // Only show bottom navigation for authenticated student sessions (hidden on Admin Portal)
  if (!isAuthenticated || location.pathname === ROUTES.ADMIN) return null;

  const isProfile = location.pathname === ROUTES.PROFILE;
  const isTimetable = location.pathname === ROUTES.TIMETABLE;
  const isDashboard = location.pathname === ROUTES.DASHBOARD;
  const isNotices = location.pathname === ROUTES.NOTICES;
  const isSettings = location.pathname === ROUTES.SETTINGS;

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-white/95 dark:bg-[#09090D]/95 backdrop-blur-xl border-t border-slate-200/90 dark:border-[#202028] px-2 pt-2 pb-[max(0.6rem,env(safe-area-inset-bottom))] shadow-lg transition-colors duration-200"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {/* 1. Profile Tab */}
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

        {/* 2. Timetable Tab */}
        <button
          type="button"
          onClick={() => navigate(ROUTES.TIMETABLE)}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all duration-150 touch-manipulation active:scale-95 ${
            isTimetable
              ? 'text-[#8048A8] dark:text-[#D1A7FF] font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <div className="relative">
            <Clock className="w-5 h-5" />
            {isTimetable && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#8048A8] dark:bg-[#D1A7FF]" />
            )}
          </div>
          <span className="text-[10px] mt-1 tracking-tight">Timetable</span>
        </button>

        {/* 3. Home (Dashboard) Tab */}
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

        {/* 4. Notices Tab */}
        <button
          type="button"
          onClick={() => navigate(ROUTES.NOTICES)}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all duration-150 touch-manipulation active:scale-95 ${
            isNotices
              ? 'text-[#8048A8] dark:text-[#D1A7FF] font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <div className="relative">
            <Bell className="w-5 h-5" />
            {isNotices && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#8048A8] dark:bg-[#D1A7FF]" />
            )}
          </div>
          <span className="text-[10px] mt-1 tracking-tight">Notices</span>
        </button>

        {/* 5. Settings Tab */}
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
          <span className="text-[10px] mt-1 tracking-tight">Settings</span>
        </button>
      </div>
    </nav>
  );
};
