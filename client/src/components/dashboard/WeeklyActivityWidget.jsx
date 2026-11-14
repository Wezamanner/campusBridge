import React from 'react';
import DashboardCard from '../ui/DashboardCard.jsx';
import { Calendar } from 'lucide-react';

export default function WeeklyActivityWidget({
  days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  hours = [2, 6, 4, 8, 12, 5, 3],
  className = '',
}) {
  const maxHours = 15;
  const width = 360;
  const height = 140;

  // Compute SVG points
  const points = hours.map((h, i) => {
    const x = (i / (days.length - 1)) * (width - 40) + 20;
    const y = height - (h / maxHours) * (height - 30) - 15;
    return { x, y, h, day: days[i] };
  });

  const pathD = points.reduce((acc, pt, i) => {
    return i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

  // Find peak point
  const peak = points.reduce((max, pt) => (pt.h > max.h ? pt : max), points[0]);

  return (
    <DashboardCard
      title="Weekly Activity"
      icon={Calendar}
      actionComponent={
        <div className="px-2.5 py-1 rounded-lg bg-[#101735]/80 border border-[#1C2948] text-xs font-semibold text-[#8CEBFF]">
          This Week
        </div>
      }
      className={className}
    >
      <div className="space-y-4">
        {/* SVG Line / Area Chart */}
        <div className="relative w-full overflow-hidden">
          <svg viewBox={`0 0 ${width} ${height + 25}`} className="w-full h-auto overflow-visible">
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00C8FF" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#00C8FF" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid Lines */}
            {[0, 5, 10, 15].map((val) => {
              const y = height - (val / maxHours) * (height - 30) - 15;
              return (
                <g key={val}>
                  <line
                    x1="20"
                    y1={y}
                    x2={width - 20}
                    y2={y}
                    stroke="#1C2948"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                  <text
                    x="2"
                    y={y + 3}
                    fill="#64748B"
                    fontSize="9"
                    fontFamily="inherit"
                  >
                    {val}h
                  </text>
                </g>
              );
            })}

            {/* Area Fill */}
            <path d={areaD} fill="url(#areaGradient)" />

            {/* Main Polyline Curve */}
            <path
              d={pathD}
              fill="none"
              stroke="#00C8FF"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Points & Peak Callout */}
            {points.map((pt, idx) => (
              <circle
                key={idx}
                cx={pt.x}
                cy={pt.y}
                r={pt.h === peak.h ? 5 : 3.5}
                fill={pt.h === peak.h ? '#00C8FF' : '#8CEBFF'}
                stroke="#101735"
                strokeWidth="2"
              />
            ))}

            {/* Peak Label Pill */}
            <g transform={`translate(${peak.x - 16}, ${peak.y - 24})`}>
              <rect
                width="32"
                height="18"
                rx="6"
                fill="#00C8FF"
                className="filter drop-shadow"
              />
              <text
                x="16"
                y="12"
                fill="#101735"
                fontSize="10"
                fontWeight="bold"
                textAnchor="middle"
              >
                {peak.h}h
              </text>
            </g>

            {/* X-axis Day Labels */}
            {points.map((pt, idx) => (
              <text
                key={idx}
                x={pt.x}
                y={height + 18}
                fill="#94A3B8"
                fontSize="10"
                fontWeight="500"
                textAnchor="middle"
              >
                {pt.day}
              </text>
            ))}
          </svg>
        </div>
      </div>
    </DashboardCard>
  );
}
