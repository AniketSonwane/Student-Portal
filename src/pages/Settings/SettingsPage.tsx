import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Settings as SettingsIcon,
  LogOut,
  Mail,
  Sun,
  Moon,
  FileText,
  Copy,
  Check,
  ExternalLink,
  AlertTriangle,
  FileEdit,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { LoadingState } from '../../components/common/LoadingState';
import { APP_CONFIG, ROUTES } from '../../utils/constants';
import { adminSheetService } from '../../services/adminSheetService';

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  // Request Data Update State
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [fieldName, setFieldName] = useState('Personal Details');
  const [oldValue, setOldValue] = useState('');
  const [newValue, setNewValue] = useState('');
  const [requestReason, setRequestReason] = useState('');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState(false);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const timer = setTimeout(() => {
      setIsFadingOut(true);
      timeoutId = setTimeout(() => {
        setIsLoading(false);
        setIsFadingOut(false);
      }, 180);
    }, 320);
    return () => {
      clearTimeout(timer);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(APP_CONFIG.adminEmail);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleConfirmSignOut = () => {
    logout();
    navigate(ROUTES.LOGIN);
  };

  const handleSubmitChangeRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newValue.trim() || !user) return;
    setIsSubmittingRequest(true);
    try {
      const sanitizedNewValue =
        newValue.trim().startsWith('+') || newValue.trim().startsWith('=')
          ? `'${newValue.trim()}`
          : newValue.trim();
      const sanitizedOldValue =
        oldValue.trim().startsWith('+') || oldValue.trim().startsWith('=')
          ? `'${oldValue.trim()}`
          : oldValue.trim() || 'NA';

      await adminSheetService.submitChangeRequest({
        student_usn: user.usn,
        student_name: user.name,
        field_name: fieldName,
        old_value: sanitizedOldValue,
        new_value: sanitizedNewValue,
        reason: requestReason.trim(),
      });
      setRequestSuccess(true);
      setTimeout(() => {
        setIsRequestModalOpen(false);
        setRequestSuccess(false);
        setFieldName('Personal Details');
        setOldValue('');
        setNewValue('');
        setRequestReason('');
      }, 2500);
    } catch (err) {
      console.error('Change request error:', err);
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-slate-900 dark:text-slate-100 flex flex-col justify-between py-4 sm:py-6 px-3 sm:px-6 transition-colors duration-200">
      <div className="max-w-xl w-full mx-auto flex-1 flex flex-col justify-center">
        {/* Top Header Bar */}
        <header className="flex items-center justify-center sm:justify-between gap-3 mb-6 sm:mb-8 pb-3.5 border-b border-slate-200/90 dark:border-[#222228]">
          {/* Back button (desktop/tablet only; on phone bottom nav is used) */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            className="hidden sm:inline-flex px-2.5 sm:px-3 text-xs min-h-[36px] touch-manipulation"
          >
            <span>Back</span>
          </Button>

          {/* Center Title */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-slate-900 dark:bg-[#16161B] border border-slate-700/50 dark:border-[#8048A8]/40 flex items-center justify-center text-[#F8D299] shadow-sm">
              <SettingsIcon className="w-3.5 h-3.5" />
            </div>
            <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight">
              Settings
            </h1>
          </div>

          {/* Empty spacer to keep Settings title centered on desktop */}
          <div className="hidden sm:block w-[68px]" aria-hidden="true" />
        </header>

        {isLoading ? (
          <div
            className={`bg-white/80 dark:bg-[#0E0E14]/80 backdrop-blur-xl rounded-3xl border border-slate-200 dark:border-[#1F1F28] p-12 text-center shadow-lg ${
              isFadingOut ? 'animate-fade-out' : 'animate-fade-in'
            }`}
          >
            <LoadingState message="Loading portal preferences..." />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Center Card Container */}
            <div className="relative bg-white/95 dark:bg-[#0A0A0E]/95 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-[#222228] shadow-card dark:shadow-card-dark overflow-hidden p-5 sm:p-8 transition-all duration-300 animate-card-slide-1">
              {/* Subtle top accent bar */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#8048A8] to-[#F8D299] opacity-80" />

              {/* Student Profile Quick Overview Header */}
              <div className="flex items-center justify-between gap-3.5 mb-6 pb-5 border-b border-slate-100 dark:border-[#1E1E26]">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="relative flex-shrink-0">
                    {user?.profile_image ? (
                      <img
                        src={user.profile_image}
                        alt={user.name}
                        referrerPolicy="no-referrer"
                        className="w-12 h-12 rounded-full object-cover border-2 border-slate-200 dark:border-[#2A2A32] shadow-sm"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-slate-900 text-[#F8D299] font-bold text-base flex items-center justify-center border border-slate-700">
                        {user?.name ? user.name.charAt(0) : 'S'}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div>
                      <span className="text-sm font-bold text-slate-900 dark:text-white truncate block">
                        {user?.name || 'Student'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate">
                      {user?.usn || 'CS25131'} • {user?.google_email}
                    </p>
                  </div>
                </div>
              </div>

              {/* Primary Setting Action Buttons Stacked */}
              <div className="space-y-3 sm:space-y-3.5">
                {/* 1. Sign Out */}
                <button
                  type="button"
                  onClick={() => setIsSignOutModalOpen(true)}
                  className="w-full flex items-center justify-between p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-[#222228] bg-slate-50/70 dark:bg-[#121218]/80 hover:bg-rose-50/70 dark:hover:bg-rose-950/20 hover:border-rose-300 dark:hover:border-rose-900/60 active:scale-[0.99] touch-manipulation transition-all duration-200 group text-left cursor-pointer shadow-sm"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-rose-100/80 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                      <LogOut className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors block">
                        Sign Out
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate block">
                        Securely disconnect your active student session
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-rose-600 dark:text-rose-400 opacity-80 group-hover:opacity-100 flex-shrink-0 hidden xs:inline">
                    Exit
                  </span>
                </button>

                {/* 2. Contact Admin */}
                <button
                  type="button"
                  onClick={() => setIsContactModalOpen(true)}
                  className="w-full flex items-center justify-between p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-[#222228] bg-slate-50/70 dark:bg-[#121218]/80 hover:bg-purple-50/70 dark:hover:bg-[#8048A8]/10 hover:border-[#8048A8]/50 dark:hover:border-[#8048A8]/50 active:scale-[0.99] touch-manipulation transition-all duration-200 group text-left cursor-pointer shadow-sm"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-[#8048A8]/15 dark:bg-[#8048A8]/20 border border-[#8048A8]/30 text-[#8048A8] dark:text-[#D1A7FF] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-[#8048A8] dark:group-hover:text-[#D1A7FF] transition-colors block">
                        Contact Admin
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate block">
                        {APP_CONFIG.adminEmail}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-[#8048A8] dark:text-[#D1A7FF] opacity-80 group-hover:opacity-100 flex-shrink-0 hidden xs:inline">
                    Email
                  </span>
                </button>

                {/* 3. Change / Update Data Button */}
                <button
                  type="button"
                  onClick={() => setIsRequestModalOpen(true)}
                  className="w-full flex items-center justify-between p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-[#222228] bg-slate-50/70 dark:bg-[#121218]/80 hover:bg-emerald-50/70 dark:hover:bg-emerald-950/20 hover:border-emerald-300 dark:hover:border-emerald-800/60 active:scale-[0.99] touch-manipulation transition-all duration-200 group text-left cursor-pointer shadow-sm"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-emerald-100/80 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                      <FileEdit className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors block">
                        Change / Update Data
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate block">
                        Generate request to update phone, blood group, address or records
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 opacity-80 group-hover:opacity-100 flex-shrink-0 hidden xs:inline">
                    Update
                  </span>
                </button>

                {/* 4. Change Theme */}
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="w-full flex items-center justify-between p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-[#222228] bg-slate-50/70 dark:bg-[#121218]/80 hover:bg-amber-50/70 dark:hover:bg-amber-950/20 hover:border-[#F59E51]/50 dark:hover:border-[#F59E51]/50 active:scale-[0.99] touch-manipulation transition-all duration-200 group text-left cursor-pointer shadow-sm"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-amber-100/80 dark:bg-[#1E1A16] border border-amber-300 dark:border-amber-900/40 text-amber-600 dark:text-[#F8D299] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                      {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-[#F8D299] transition-colors block">
                        Change Theme
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate block">
                        Currently in {theme === 'dark' ? 'Dark Mode' : 'Light Mode'} • Tap to switch
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-amber-600 dark:text-[#F8D299] opacity-80 group-hover:opacity-100 flex-shrink-0">
                    {theme === 'dark' ? 'Light' : 'Dark'}
                  </span>
                </button>

                {/* 4. Terms and Conditions */}
                <button
                  type="button"
                  onClick={() => navigate(ROUTES.TERMS)}
                  className="w-full flex items-center justify-between p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-[#222228] bg-slate-50/70 dark:bg-[#121218]/80 hover:bg-slate-100 dark:hover:bg-[#181822] hover:border-slate-400 dark:hover:border-[#383842] active:scale-[0.99] touch-manipulation transition-all duration-200 group text-left cursor-pointer shadow-sm"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-slate-200/80 dark:bg-[#181820] border border-slate-300 dark:border-[#2C2C36] text-slate-700 dark:text-slate-300 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-[#8048A8] dark:group-hover:text-[#D1A7FF] transition-colors block">
                        Terms and Conditions
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate block">
                        Privacy policy, student guidelines & institutional disclaimer
                      </span>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors flex-shrink-0" />
                </button>
              </div>
            </div>

            {/* Developed by anixss attribution directly under the card (as in wireframe) */}
            <div className="text-center animate-card-slide-2">
              <div className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-500 dark:text-slate-400 transition-transform duration-200 hover:scale-105">
                <span>Developed by</span>
                <a
                  href="https://github.com/anixss"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-[#8048A8] dark:text-[#D1A7FF] px-2.5 py-0.5 rounded-full bg-[#8048A8]/10 dark:bg-[#8048A8]/20 border border-[#8048A8]/30 hover:border-[#8048A8]/60 transition-all shadow-sm"
                  title="Developed by Anixss (GitHub Profile)"
                >
                  anixss
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sign Out Confirmation Modal */}
      <Modal
        isOpen={isSignOutModalOpen}
        onClose={() => setIsSignOutModalOpen(false)}
        title="Confirm Sign Out"
        maxWidth="sm"
      >
        <div className="p-4 sm:p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/50 flex items-center justify-center text-rose-600 dark:text-rose-400 flex-shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Are you sure you want to sign out?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                You will need to sign in again with your authorized student account ({user?.google_email || user?.usn}) to view your marks and attendance.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-[#222228]">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSignOutModalOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleConfirmSignOut}
              leftIcon={<LogOut className="w-3.5 h-3.5" />}
              className="text-xs"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </Modal>

      {/* Contact Admin Modal */}
      <Modal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        title="Contact Administrator"
        maxWidth="sm"
      >
        <div className="p-4 sm:p-6 space-y-4">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#14141B] border border-slate-200 dark:border-[#22222A] space-y-2">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Admin Email
            </span>
            <div className="flex items-center justify-between gap-2">
              <a
                href={APP_CONFIG.adminContactUrl}
                className="font-mono text-xs sm:text-sm font-bold text-[#8048A8] dark:text-[#D1A7FF] hover:underline truncate"
              >
                {APP_CONFIG.adminEmail}
              </a>
              <button
                type="button"
                onClick={handleCopyEmail}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-[#2A2A34] text-xs font-medium hover:bg-white dark:hover:bg-[#1E1E26] text-slate-700 dark:text-slate-200 transition-colors flex-shrink-0"
                title="Copy email to clipboard"
              >
                {copiedEmail ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-emerald-500 font-semibold text-[11px]">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span className="text-[11px]">Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2.5 pt-2 border-t border-slate-100 dark:border-[#222228]">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsContactModalOpen(false)}
              className="text-xs"
            >
              Close
            </Button>
            <a
              href={APP_CONFIG.adminContactUrl}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#8048A8] hover:bg-[#713b97] text-white shadow-sm transition-colors"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Redirect to Email</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </a>
          </div>
        </div>
      </Modal>

      {/* Request Data Update Modal */}
      <Modal
        isOpen={isRequestModalOpen}
        onClose={() => {
          if (!isSubmittingRequest) {
            setIsRequestModalOpen(false);
            setRequestSuccess(false);
          }
        }}
        title="Request Record Correction"
        maxWidth="md"
      >
        <div className="p-4 sm:p-6 space-y-4">
          {requestSuccess ? (
            <div className="py-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Correction Request Submitted!
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                Your request has been dispatched to the institutional administration. You can monitor the review status on your academic profile once processed.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmitChangeRequest} className="space-y-4">
              {/* Student identification badge */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#14141B] border border-slate-200 dark:border-[#22222A] flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block truncate max-w-[200px]">
                    {user?.name}
                  </span>
                  <span className="font-mono text-[11px] text-slate-400">{user?.usn}</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#8048A8]/15 text-[#8048A8] dark:text-[#D1A7FF] border border-[#8048A8]/30">
                  Enrolled Student
                </span>
              </div>

              {/* Field to update */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Information to Update / Correct
                </label>
                <select
                  value={fieldName}
                  onChange={(e) => setFieldName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#2A2A34] bg-white dark:bg-[#121216] text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#8048A8]"
                >
                  <option value="Personal Details">Personal Details</option>
                  <option value="Marks">Marks</option>
                  <option value="Attendance">Attendance</option>
                </select>
              </div>

              {/* Old Value */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Current / Old Value (optional)
                </label>
                <input
                  type="text"
                  value={oldValue}
                  onChange={(e) => setOldValue(e.target.value)}
                  placeholder="e.g. Current marks, attendance %, or personal detail"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#2A2A34] bg-white dark:bg-[#121216] text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#8048A8]"
                />
              </div>

              {/* New Value */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  New Value Requested <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder="e.g. Corrected marks, attendance %, or updated detail"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#2A2A34] bg-white dark:bg-[#121216] text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#8048A8]"
                />
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Reason for Update / Document Reference (optional)
                </label>
                <textarea
                  rows={2}
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  placeholder="e.g. Marksheet discrepancy, attendance recalculation, or contact change"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#2A2A34] bg-white dark:bg-[#121216] text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#8048A8] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-[#222228]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsRequestModalOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmittingRequest || !newValue.trim()}
                  className="text-xs bg-[#8048A8] hover:bg-[#6f3796] text-white"
                >
                  {isSubmittingRequest ? 'Submitting...' : 'Submit Request'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </Modal>

    </div>
  );
};

export default SettingsPage;
