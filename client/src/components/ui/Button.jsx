import React from 'react';
import { Loader2 } from 'lucide-react';

const VARIANTS = {
  primary:
    'bg-gradient-to-r from-[#00C8FF] to-[#8CEBFF] text-[#101735] hover:opacity-95 shadow-glow-cyan-sm active:scale-[0.98]',
  secondary:
    'bg-[#1C2948] text-[#8CEBFF] border border-[#1C2948] hover:border-[#00C8FF]/50 active:scale-[0.98]',
  outline:
    'border border-[#00C8FF]/40 text-[#00C8FF] hover:bg-[#00C8FF]/10 active:scale-[0.98]',
  ghost:
    'text-[#8CEBFF] hover:bg-[#1C2948]/60 hover:text-white',
  danger:
    'bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 active:scale-[0.98]',
};

const SIZES = {
  sm: 'text-xs px-3 py-1.5 rounded-lg',
  md: 'text-xs md:text-sm px-4 py-2.5 rounded-xl',
  lg: 'text-sm md:text-base px-6 py-3 rounded-xl font-bold',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  icon: Icon,
  className = '',
  ...props
}) {
  const variantClass = VARIANTS[variant] || VARIANTS.primary;
  const sizeClass = SIZES[size] || SIZES.md;

  return (
    <button
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center font-semibold transition-all select-none disabled:opacity-50 disabled:pointer-events-none ${variantClass} ${sizeClass} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin text-current" />
      ) : Icon ? (
        <Icon className="w-4 h-4 mr-2 flex-shrink-0" />
      ) : null}
      {children}
    </button>
  );
}
