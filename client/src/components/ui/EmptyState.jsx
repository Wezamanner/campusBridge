import React from 'react';
import { Inbox, ArrowRight } from 'lucide-react';

export default function EmptyState({
  title = 'No items found',
  description = 'There is currently no data to display here.',
  icon: Icon = Inbox,
  actionText,
  onActionClick,
  className = '',
}) {
  return (
    <div
      className={`p-8 rounded-xl border border-dashed border-[#1C2948] bg-[#101735]/40 text-center flex flex-col items-center justify-center space-y-3 ${className}`}
    >
      <div className="w-12 h-12 rounded-xl bg-[#00C8FF]/10 text-[#00C8FF] flex items-center justify-center">
        <Icon className="w-6 h-6" />
      </div>

      <div className="space-y-1">
        <h4 className="font-bold text-sm text-white tracking-tight">{title}</h4>
        <p className="text-xs text-gray-400 max-w-sm">{description}</p>
      </div>

      {actionText && onActionClick && (
        <button
          onClick={onActionClick}
          className="mt-2 inline-flex items-center text-xs font-semibold px-4 py-2 rounded-xl bg-[#00C8FF]/10 text-[#00C8FF] border border-[#00C8FF]/30 hover:bg-[#00C8FF]/20 transition-all"
        >
          <span>{actionText}</span>
          <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
        </button>
      )}
    </div>
  );
}
