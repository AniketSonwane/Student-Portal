import React, { useState } from 'react';
import { Lock, RefreshCw, ShieldAlert, ArrowRight, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../utils/constants';

interface PortalLockedScreenProps {
  reason?: string;
}

export const PortalLockedScreen: React.FC<PortalLockedScreenProps> = ({
  reason = 'System maintenance and grade synchronisation in progress.',
}) => {
  const { checkPortalLock, logout } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);

  const handleCheckAgain = async () => {
    setChecking(true);
    try {
      await checkPortalLock(true);
    } finally {
      setTimeout(() => setChecking(false), 500);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-transparent">
      <div className="w-full max-w-lg bg-white/95 dark:bg-[#0A0A0E]/95 backdrop-blur-md border border-rose-200/80 dark:border-rose-900/40 rounded-3xl shadow-card dark:shadow-card-dark p-6 sm:p-9 relative overflow-hidden text-center">
        {/* Top Accent Gradient Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-amber-500 to-[#8048A8]" />

        {/* Lock Icon with ambient pulse */}
        <div className="relative inline-flex items-center justify-center mb-5">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-lg relative">
            <Lock className="w-8 h-8 sm:w-10 sm:h-10" />
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500 border-2 border-white dark:border-[#0A0A0E]" />
            </span>
          </div>
        </div>

        {/* Heading & Subheading */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-bold uppercase tracking-wider mb-2 border border-rose-500/20">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Maintenance Mode Active</span>
        </div>

        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
          Student Portal is Locked
        </h1>

        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mb-6 max-w-md mx-auto leading-relaxed">
          The administrator has temporarily paused student access to perform system updates, mark synchronisations, or semester audits.
        </p>

        {/* Maintenance Message Box */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#121217] border border-slate-200/80 dark:border-[#22222A] text-left mb-6">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Administrator Notice
          </span>
          <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-medium italic">
            &ldquo;{reason}&rdquo;
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleCheckAgain}
            disabled={checking}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-[#1C1C24] hover:bg-slate-800 dark:hover:bg-[#282834] text-white text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700 dark:border-[#323240] transition-all shadow-sm disabled:opacity-60 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
            <span>{checking ? 'Checking Status...' : 'Check Again'}</span>
          </button>

          <button
            type="button"
            onClick={() => navigate(ROUTES.ADMIN)}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#8048A8] hover:bg-[#6c3990] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
          >
            <span>Admin Login</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => logout('You have signed out while the portal is undergoing maintenance.')}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
