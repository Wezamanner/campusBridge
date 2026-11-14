import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingState({
  message = 'Loading data...',
  count = 3,
  type = 'skeleton', // 'skeleton' or 'spinner'
}) {
  if (type === 'spinner') {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-3">
        <Loader2 className="w-8 h-8 text-[#00C8FF] animate-spin" />
        <p className="text-xs text-[#8CEBFF] font-medium tracking-wide">
          {message}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 w-full">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="w-full h-16 rounded-xl bg-[#1C2948]/40 border border-[#1C2948] animate-pulse flex items-center px-4 space-x-4"
        >
          <div className="w-8 h-8 rounded-lg bg-[#00C8FF]/10" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-gray-700/50 rounded w-1/3" />
            <div className="h-2 bg-gray-800/50 rounded w-1/2" />
          </div>
          <div className="w-12 h-4 bg-gray-700/40 rounded" />
        </div>
      ))}
    </div>
  );
}
