import React from 'react';

interface SemesterSelectorProps {
  currentSemester: number;
  availableSemesters: number[];
  onSelectSemester: (sem: number) => void;
}

export const SemesterSelector: React.FC<SemesterSelectorProps> = ({
  currentSemester,
  availableSemesters,
  onSelectSemester,
}) => {
  // Only display semesters where marks are available
  const displaySemesters =
    availableSemesters && availableSemesters.length > 0
      ? availableSemesters
      : [1, 2, 3];

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 py-1 sm:py-2">
      <div className="flex items-center gap-2">
        <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
          Semester {currentSemester}
        </span>
      </div>

      {/* Horizontally scrollable pill bar on mobile - only shows available semesters */}
      <div className="w-full sm:w-auto overflow-x-auto no-scrollbar touch-scroll flex items-center gap-1 sm:gap-1.5 p-1 pr-2 rounded-xl bg-slate-100/90 dark:bg-[#121216] border border-slate-200 dark:border-[#222228] touch-pan-x">
        {displaySemesters.map((sem) => {
          const isSelected = currentSemester === sem;

          return (
            <button
              key={sem}
              type="button"
              onClick={() => onSelectSemester(sem)}
              className={`flex-shrink-0 px-3.5 py-1.5 min-h-[38px] rounded-lg text-xs font-semibold transition-all duration-200 touch-manipulation flex items-center justify-center ${
                isSelected
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-black shadow-sm ring-1 ring-slate-400 dark:ring-white/20'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-[#1B1B22] active:bg-slate-200 dark:active:bg-[#202028]'
              }`}
              title={`Semester ${sem}`}
            >
              Semester {sem}
            </button>
          );
        })}
      </div>
    </div>
  );
};
