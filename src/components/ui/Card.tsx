import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'flat' | 'bordered';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  interactive?: boolean;
  selected?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  interactive = false,
  selected = false,
  className = '',
  ...props
}) => {
  const paddingStyles = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  const variantStyles = {
    default: 'bg-white/95 dark:bg-[#0D0D11]/95 backdrop-blur-sm border border-slate-200/80 dark:border-[#222228] shadow-card dark:shadow-card-dark rounded-xl',
    flat: 'bg-slate-50 dark:bg-[#131317] rounded-xl border border-transparent',
    bordered: 'bg-white dark:bg-[#0D0D11] border border-slate-200 dark:border-[#272730] rounded-xl',
  };

  const interactiveStyles = interactive
    ? 'cursor-pointer transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg hover:border-slate-300 dark:hover:border-[#383844] active:scale-[0.985]'
    : 'transition-all duration-200';

  const selectedStyles = selected
    ? 'border-[#8048A8] dark:border-[#8048A8] ring-2 ring-[#8048A8]/30 dark:ring-[#8048A8]/40 shadow-md animate-select-pulse'
    : '';

  return (
    <div
      className={`${variantStyles[variant]} ${paddingStyles[padding]} ${interactiveStyles} ${selectedStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
