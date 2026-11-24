import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | 'full';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = '2xl',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    full: 'max-w-6xl',
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto animate-fade-in"
    >
      <div
        className={`w-full ${maxWidthStyles[maxWidth]} bg-white dark:bg-[#0B0B0E] border border-slate-200/90 dark:border-[#24242C] rounded-2xl shadow-2xl overflow-hidden my-auto transition-all`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-3.5 sm:px-6 py-3 sm:py-4 border-b border-slate-100 dark:border-[#1E1E24]">
          <h3 className="text-xs sm:text-base font-bold text-slate-900 dark:text-white truncate pr-2">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1A1A22] active:bg-slate-200 dark:active:bg-[#22222C] transition-colors flex items-center justify-center flex-shrink-0 touch-manipulation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-3 sm:p-7 max-h-[84vh] sm:max-h-[86vh] overflow-y-auto touch-pan-y">{children}</div>
      </div>
    </div>
  );
};
