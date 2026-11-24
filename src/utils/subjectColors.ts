export interface SubjectColorTheme {
  previewBorder: string;
  previewBg: string;
  previewText: string;
  previewBadge: string;
  modalBg: string;
  modalBorder: string;
  modalAccent: string;
  badgeBg: string;
  dotColor: string;
}

/**
 * Subject color mapping:
 * - CAO -> Orange
 * - DMGT -> Red
 * - DSA / DSAL -> Blue
 * - ED -> Emerald
 * - ES -> Teal
 * - FCC -> Purple
 * - CEP -> Cyan
 */
export const getSubjectTheme = (code: string): SubjectColorTheme => {
  const norm = (code || '').toUpperCase().trim();

  // 1. CAO, EGD -> Orange (Soft pastel)
  if (norm.includes('CAO') || norm.includes('EGD')) {
    return {
      previewBorder: 'border-orange-200/70 dark:border-orange-900/40 hover:border-orange-300',
      previewBg: 'bg-orange-50/40 dark:bg-orange-950/20',
      previewText: 'text-orange-900 dark:text-orange-200',
      previewBadge: 'bg-orange-50/90 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border-orange-200/50 dark:border-orange-900/40',
      modalBg: 'bg-orange-50/30 dark:bg-orange-950/15',
      modalBorder: 'border-orange-200/70 dark:border-orange-900/40 hover:border-orange-300',
      modalAccent: 'text-orange-500 dark:text-orange-400',
      badgeBg: 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300 border-orange-200/50 dark:border-orange-900/40',
      dotColor: 'bg-orange-400',
    };
  }

  // 2. DMGT, AM-1, ICLA -> Red / Rose (Soft pastel)
  if (norm.includes('DMGT') || norm.includes('AM-1')) {
    return {
      previewBorder: 'border-rose-200/70 dark:border-rose-900/40 hover:border-rose-300',
      previewBg: 'bg-rose-50/40 dark:bg-rose-950/20',
      previewText: 'text-rose-900 dark:text-rose-200',
      previewBadge: 'bg-rose-50/90 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200/50 dark:border-rose-900/40',
      modalBg: 'bg-rose-50/30 dark:bg-rose-950/15',
      modalBorder: 'border-rose-200/70 dark:border-rose-900/40 hover:border-rose-300',
      modalAccent: 'text-rose-500 dark:text-rose-400',
      badgeBg: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200/50 dark:border-rose-900/40',
      dotColor: 'bg-rose-400',
    };
  }

  // 3. DSA, DSAL, DSF, CP -> Blue (Soft pastel)
  if (norm.includes('DSA') || norm.includes('DSF') || norm.includes('CP')) {
    return {
      previewBorder: 'border-blue-200/70 dark:border-blue-900/40 hover:border-blue-300',
      previewBg: 'bg-blue-50/40 dark:bg-blue-950/20',
      previewText: 'text-blue-900 dark:text-blue-200',
      previewBadge: 'bg-blue-50/90 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200/50 dark:border-blue-900/40',
      modalBg: 'bg-blue-50/30 dark:bg-blue-950/15',
      modalBorder: 'border-blue-200/70 dark:border-blue-900/40 hover:border-blue-300',
      modalAccent: 'text-blue-500 dark:text-blue-400',
      badgeBg: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200/50 dark:border-blue-900/40',
      dotColor: 'bg-blue-400',
    };
  }

  // 4. ED, HN -> Emerald (Soft pastel)
  if (norm.includes('ED') || norm.includes('HN')) {
    return {
      previewBorder: 'border-emerald-200/70 dark:border-emerald-900/40 hover:border-emerald-300',
      previewBg: 'bg-emerald-50/40 dark:bg-emerald-950/20',
      previewText: 'text-emerald-900 dark:text-emerald-200',
      previewBadge: 'bg-emerald-50/90 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/50 dark:border-emerald-900/40',
      modalBg: 'bg-emerald-50/30 dark:bg-emerald-950/15',
      modalBorder: 'border-emerald-200/70 dark:border-emerald-900/40 hover:border-emerald-300',
      modalAccent: 'text-emerald-500 dark:text-emerald-400',
      badgeBg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200/50 dark:border-emerald-900/40',
      dotColor: 'bg-emerald-400',
    };
  }

  // 5. ES, CS, CEP -> Teal (Soft pastel)
  if (norm.includes('ES') || norm.includes('CS') || norm.includes('CEP')) {
    return {
      previewBorder: 'border-teal-200/70 dark:border-teal-900/40 hover:border-teal-300',
      previewBg: 'bg-teal-50/40 dark:bg-teal-950/20',
      previewText: 'text-teal-900 dark:text-teal-200',
      previewBadge: 'bg-teal-50/90 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border-teal-200/50 dark:border-teal-900/40',
      modalBg: 'bg-teal-50/30 dark:bg-teal-950/15',
      modalBorder: 'border-teal-200/70 dark:border-teal-900/40 hover:border-teal-300',
      modalAccent: 'text-teal-500 dark:text-teal-400',
      badgeBg: 'bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border-teal-200/50 dark:border-teal-900/40',
      dotColor: 'bg-teal-400',
    };
  }

  // 6. FCC, AP, ICLA -> Purple (Soft pastel)
  if (norm.includes('FCC') || norm.includes('AP') || norm.includes('ICLA')) {
    return {
      previewBorder: 'border-purple-200/70 dark:border-purple-900/40 hover:border-purple-300',
      previewBg: 'bg-purple-50/40 dark:bg-purple-950/20',
      previewText: 'text-purple-900 dark:text-[#D1A7FF]',
      previewBadge: 'bg-purple-50/90 dark:bg-purple-950/40 text-purple-700 dark:text-[#D1A7FF] border-purple-200/50 dark:border-purple-900/40',
      modalBg: 'bg-purple-50/30 dark:bg-purple-950/15',
      modalBorder: 'border-purple-200/70 dark:border-purple-900/40 hover:border-purple-300',
      modalAccent: 'text-purple-500 dark:text-[#D1A7FF]',
      badgeBg: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-[#D1A7FF] border-purple-200/50 dark:border-purple-900/40',
      dotColor: 'bg-purple-400',
    };
  }

  // 7. DLD, IKS, TUT -> Amber / Soft Yellow
  if (norm.includes('DLD') || norm.includes('IKS') || norm.includes('TUT')) {
    return {
      previewBorder: 'border-amber-200/70 dark:border-amber-900/40 hover:border-amber-300',
      previewBg: 'bg-amber-50/40 dark:bg-amber-950/20',
      previewText: 'text-amber-900 dark:text-amber-200',
      previewBadge: 'bg-amber-50/90 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200/50 dark:border-amber-900/40',
      modalBg: 'bg-amber-50/30 dark:bg-amber-950/15',
      modalBorder: 'border-amber-200/70 dark:border-amber-900/40 hover:border-amber-300',
      modalAccent: 'text-amber-500 dark:text-amber-400',
      badgeBg: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200/50 dark:border-amber-900/40',
      dotColor: 'bg-amber-400',
    };
  }

  // Fallback -> Slate
  return {
    previewBorder: 'border-slate-200/70 dark:border-[#22222E] hover:border-slate-300',
    previewBg: 'bg-slate-50/40 dark:bg-[#14141E]/40',
    previewText: 'text-slate-800 dark:text-white',
    previewBadge: 'bg-slate-50/90 dark:bg-[#1A1A24] text-slate-700 dark:text-slate-300 border-slate-200/60 dark:border-zinc-700/60',
    modalBg: 'bg-slate-50/30 dark:bg-[#14141E]/30',
    modalBorder: 'border-slate-200/70 dark:border-zinc-800/60 hover:border-slate-300',
    modalAccent: 'text-slate-500 dark:text-slate-400',
    badgeBg: 'bg-slate-50 text-slate-700 dark:bg-slate-800/50 dark:text-slate-300 border-slate-200/60 dark:border-slate-700/60',
    dotColor: 'bg-slate-400',
  };
};
