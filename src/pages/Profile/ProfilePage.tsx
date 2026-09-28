import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Calendar,
  MapPin,
  Tag,
  Droplet,
  Mail,
  Phone,
  Globe,
  Github,
  Linkedin,
  ExternalLink,
  Check,
  Copy
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { ThemeToggle } from '../../components/common/ThemeToggle';
import { Button } from '../../components/ui/Button';
import { LoadingState } from '../../components/common/LoadingState';
import { ROUTES } from '../../utils/constants';
import { profileService } from '../../services/profile';

// Helper utilities for Profile data handling
const hasValidValue = (val?: string | number | null): boolean => {
  if (val === undefined || val === null) return false;
  const str = String(val).trim();
  return (
    str !== '' &&
    str !== 'NA' &&
    str !== 'N/A' &&
    str !== '-' &&
    str !== 'undefined' &&
    str !== 'null'
  );
};

const displayValue = (val?: string | number | null, suffix?: string): string => {
  if (!hasValidValue(val)) return 'NA';
  return suffix ? `${val} ${suffix}` : String(val);
};

const formatUrl = (url: string) => {
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `https://${url}`;
};

export const ProfilePage: React.FC = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);

  // Fetch live student profile directly from Google Sheet silently in the background
  useEffect(() => {
    let isMounted = true;
    const syncFromGoogleSheets = async () => {
      if (!user?.usn) {
        setIsLoading(false);
        return;
      }
      try {
        // Enforce a smooth 350ms transition window to prevent jarring micro-flashes
        const [liveStudent] = await Promise.all([
          profileService.getStudentByUsn(user.usn, true),
          new Promise((resolve) => setTimeout(resolve, 350)),
        ]);
        if (liveStudent && isMounted) {
          if (user?.profile_image && !liveStudent.profile_image) {
            liveStudent.profile_image = user.profile_image;
          }
          updateUser(liveStudent);
        }
      } catch (err) {
        console.warn('Could not sync profile directly from Google Sheet:', err);
      } finally {
        if (isMounted) {
          setIsFadingOut(true);
          setTimeout(() => {
            if (isMounted) {
              setIsLoading(false);
              setIsFadingOut(false);
            }
          }, 180);
        }
      }
    };

    syncFromGoogleSheets();
    return () => {
      isMounted = false;
    };
  }, [user?.usn]);

  // State for copy feedback
  const [copiedField, setCopiedField] = useState<string | null>(null);


  const copyToClipboard = (text: string, fieldName: string) => {
    if (!hasValidValue(text)) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="min-h-screen bg-transparent text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-[#000000]/95 backdrop-blur-md border-b border-slate-200 dark:border-[#222228] px-3 sm:px-8 py-2.5 sm:py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          {/* Left: Back to Dashboard */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(ROUTES.DASHBOARD)}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
              className="hidden sm:inline-flex px-2.5 sm:px-3 text-xs flex-shrink-0 min-h-[36px]"
            >
              <span>Dashboard</span>
            </Button>
            <div className="hidden sm:block h-4 w-px bg-slate-200 dark:bg-zinc-800" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-900 dark:bg-[#16161B] border border-slate-700/50 dark:border-[#8048A8]/40 flex items-center justify-center text-[#F8D299] shadow-sm">
                <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <h1 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-tight">
                Student Profile
              </h1>
            </div>
          </div>

          {/* Right: Theme Toggle */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Profile Content Layout */}
      <main className="max-w-4xl mx-auto px-3 sm:px-8 py-4 sm:py-8 pb-24 sm:pb-8">
        {isLoading ? (
          <div
            className={`bg-white/80 dark:bg-[#0E0E14]/80 backdrop-blur-xl rounded-3xl border border-slate-200 dark:border-[#1F1F28] p-12 text-center shadow-lg ${
              isFadingOut ? 'animate-fade-out' : 'animate-fade-in'
            }`}
          >
            <LoadingState message="Fetching live student profile from server..." />
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-5">
            {/* ROW 1: User Image + Name, Age, USN Card */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 sm:gap-4 items-stretch animate-card-slide-1">
              {/* User Image Box */}
              <div className="sm:col-span-4 bg-white/95 dark:bg-[#0A0A0E] border border-slate-200 dark:border-[#222228] rounded-2xl p-5 flex flex-col items-center justify-center text-center shadow-card dark:shadow-card-dark relative group overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#8048A8] to-[#F8D299] opacity-80" />
                <div className="relative flex-shrink-0">
                  {user?.profile_image ? (
                    <img
                      src={user.profile_image}
                      alt={user.name}
                      referrerPolicy="no-referrer"
                      className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-2 border-slate-300 dark:border-zinc-700 shadow-lg"
                    />
                  ) : (
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 text-[#F8D299] font-bold text-4xl sm:text-5xl flex items-center justify-center shadow-lg border border-slate-700">
                      {user?.name ? user.name.charAt(0) : 'A'}
                    </div>
                  )}
                </div>
              </div>

              {/* Name, Age, USN Card */}
              <div className="sm:col-span-8 bg-white/95 dark:bg-[#0A0A0E] border border-slate-200 dark:border-[#222228] rounded-2xl p-5 sm:p-6 shadow-card dark:shadow-card-dark flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#8048A8] to-[#F8D299] opacity-80" />

                <div className="space-y-3">
                  {/* Name */}
                  <div>
                    <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block mb-0.5">
                      Name
                    </span>
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                      {displayValue(user?.name)}
                    </h2>
                  </div>

                  {/* Age, USN & CGPA Row */}
                  <div className="grid grid-cols-3 gap-3 pt-1 border-t border-slate-100 dark:border-[#1E1E26]">
                    <div>
                      <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block mb-0.5">
                        Age
                      </span>
                      <p className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 font-mono">
                        {displayValue(user?.age)} {hasValidValue(user?.age) && <span className="text-xs font-normal text-slate-500">Yrs</span>}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block mb-0.5">
                        USN
                      </span>
                      <p className="text-base sm:text-lg font-bold text-[#8048A8] dark:text-[#D1A7FF] font-mono tracking-wider">
                        {displayValue(user?.usn)}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block mb-0.5">
                        CGPA
                      </span>
                      <p className="text-base sm:text-lg font-bold text-[#F8D299] font-mono">
                        {hasValidValue(user?.cgpa) ? user?.cgpa : 'NA'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-3 flex items-center justify-end text-[11px] text-slate-500 dark:text-zinc-400">
                  <span>{displayValue(user?.college_year)} • Sem {displayValue(user?.current_semester)}</span>
                </div>
              </div>
            </div>

            {/* ROW 2: DOB, POB, Category, Blood Group Card */}
            <div className="bg-white/95 dark:bg-[#0A0A0E] border border-slate-200 dark:border-[#222228] rounded-2xl p-5 sm:p-6 shadow-card dark:shadow-card-dark relative overflow-hidden animate-card-slide-2">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#8048A8] to-transparent opacity-80" />

              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#8048A8] dark:text-[#D1A7FF]" />
                  Personal & Demographic Details
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4">
                {/* DOB */}
                <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50 dark:bg-[#121217] border border-slate-200/80 dark:border-[#222228] hover:border-[#8048A8]/40 transition-colors">
                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-zinc-400 mb-1">
                    <Calendar className="w-3.5 h-3.5 text-[#8048A8] dark:text-[#D1A7FF]" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider">DOB</span>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                    {displayValue(user?.dob)}
                  </p>
                  <span className="text-[10px] text-slate-400">Date of Birth</span>
                </div>

                {/* POB / Address */}
                <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50 dark:bg-[#121217] border border-slate-200/80 dark:border-[#222228] hover:border-[#8048A8]/40 transition-colors">
                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-zinc-400 mb-1">
                    <MapPin className="w-3.5 h-3.5 text-[#F8D299]" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider">POB / Address</span>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                    {displayValue(user?.pob || user?.address)}
                  </p>
                  <span className="text-[10px] text-slate-400">Place of Birth / City</span>
                </div>

                {/* Category */}
                <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50 dark:bg-[#121217] border border-slate-200/80 dark:border-[#222228] hover:border-[#8048A8]/40 transition-colors">
                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-zinc-400 mb-1">
                    <Tag className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider">Category</span>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                    {displayValue(user?.category)}
                  </p>
                  <span className="text-[10px] text-slate-400">Admission Quota</span>
                </div>

                {/* Blood Group */}
                <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50 dark:bg-[#121217] border border-slate-200/80 dark:border-[#222228] hover:border-[#8048A8]/40 transition-colors">
                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-zinc-400 mb-1">
                    <Droplet className="w-3.5 h-3.5 text-rose-500" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider">Blood Group</span>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-rose-600 dark:text-rose-400 font-mono">
                    {displayValue(user?.blood_group)}
                  </p>
                  <span className="text-[10px] text-slate-400">Medical Record</span>
                </div>
              </div>
            </div>

            {/* ROW 3: College Mail, Personal Mail, Phone, Socials Card */}
            <div className="bg-white/95 dark:bg-[#0A0A0E] border border-slate-200 dark:border-[#222228] rounded-2xl p-5 sm:p-6 shadow-card dark:shadow-card-dark relative overflow-hidden animate-card-slide-3">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#8048A8] to-transparent opacity-80" />

              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#8048A8] dark:text-[#D1A7FF]" />
                  Contact Channels & Online Profiles
                </span>
              </div>

              {/* Contact List */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4 mb-4">
                {/* College Mail */}
                <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50 dark:bg-[#121217] border border-slate-200/80 dark:border-[#222228] flex flex-col justify-between group">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1">
                      <Mail className="w-3 h-3 text-[#8048A8] dark:text-[#D1A7FF]" />
                      College Mail
                    </span>
                    {hasValidValue(user?.college_email || user?.google_email) && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(user?.college_email || user?.google_email || '', 'college_email')}
                        className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                        title="Copy college email"
                      >
                        {copiedField === 'college_email' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 font-mono truncate" title={user?.college_email || user?.google_email}>
                    {displayValue(user?.college_email || user?.google_email)}
                  </p>
                </div>

                {/* Personal Mail */}
                <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50 dark:bg-[#121217] border border-slate-200/80 dark:border-[#222228] flex flex-col justify-between group">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1">
                      <Mail className="w-3 h-3 text-sky-500" />
                      Personal Mail
                    </span>
                    {hasValidValue(user?.personal_email) && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(user?.personal_email || '', 'personal_email')}
                        className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                        title="Copy personal email"
                      >
                        {copiedField === 'personal_email' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 font-mono truncate" title={user?.personal_email}>
                    {displayValue(user?.personal_email)}
                  </p>
                </div>

                {/* Phone Number */}
                <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50 dark:bg-[#121217] border border-slate-200/80 dark:border-[#222228] flex flex-col justify-between group">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-emerald-500" />
                      Phone Number
                    </span>
                    {hasValidValue(user?.phone) && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(user?.phone || '', 'phone')}
                        className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                        title="Copy phone number"
                      >
                        {copiedField === 'phone' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 font-mono truncate">
                    {displayValue(user?.phone)}
                  </p>
                </div>
              </div>

              {/* Socials Row */}
              <div className="pt-3 border-t border-slate-100 dark:border-[#1E1E26] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-[#F8D299]" />
                  Socials & Developer Handles
                </span>

                <div className="flex flex-wrap items-center gap-2">
                  {/* GitHub */}
                  {hasValidValue(user?.socials?.github) ? (
                    <a
                      href={formatUrl(user!.socials!.github!)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-[#15151C] hover:bg-slate-200 dark:hover:bg-[#1E1E28] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-[#272732] transition-all hover:scale-105"
                    >
                      <Github className="w-3.5 h-3.5" />
                      <span>GitHub</span>
                      <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                    </a>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100/70 dark:bg-[#14141A] text-slate-400 dark:text-zinc-500 border border-slate-200/60 dark:border-[#24242C] select-none">
                      <Github className="w-3.5 h-3.5 opacity-50" />
                      <span>GitHub:</span>
                      <strong className="font-mono text-slate-500 dark:text-zinc-400">NA</strong>
                    </div>
                  )}

                  {/* Instagram */}
                  {hasValidValue(user?.socials?.instagram) ? (
                    <a
                      href={formatUrl(user!.socials!.instagram!)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-pink-50 dark:bg-pink-950/40 hover:bg-pink-100 dark:hover:bg-pink-900/50 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-800/40 transition-all hover:scale-105"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                      </svg>
                      <span>Instagram</span>
                      <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                    </a>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100/70 dark:bg-[#14141A] text-slate-400 dark:text-zinc-500 border border-slate-200/60 dark:border-[#24242C] select-none">
                      <svg className="w-3.5 h-3.5 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                      </svg>
                      <span>Instagram:</span>
                      <strong className="font-mono text-slate-500 dark:text-zinc-400">NA</strong>
                    </div>
                  )}

                  {/* LeetCode */}
                  {hasValidValue(user?.socials?.leetcode) ? (
                    <a
                      href={formatUrl(user!.socials!.leetcode!)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40 transition-all hover:scale-105"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M13.483 0a1.374 1.374 0 0 0-.961.438L7.116 6.226l-3.854 4.126a5.266 5.266 0 0 0-1.209 2.104 5.35 5.35 0 0 0-.125.513 5.527 5.527 0 0 0 .062 2.362 5.83 5.83 0 0 0 .349 1.017 5.938 5.938 0 0 0 1.271 1.818l4.277 4.193.039.038c2.248 2.165 5.852 2.133 8.063-.074l2.396-2.392c.54-.54.54-1.414.003-1.955a1.378 1.378 0 0 0-1.951-.003l-2.396 2.392a3.021 3.021 0 0 1-4.205.038l-.02-.019-4.276-4.193c-.652-.64-.972-1.469-.948-2.263a2.68 2.68 0 0 1 .066-.523 2.545 2.545 0 0 1 .619-1.164L9.13 8.114c1.058-1.134 3.204-1.27 4.43-.278l3.501 2.831c.593.48 1.461.387 1.94-.207a1.384 1.384 0 0 0-.207-1.943L15.292 5.69 14.444.82A1.37 1.37 0 0 0 13.483 0zm4.846 12.023a1.38 1.38 0 0 0-1.38 1.382v.006a1.38 1.38 0 0 0 1.38 1.382h4.291a1.38 1.38 0 0 0 1.38-1.382v-.006a1.38 1.38 0 0 0-1.38-1.382z"/>
                      </svg>
                      <span>LeetCode</span>
                      <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                    </a>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100/70 dark:bg-[#14141A] text-slate-400 dark:text-zinc-500 border border-slate-200/60 dark:border-[#24242C] select-none">
                      <svg className="w-3.5 h-3.5 opacity-50" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M13.483 0a1.374 1.374 0 0 0-.961.438L7.116 6.226l-3.854 4.126a5.266 5.266 0 0 0-1.209 2.104 5.35 5.35 0 0 0-.125.513 5.527 5.527 0 0 0 .062 2.362 5.83 5.83 0 0 0 .349 1.017 5.938 5.938 0 0 0 1.271 1.818l4.277 4.193.039.038c2.248 2.165 5.852 2.133 8.063-.074l2.396-2.392c.54-.54.54-1.414.003-1.955a1.378 1.378 0 0 0-1.951-.003l-2.396 2.392a3.021 3.021 0 0 1-4.205.038l-.02-.019-4.276-4.193c-.652-.64-.972-1.469-.948-2.263a2.68 2.68 0 0 1 .066-.523 2.545 2.545 0 0 1 .619-1.164L9.13 8.114c1.058-1.134 3.204-1.27 4.43-.278l3.501 2.831c.593.48 1.461.387 1.94-.207a1.384 1.384 0 0 0-.207-1.943L15.292 5.69 14.444.82A1.37 1.37 0 0 0 13.483 0zm4.846 12.023a1.38 1.38 0 0 0-1.38 1.382v.006a1.38 1.38 0 0 0 1.38 1.382h4.291a1.38 1.38 0 0 0 1.38-1.382v-.006a1.38 1.38 0 0 0-1.38-1.382z"/>
                      </svg>
                      <span>LeetCode:</span>
                      <strong className="font-mono text-slate-500 dark:text-zinc-400">NA</strong>
                    </div>
                  )}

                  {/* LinkedIn */}
                  {hasValidValue(user?.socials?.linkedin) ? (
                    <a
                      href={formatUrl(user!.socials!.linkedin!)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/40 transition-all hover:scale-105"
                    >
                      <Linkedin className="w-3.5 h-3.5" />
                      <span>LinkedIn</span>
                      <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                    </a>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100/70 dark:bg-[#14141A] text-slate-400 dark:text-zinc-500 border border-slate-200/60 dark:border-[#24242C] select-none">
                      <Linkedin className="w-3.5 h-3.5 opacity-50" />
                      <span>LinkedIn:</span>
                      <strong className="font-mono text-slate-500 dark:text-zinc-400">NA</strong>
                    </div>
                  )}
                </div>
              </div>
            </div>

        </div>
        )}
      </main>
    </div>
  );
};
export default ProfilePage;
