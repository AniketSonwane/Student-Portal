import React from 'react';

interface LoadingStateProps {
  message?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading your information...',
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center min-h-[180px]">
      <div className="relative mb-3.5 flex items-center justify-center">
        <div className="w-10 h-10 border-[3px] border-[#8048A8]/20 border-t-[#8048A8] rounded-full portal-spinner" />
        <div className="absolute w-2 h-2 rounded-full bg-[#8048A8]/60 animate-pulse" />
      </div>
      <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
        {message}
      </p>
    </div>
  );
};
