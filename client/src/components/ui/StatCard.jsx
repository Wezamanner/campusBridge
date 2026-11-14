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

  // Generate SVG path for sparkline
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
      className={`p-5 rounded-2xl border transition-all duration-300 relative overflow-hidden group 
      bg-[#1C2948]/60 dark:bg-[#1C2948]/60 border-[#1C2948] hover:border-[#00C8FF]/50 shadow-lg hover:shadow-glow-cyan-sm 
      light:bg-white light:border-gray-200 light:shadow-sm ${className}`}
    >
      <div className="flex items-center justify-between">
        {/* Left Side: Icon & Details */}
        <div className="flex items-center space-x-3.5">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105"
            style={{
              backgroundColor: `${accentColor}15`,
              color: accentColor,
              boxShadow: `0 0 15px -3px ${accentColor}30`,
            }}
          >
            {Icon && <Icon className="w-6 h-6" />}
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-1">
              {label}
            </p>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-extrabold tracking-tight text-white dark:text-white light:text-gray-900">
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
                  {trend}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Mini Sparkline SVG */}
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
