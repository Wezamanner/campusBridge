import React from 'react';

const VARIANTS = {
  cyan: 'bg-[#00C8FF]/10 text-[#00C8FF] border-[#00C8FF]/30',
  success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  warning: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  danger: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  purple: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  neutral: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
};

const SIZES = {
  sm: 'text-[10px] px-2 py-0.5',
  md: 'text-xs px-2.5 py-1',
};

export default function Badge({
  children,
  variant = 'cyan',
  size = 'md',
  className = '',
  dot = false,
  ...props
}) {
  const variantClasses = VARIANTS[variant] || VARIANTS.cyan;
  const sizeClasses = SIZES[size] || SIZES.md;

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded-full border tracking-wide uppercase transition-colors ${variantClasses} ${sizeClasses} ${className}`}
      {...props}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            variant === 'success'
              ? 'bg-emerald-400'
              : variant === 'danger'
              ? 'bg-rose-400'
              : variant === 'warning'
              ? 'bg-amber-400'
              : 'bg-[#00C8FF]'
          }`}
        />
      )}
      {children}
    </span>
  );
}
