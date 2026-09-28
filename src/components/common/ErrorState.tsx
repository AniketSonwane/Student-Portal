import React from 'react';
import { AlertCircle, RefreshCw, Mail } from 'lucide-react';
import { Button } from '../ui/Button';
import { APP_CONFIG } from '../../utils/constants';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  showContactAdmin?: boolean;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message,
  onRetry,
  showContactAdmin = true,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
      <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-500 dark:text-rose-400 flex items-center justify-center mb-4">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">
        {title}
      </h3>
      <p className="text-sm text-slate-600 dark:text-slate-300 mb-5 leading-relaxed">
        {message}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {onRetry && (
          <Button
            size="sm"
            variant="outline"
            onClick={onRetry}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Try Again
          </Button>
        )}
        {showContactAdmin && (
          <a
            href={APP_CONFIG.adminContactUrl}
            className="inline-flex items-center gap-1.5 text-xs text-[#8048A8] dark:text-[#F8D299] hover:underline font-medium"
          >
            <Mail className="w-3.5 h-3.5" />
            Contact Administrator
          </a>
        )}
      </div>
    </div>
  );
};
