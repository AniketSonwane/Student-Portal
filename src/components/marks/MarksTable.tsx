import React, { useState } from 'react';
import {
  ChevronDown,
  BookOpen,
  FlaskConical,
  Sparkles,
  Info
} from 'lucide-react';
import { SubjectMarks } from '../../types/marks';

interface MarksTableProps {
  subjects: SubjectMarks[];
  searchQuery?: string;
  onClearSearch?: () => void;
  activeSubjectCode?: string | null;
}

export const MarksTable: React.FC<MarksTableProps> = ({
  subjects,
  searchQuery = '',
  onClearSearch,
  activeSubjectCode,
}) => {
  const [filterType, setFilterType] = useState<'All' | 'Theory' | 'Practical' | 'Activity'>('All');
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});


  // When activeSubjectCode is triggered from top-nav search, auto-expand and scroll to it
  React.useEffect(() => {
    if (activeSubjectCode) {
      setExpandedSubjects((prev) => ({
        ...prev,
        [activeSubjectCode]: true,
      }));
      setTimeout(() => {
        const el = document.getElementById(`subject-card-${activeSubjectCode}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  }, [activeSubjectCode]);

  const toggleSubject = (code: string) => {
    setExpandedSubjects((prev) => ({
      ...prev,
      [code]: !prev[code],
    }));
  };

  const expandAll = () => {
    const next: Record<string, boolean> = {};
    subjects.forEach((s) => (next[s.code] = true));
    setExpandedSubjects(next);
  };

  const collapseAll = () => {
    setExpandedSubjects({});
  };

  // Filter subjects by top-nav search and type
  const queryTrimmed = searchQuery.trim().toLowerCase();
  const filteredSubjects = subjects.filter((subject) => {
    const matchesType = filterType === 'All' || subject.type === filterType;
    const matchesSearch =
      !queryTrimmed ||
      subject.code.toLowerCase().includes(queryTrimmed) ||
      subject.name.toLowerCase().includes(queryTrimmed);
    return matchesType && matchesSearch;
  });

  const getGradeStyle = (grade: string) => {
    const g = grade.trim().toUpperCase();
    switch (g) {
      case 'O':
        return 'bg-amber-400/10 text-amber-500 dark:text-[#F8D299] border-amber-400/30';
      case 'A+':
      case 'A':
        return 'bg-[#8048A8]/10 text-[#8048A8] dark:text-[#D1A7FF] border-[#8048A8]/30';
      case 'B+':
      case 'B':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30';
      case 'C':
        return 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-400/30';
      case 'F':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30';
      case 'P':
      case 'PASS':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
      default:
        return 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-zinc-700';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Theory':
        return <BookOpen className="w-3.5 h-3.5" />;
      case 'Practical':
        return <FlaskConical className="w-3.5 h-3.5" />;
      default:
        return <Sparkles className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-xl bg-white/90 dark:bg-[#0C0C10] border border-slate-200 dark:border-[#222228] shadow-sm">
        {/* Filter Type Pills - Horizontal swipe on mobile */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 sm:pb-0 touch-pan-x">
          {(['All', 'Theory', 'Practical', 'Activity'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setFilterType(type)}
              className={`flex-shrink-0 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 touch-manipulation hover:scale-105 active:scale-95 ${
                filterType === type
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-black shadow-xs ring-1 ring-slate-900/20'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1A1A22] active:bg-slate-200 dark:active:bg-[#22222C]'
              }`}
            >
              {type === 'All' ? 'All' : type}
              <span className="ml-1 text-[10px] opacity-70">
                ({type === 'All' ? subjects.length : subjects.filter((s) => s.type === type).length})
              </span>
            </button>
          ))}
        </div>

        {/* Right: Active Search Filter Tag + Expand / Collapse Actions */}
        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3">
          {queryTrimmed && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] bg-[#8048A8]/10 text-[#8048A8] dark:text-[#D1A7FF] border border-[#8048A8]/30 max-w-[180px] sm:max-w-none truncate animate-fade-in">
              <span className="truncate">Filter: <strong>{searchQuery}</strong></span>
              {onClearSearch && (
                <button
                  type="button"
                  onClick={onClearSearch}
                  className="hover:text-white hover:bg-[#8048A8] rounded-full w-3.5 h-3.5 inline-flex items-center justify-center text-[10px] flex-shrink-0 font-bold"
                  title="Clear search filter"
                >
                  ✕
                </button>
              )}
            </div>
          )}

          <div className="flex items-center gap-1 text-xs flex-shrink-0">
            <button
              type="button"
              onClick={expandAll}
              className="px-2.5 py-1.5 text-[11px] font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white touch-manipulation rounded-md active:bg-slate-100 dark:active:bg-zinc-800 hover:scale-105 active:scale-95 transition-all duration-200"
            >
              Expand
            </button>
            <span className="text-slate-300 dark:text-zinc-700">|</span>
            <button
              type="button"
              onClick={collapseAll}
              className="px-2.5 py-1.5 text-[11px] font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white touch-manipulation rounded-md active:bg-slate-100 dark:active:bg-zinc-800 hover:scale-105 active:scale-95 transition-all duration-200"
            >
              Collapse
            </button>
          </div>
        </div>
      </div>

      {/* Subjects Cards List with Select & Hover Animations */}
      <div className="space-y-2.5 sm:space-y-3">
        {filteredSubjects.length === 0 && (
          <div className="p-8 text-center rounded-xl bg-white/90 dark:bg-[#0C0C10] border border-slate-200 dark:border-[#222228]">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No courses matching "{searchQuery}"
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Try searching a course code (e.g. SDDE, PPS, AP) or course name
            </p>
            {onClearSearch && (
              <button
                type="button"
                onClick={onClearSearch}
                className="mt-3 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#8048A8] text-white hover:bg-[#6f3d93] transition-colors"
              >
                Clear Search
              </button>
            )}
          </div>
        )}

        {filteredSubjects.map((subject) => {
          const isExpanded = !!expandedSubjects[subject.code];
          const isInc = subject.code === 'INC' || subject.code === 'INCENTIVES';
          const effectiveGrade = isInc
            ? (subject.grade && subject.grade !== '-' && subject.grade !== '0' && subject.grade !== 'F' ? subject.grade : 'PASS')
            : subject.grade;
          const numericTotal = parseFloat(subject.total) || 0;
          const percentage = Math.min(100, Math.round((numericTotal / subject.maxTotal) * 100));

          return (
            <div
              key={subject.code}
              id={`subject-card-${subject.code}`}
              className={`rounded-xl border transition-all duration-300 ease-out overflow-hidden ${
                isExpanded
                  ? 'border-[#8048A8] dark:border-[#8048A8] shadow-md dark:shadow-[0_8px_25px_-5px_rgba(128,72,168,0.25)] ring-1 sm:ring-2 ring-[#8048A8]/30 dark:ring-[#8048A8]/40 bg-white dark:bg-[#0A0A0E] animate-select-pulse'
                  : 'border-slate-200 dark:border-[#222228] bg-white/95 dark:bg-[#0A0A0E] shadow-2xs hover:border-[#8048A8]/50 dark:hover:border-[#8048A8]/60 hover:-translate-y-1 hover:shadow-lg dark:hover:shadow-[0_12px_28px_-6px_rgba(0,0,0,0.7)]'
              }`}
            >
              {/* Card Header Row (Clickable) */}
              <div
                onClick={() => toggleSubject(subject.code)}
                className={`p-3.5 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 cursor-pointer select-none group touch-manipulation transition-all duration-200 active:scale-[0.99] ${
                  isExpanded
                    ? 'bg-[#8048A8]/[0.025] dark:bg-[#8048A8]/[0.06]'
                    : 'hover:bg-slate-50/60 dark:hover:bg-[#121217]'
                }`}
              >
                <div className="flex items-start sm:items-center gap-2.5 sm:gap-3.5 min-w-0">
                  {/* Subject Code badge with safe width for INCENTIVES */}
                  <div
                    className={`min-w-[3.25rem] px-1.5 py-1 sm:w-14 sm:h-12 rounded-lg border flex flex-col items-center justify-center flex-shrink-0 transition-all duration-300 ${
                      isExpanded
                        ? 'bg-[#8048A8]/10 dark:bg-[#8048A8]/20 border-[#8048A8] shadow-xs scale-105'
                        : 'bg-slate-100 dark:bg-[#15151B] border-slate-200 dark:border-[#272730] group-hover:border-[#8048A8] group-hover:bg-[#8048A8]/5 dark:group-hover:bg-[#8048A8]/10 group-hover:scale-105'
                    }`}
                  >
                    <span
                      className={`text-[11px] sm:text-xs font-bold font-mono uppercase transition-colors duration-200 ${
                        isExpanded ? 'text-[#8048A8] dark:text-[#D1A7FF]' : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {subject.code === 'INCENTIVES' ? 'INC' : subject.code}
                    </span>
                    <span className="text-[8px] sm:text-[9px] text-slate-400 uppercase">
                      Max {subject.maxTotal}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs sm:text-base font-bold text-slate-900 dark:text-white group-hover:text-[#8048A8] dark:group-hover:text-[#D1A7FF] transition-colors line-clamp-2 leading-snug">
                        {subject.name}
                      </span>
                      {['WFBFD', 'WFBFDL', 'DEFM', 'DEFML', 'BE', 'BA'].includes(subject.code) && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold bg-purple-500/10 text-purple-700 dark:text-[#D1A7FF] border border-purple-500/30 flex-shrink-0">
                          <Sparkles className="w-2.5 h-2.5 text-purple-500 dark:text-[#D1A7FF]" />
                          {subject.code.endsWith('L') ? 'MDM Lab' : 'MDM Course'}
                        </span>
                      )}
                      {['DCD', 'EST', 'EDP', 'SPS'].includes(subject.code) && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 flex-shrink-0">
                          Open Elective
                        </span>
                      )}
                      {subject.code === 'NPTEL' && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex-shrink-0">
                          NPTEL
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-semibold bg-slate-100 dark:bg-[#16161C] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#26262E] flex-shrink-0 group-hover:border-slate-300 dark:group-hover:border-[#383842] transition-colors">
                        {getTypeIcon(subject.type)}
                        {subject.type}
                      </span>
                      {subject.credits && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-semibold bg-[#8048A8]/10 text-[#8048A8] dark:text-[#D1A7FF] border border-[#8048A8]/20 flex-shrink-0">
                          {subject.credits} {Number(subject.credits) === 1 ? 'Credit' : 'Credits'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Scores & Grade Badge */}
                <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-5 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-zinc-800/60">
                  <div className="text-left sm:text-right">
                    <div className="text-[10px] sm:text-xs font-semibold text-slate-400">
                      Score
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg sm:text-xl font-bold font-mono text-slate-900 dark:text-white group-hover:text-[#8048A8] dark:group-hover:text-[#D1A7FF] transition-colors">
                        {subject.total}
                      </span>
                      <span className="text-[10px] sm:text-xs text-slate-400 font-mono">
                        / {subject.maxTotal}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3">
                    <span
                      className={`px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-lg text-xs sm:text-sm font-bold border font-mono transition-transform duration-200 group-hover:scale-105 ${getGradeStyle(
                        effectiveGrade
                      )}`}
                    >
                      {effectiveGrade}
                    </span>

                    <button
                      type="button"
                      aria-label="Toggle assessment details"
                      className="p-1 rounded-lg text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors"
                    >
                      <ChevronDown
                        className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-300 ease-out ${
                          isExpanded
                            ? 'rotate-180 text-[#8048A8] dark:text-[#D1A7FF]'
                            : 'rotate-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded Assessment Details Breakdown */}
              {isExpanded && (
                <div className="p-3.5 sm:p-5 bg-slate-50/70 dark:bg-[#0F0F14] border-t border-slate-100 dark:border-[#1E1E26] animate-fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2.5 sm:mb-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-[#8048A8] dark:text-[#D1A7FF]" />
                      Assessment Breakdown ({subject.code})
                    </h4>
                    <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium">
                      {numericTotal > 0
                        ? `Performance: ${percentage}% of Max Marks`
                        : effectiveGrade === 'PASS' || effectiveGrade === 'P'
                        ? 'Status: Passed Course'
                        : 'Status: In Progress'}
                    </span>
                  </div>

                  {/* Assessment Grid with micro-hover animations */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 sm:gap-2.5">
                    {subject.assessments.map((assessment, idx) => {
                      const scoreNum = parseFloat(assessment.score) || 0;
                      const isLow = scoreNum === 0 && assessment.score !== '-';

                      return (
                        <div
                          key={idx}
                          className="p-2.5 sm:p-3 rounded-lg bg-white dark:bg-[#16161D] border border-slate-200/80 dark:border-[#24242D] shadow-2xs hover:-translate-y-0.5 hover:border-[#8048A8]/50 hover:shadow-xs transition-all duration-200 cursor-default select-none group/item"
                        >
                          <p className="text-[10px] font-semibold text-slate-400 group-hover/item:text-[#8048A8] dark:group-hover/item:text-[#D1A7FF] transition-colors truncate" title={assessment.name}>
                            {assessment.name}
                          </p>
                          <div className="flex items-baseline justify-between mt-1">
                            <span
                              className={`text-xs sm:text-sm font-bold font-mono transition-transform duration-200 group-hover/item:scale-105 ${
                                isLow ? 'text-rose-500' : 'text-slate-900 dark:text-white'
                              }`}
                            >
                              {assessment.score}
                            </span>
                            <span className="text-[9px] sm:text-[10px] text-slate-400 font-mono">
                              / {assessment.max}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Summary note below breakdown */}
                  {(subject.credits || subject.creditPoints) && (
                    <div className="mt-2.5 sm:mt-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60 dark:border-zinc-800/60 flex items-center justify-end text-[11px] text-slate-500 dark:text-slate-400 gap-2 font-mono">
                      {subject.credits && (
                        <span>
                          Credits: <strong className="text-slate-700 dark:text-slate-200">{subject.credits}</strong>
                        </span>
                      )}
                      {subject.credits && subject.creditPoints && <span>•</span>}
                      {subject.creditPoints && (
                        <span>
                          Credit Points Earned: <strong className="text-slate-700 dark:text-slate-200">{subject.creditPoints}</strong>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filteredSubjects.length === 0 && (
          <div className="p-8 text-center rounded-xl bg-white dark:bg-[#0A0A0E] border border-slate-200 dark:border-[#222228] text-slate-500">
            No subjects matched your filter or search query.
          </div>
        )}
      </div>
    </div>
  );
};
