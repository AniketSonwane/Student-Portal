import React from 'react';
import { Award, CheckCircle2, XCircle, Clock, GraduationCap, Sparkles } from 'lucide-react';
import { SemesterSummary } from '../../types/marks';
import { Card } from '../ui/Card';

interface MarksSummaryProps {
  summary: SemesterSummary;
  studentName: string;
  usn: string;
  semester: number;
}

export const MarksSummary: React.FC<MarksSummaryProps> = ({
  summary,
  studentName,
  usn,
  semester,
}) => {
  const isNumericSgpa = !isNaN(parseFloat(summary.sgpa)) && isFinite(Number(summary.sgpa));
  const statusUpper = summary.status.toUpperCase();
  const isPass = statusUpper === 'PASS';
  const isEnrolled = statusUpper === 'ENROLLED' || statusUpper.includes('ENROLL') || statusUpper.includes('PROGRESS');

  return (
    <Card className="relative overflow-hidden border border-slate-200 dark:border-[#222228] p-4 sm:p-7 bg-white/95 dark:bg-[#0A0A0E] shadow-card dark:shadow-card-dark">
      {/* Subtle highlight gradient border at top */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#8048A8] to-[#F8D299] opacity-80" />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6">
        {/* Left: Student & Semester details */}
        <div className="space-y-1 sm:space-y-1.5 min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-slate-100 dark:bg-[#16161B] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-[#272730] flex items-center gap-1 sm:gap-1.5">
              <GraduationCap className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#8048A8] dark:text-[#D1A7FF]" />
              Semester {semester}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 dark:text-white truncate sm:whitespace-nowrap">
            {studentName}
          </h2>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-3 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
            <span>USN: <strong className="font-mono text-slate-800 dark:text-slate-200">{usn}</strong></span>
          </div>
        </div>

        {/* Right: Key Academic Metrics in a responsive 4-column glance grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 flex-shrink-0 w-full lg:w-auto">
          {/* SGPA Metric Card */}
          <div className="p-2 sm:px-3 sm:py-2.5 rounded-xl bg-slate-50 dark:bg-[#121217] border border-slate-200 dark:border-[#222228] flex flex-col sm:flex-row items-center gap-1.5 sm:gap-2.5 text-center sm:text-left min-w-[85px] sm:min-w-[115px] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-md hover:border-[#8048A8]/40 dark:hover:border-[#8048A8]/50 cursor-default select-none group">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-900 dark:bg-[#181820] text-[#F8D299] flex items-center justify-center border border-slate-700/50 dark:border-[#8048A8]/40 flex-shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:border-[#8048A8]">
              <Award className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] sm:text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
                SGPA
              </p>
              {isNumericSgpa ? (
                <div className="flex items-baseline justify-center sm:justify-start gap-0.5">
                  <span className="text-base sm:text-lg font-bold font-mono text-slate-900 dark:text-white group-hover:text-[#8048A8] dark:group-hover:text-[#D1A7FF] transition-colors">
                    {summary.sgpa}
                  </span>
                  <span className="text-[8px] sm:text-[9px] text-slate-400">/10</span>
                </div>
              ) : (
                <div className="flex items-center justify-center sm:justify-start">
                  <span className="text-xs sm:text-sm font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                    {summary.sgpa}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Total Course Credits */}
          <div className="p-2 sm:px-3 sm:py-2.5 rounded-xl bg-slate-50 dark:bg-[#121217] border border-slate-200 dark:border-[#222228] flex flex-col sm:flex-row items-center gap-1.5 sm:gap-2.5 text-center sm:text-left min-w-[85px] sm:min-w-[115px] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-md hover:border-[#8048A8]/40 dark:hover:border-[#8048A8]/50 cursor-default select-none group">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-200/70 dark:bg-[#181820] text-slate-700 dark:text-slate-200 flex items-center justify-center border border-slate-300 dark:border-[#2A2A32] flex-shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:border-[#8048A8]">
              <span className="text-[9px] sm:text-[11px] font-bold font-mono">CR</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] sm:text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate" title="Total Course Credits">
                Credits
              </p>
              <span className="text-base sm:text-lg font-bold font-mono text-slate-900 dark:text-white block group-hover:text-[#8048A8] dark:group-hover:text-[#D1A7FF] transition-colors truncate">
                {summary.totalCredits}
              </span>
            </div>
          </div>

          {/* Total Credit Grade Points */}
          <div className="p-2 sm:px-3 sm:py-2.5 rounded-xl bg-slate-50 dark:bg-[#121217] border border-slate-200 dark:border-[#222228] flex flex-col sm:flex-row items-center gap-1.5 sm:gap-2.5 text-center sm:text-left min-w-[85px] sm:min-w-[115px] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-md hover:border-[#8048A8]/40 dark:hover:border-[#8048A8]/50 cursor-default select-none group">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#8048A8]/10 text-[#8048A8] dark:text-[#D1A7FF] flex items-center justify-center border border-[#8048A8]/25 flex-shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:border-[#8048A8]">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] sm:text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate" title="Total Credit Grade Points (∑ Credits × Grade Points)">
                Grade Pts
              </p>
              <span className="text-base sm:text-lg font-bold font-mono text-slate-900 dark:text-white block group-hover:text-[#8048A8] dark:group-hover:text-[#D1A7FF] transition-colors truncate">
                {summary.totalGradePoints || '-'}
              </span>
            </div>
          </div>

          {/* Academic Standing */}
          <div className="p-2 sm:px-3 sm:py-2.5 rounded-xl bg-slate-50 dark:bg-[#121217] border border-slate-200 dark:border-[#222228] flex flex-col sm:flex-row items-center gap-1.5 sm:gap-2.5 text-center sm:text-left min-w-[85px] sm:min-w-[115px] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-md hover:border-[#8048A8]/40 dark:hover:border-[#8048A8]/50 cursor-default select-none group">
            <div
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center border flex-shrink-0 transition-transform duration-300 group-hover:scale-110 ${
                isPass
                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                  : isEnrolled
                  ? 'bg-sky-500/10 text-sky-500 border-sky-500/30'
                  : 'bg-rose-500/10 text-rose-500 border-rose-500/30'
              }`}
            >
              {isPass ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              ) : isEnrolled ? (
                <Clock className="w-3.5 h-3.5 text-sky-500" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-rose-500" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] sm:text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
                Status
              </p>
              <span
                className={`text-xs sm:text-sm font-bold truncate block ${
                  isPass
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : isEnrolled
                    ? 'text-sky-600 dark:text-sky-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {summary.status}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
