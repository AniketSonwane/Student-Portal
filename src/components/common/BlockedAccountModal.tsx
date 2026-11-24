import React from 'react';
import { ShieldAlert, LogOut } from 'lucide-react';

interface BlockedAccountModalProps {
  isOpen: boolean;
  blockedUser?: string;
  reason?: string;
  onAcknowledge: () => void;
  secondsRemaining?: number;
}

export const BlockedAccountModal: React.FC<BlockedAccountModalProps> = ({
  isOpen,
  blockedUser,
  reason,
  onAcknowledge,
  secondsRemaining = 5,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-[#181820] border border-rose-200 dark:border-rose-900/50 rounded-3xl p-6 sm:p-7 shadow-2xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-rose-500/15 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 flex items-center justify-center text-rose-600 dark:text-rose-400 mb-4 shadow-sm animate-bounce">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Account Access Blocked
          </h3>

          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
            Your student portal access has been suspended by the institutional administrator.
          </p>

          <div className="w-full mt-4 p-4 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 text-left">
            <div className="text-[11px] font-semibold text-rose-700 dark:text-rose-400 uppercase tracking-wider mb-1">
              Details
            </div>
            {blockedUser && (
              <div className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                <span className="text-slate-500 dark:text-slate-400">Account ID: </span>
                {blockedUser}
              </div>
            )}
            <div className="text-xs text-slate-700 dark:text-slate-300 mt-1">
              <span className="text-slate-500 dark:text-slate-400">Reason: </span>
              <span className="font-semibold text-rose-800 dark:text-rose-300">
                {reason || 'Administrative restriction'}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-4">
            Ending your active session in <span className="font-bold text-rose-600 dark:text-rose-400 text-xs">{secondsRemaining}s</span>...
          </p>

          <button
            type="button"
            onClick={onAcknowledge}
            className="w-full mt-4 py-3 px-4 rounded-xl font-semibold text-sm bg-rose-600 hover:bg-rose-700 active:scale-[0.99] text-white shadow-md shadow-rose-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Acknowledge & Sign Out Now</span>
          </button>
        </div>
      </div>
    </div>
  );
};
