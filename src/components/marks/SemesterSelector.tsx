import React from 'react';

export interface SemesterSelectorProps {
  currentSemester: number;
  availableSemesters?: number[];
  onSelectSemester: (sem: number) => void;
  badgeText?: string;
  label?: string;
  className?: string;
}

export const SemesterSelector: React.FC<SemesterSelectorProps> = ({
  currentSemester,
  availableSemesters = [1, 2, 3],
  onSelectSemester,
  badgeText,
  label = 'Select Semester',
  className = '',
}) => {
  // Only display semesters where data is available (default to 1, 2, 3)
  const displaySemesters =
    availableSemesters && availableSemesters.length > 0
      ? availableSemesters
      : [1, 2, 3];

  return (
    <div
      className={`rounded-2xl border border-slate-200/90 dark:border-[#222228] bg-white/95 dark:bg-[#0A0A0E]/95 p-3.5 sm:p-5 shadow-card dark:shadow-card-dark backdrop-blur-md transition-all ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left: Label + Optional Badge */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {label}
          </span>
          {badgeText && (
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-[#1A1A22] text-slate-600 dark:text-slate-300 font-medium whitespace-nowrap">
              {badgeText}
            </span>
          )}
        </div>

        {/* Right: Semester Pills (Sem 1, Sem 2, Sem 3) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar p-1 rounded-xl bg-slate-100/90 dark:bg-[#14141A] border border-slate-200/80 dark:border-[#242430]">
          {displaySemesters.map((sem) => {
            const isSelected = currentSemester === sem;
            return (
              <button
                key={sem}
                type="button"
                onClick={() => onSelectSemester(sem)}
                className={`flex-1 sm:flex-initial px-4 py-1.5 min-h-[36px] rounded-lg text-xs font-semibold transition-all duration-200 ease-out touch-manipulation whitespace-nowrap active:scale-95 ${
                  isSelected
                     ? 'bg-slate-900 text-white dark:bg-white dark:text-black shadow-sm ring-1 ring-slate-400 dark:ring-white/20 scale-[1.02]'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-[#1C1C24] hover:shadow-xs'
                }`}
                title={`Semester ${sem}`}
              >
                Semester {sem}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
