import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export interface ToastProps {
  type?: 'success' | 'warning' | 'error' | 'info';
  message: string;
  onClose?: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  type = 'info',
  message,
  onClose,
}) => {
  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-500" />,
    error: <AlertCircle className="w-5 h-5 text-rose-500" />,
    info: <Info className="w-5 h-5 text-[#8048A8]" />,
  };

  const borderStyles = {
    success: 'border-emerald-200 dark:border-emerald-900/50',
    warning: 'border-amber-200 dark:border-amber-900/50',
    error: 'border-rose-200 dark:border-rose-900/50',
    info: 'border-[#E8DFF0] dark:border-[#471164]',
  };

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-xl bg-white dark:bg-[#2A063D] border shadow-card dark:shadow-card-dark ${borderStyles[type]} max-w-sm`}
    >
      <div className="flex-shrink-0 mt-0.5">{icons[type]}</div>
      <p className="text-xs font-medium text-slate-800 dark:text-slate-100 flex-1 leading-relaxed">
        {message}
      </p>
      {onClose && (
        <button
          onClick={onClose}
          aria-label="Dismiss toast"
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
