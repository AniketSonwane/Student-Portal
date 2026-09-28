import React from 'react';
import { useLocation } from 'react-router-dom';
import { ROUTES } from '../../utils/constants';

export const Footer: React.FC<{ className?: string }> = ({ className = '' }) => {
  const location = useLocation();

  // Settings and Admin pages have their own layout
  if (location.pathname === ROUTES.SETTINGS || location.pathname === ROUTES.ADMIN) return null;
  return (
    <footer
      role="contentinfo"
      aria-label="Developer Attribution"
      className={`w-full py-6 pb-24 sm:pb-8 flex items-center justify-center text-xs font-mono text-slate-500 dark:text-slate-400 no-print select-none transition-colors duration-200 ${className}`}
    >
      <div className="flex items-center gap-1.5 transition-transform duration-200 hover:scale-105">
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
    </footer>
  );
};
export default Footer;
