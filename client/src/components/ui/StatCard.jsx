import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  trendDirection = 'up',
  accentColor = '#00C8FF',
  sparklineData = [10, 25, 18, 30, 22, 40, 35],
  className = '',
}) {
  const isUp = trendDirection === 'up';
  const min = Math.min(...sparklineData);
  const max = Math.max(...sparklineData);
  const range = max - min || 1;
  const width = 80;
  const height = 30;
  const points = sparklineData
    .map((val, idx) => {
      const x = (idx / (sparklineData.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 6) - 3;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div
      className={`p-3 sm:p-5 rounded-2xl transition-all duration-300 relative overflow-hidden group
        hover:shadow-glow-cyan-sm ${className}`}
      style={{
        backgroundColor: 'var(--cb-surface)',
        border: '1px solid var(--cb-border)',
      }}
    >
      <div className="flex items-center justify-between">
        {/* Left: Icon + Details */}
        <div className="flex items-center space-x-2.5 sm:space-x-3.5 min-w-0">
          <div
            className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl flex-shrink-0 flex items-center justify-center transition-transform group-hover:scale-105"
            style={{
              backgroundColor: `${accentColor}15`,
              color: accentColor,
              boxShadow: `0 0 15px -3px ${accentColor}30`,
            }}
          >
            {Icon && <Icon className="w-4 h-4 sm:w-6 sm:h-6" />}
          </div>
          <div className="min-w-0">
            <p
              className="text-[10px] sm:text-xs uppercase tracking-wider font-semibold mb-0.5 sm:mb-1 truncate"
              style={{ color: 'var(--cb-text-muted)' }}
            >
              {label}
            </p>
            <div className="flex items-baseline flex-wrap gap-x-1.5 gap-y-0.5">
              <span
                className="text-xl sm:text-2xl font-extrabold tracking-tight"
                style={{ color: 'var(--cb-text)' }}
              >
                {value}
              </span>
              {trend && (
                <span
                  className={`inline-flex items-center text-xs font-bold ${
                    isUp ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {isUp ? (
                    <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
                  )}
                  <span className="hidden sm:inline">{trend}</span>
                </span>
              )}
            </div>
          </div>
        </div>
        {/* Right: Sparkline */}
        <div className="hidden sm:block opacity-75 group-hover:opacity-100 transition-opacity">
          <svg width={width} height={height} className="overflow-visible">
            <polyline
              fill="none"
              stroke={accentColor}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={points}
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
