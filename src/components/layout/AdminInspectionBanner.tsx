import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { adminSheetService } from '../../services/adminSheetService';
import { ROUTES } from '../../utils/constants';

export const AdminInspectionBanner: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [isInspecting, setIsInspecting] = useState<boolean>(() => {
    return (
      adminSheetService.isAdminAuthenticated() &&
      localStorage.getItem('student_portal_admin_inspecting') === 'true'
    );
  });

  // Re-check on route transition or storage changes
  useEffect(() => {
    const checkState = () => {
      const active =
        adminSheetService.isAdminAuthenticated() &&
        localStorage.getItem('student_portal_admin_inspecting') === 'true';
      setIsInspecting(active);
    };

    checkState();
    window.addEventListener('storage', checkState);
    return () => window.removeEventListener('storage', checkState);
  }, [location.pathname]);

  // Don't display on admin portal itself or login page
  if (
    !isInspecting ||
    location.pathname === ROUTES.ADMIN ||
    location.pathname === ROUTES.LOGIN
  ) {
    return null;
  }

  const handleBackToAdmin = () => {
    localStorage.removeItem('student_portal_admin_inspecting');
    navigate(ROUTES.ADMIN);
  };

  return (
    <div className="sticky top-0 z-50 bg-[#161220]/95 backdrop-blur-md text-white border-b border-[#8048A8]/50 shadow-md px-3 sm:px-6 py-2 transition-all duration-200">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
        {/* Left: Admin Mode Badge & Student Name */}
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div className="w-6 h-6 rounded-md bg-[#8048A8]/30 border border-[#8048A8]/60 flex items-center justify-center text-[#F8D299] flex-shrink-0">
            <Shield className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0 text-xs">
            <span className="font-semibold text-slate-300 hidden xs:inline">
              Admin Preview:&nbsp;
            </span>
            <span className="font-bold text-[#F8D299] truncate">
              {user?.name || 'Student'}
            </span>
            <span className="text-slate-400 font-mono text-[11px] ml-1.5 hidden sm:inline">
              ({user?.usn || ''})
            </span>
          </div>
        </div>

        {/* Right: Back to Admin Dashboard Button */}
        <button
          type="button"
          onClick={handleBackToAdmin}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#8048A8] hover:bg-[#6e3796] active:scale-95 text-white font-semibold text-xs shadow-sm hover:shadow transition-all duration-150 flex-shrink-0 touch-manipulation cursor-pointer border border-[#9b5cc4]"
          title="Exit student preview and return to Admin Dashboard"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Back to Admin Dashboard</span>
          <span className="sm:hidden">Admin Dashboard</span>
        </button>
      </div>
    </div>
  );
};

export default AdminInspectionBanner;
