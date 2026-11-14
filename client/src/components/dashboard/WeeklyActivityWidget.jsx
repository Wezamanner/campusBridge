import React, { useState, useEffect } from 'react';
import DashboardCard from '../ui/DashboardCard.jsx';
import { Calendar, Loader2 } from 'lucide-react';
import { activityService } from '../../services/phase11.js';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function WeeklyActivityWidget({ className = '' }) {
  const [hours, setHours] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    activityService.getWeekly()
      .then(res => {
        if (res.success && res.data) {
          // Backend returns { data: [{ day, hours }] } or { data: number[] }
          const raw = res.data;
          if (Array.isArray(raw) && raw.length === 7) {
            if (typeof raw[0] === 'number') {
              setHours(raw);
            } else if (raw[0]?.hours !== undefined) {
              setHours(raw.map(d => d.hours || 0));
            }
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const noData = !hours || hours.every(h => h === 0);
  const maxHours = noData ? 1 : Math.max(...hours, 1);
  const width = 360;
  const height = 140;

  const points = (hours || Array(7).fill(0)).map((h, i) => ({
    x: (i / 6) * (width - 40) + 20,
    y: height - (h / maxHours) * (height - 30) - 15,
    h,
    day: DAY_LABELS[i],
  }));

  const pathD = points.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ');
  const areaD = `${pathD} L ${points[6].x} ${height} L ${points[0].x} ${height} Z`;
  const peak = points.reduce((m, pt) => pt.h > m.h ? pt : m, points[0]);

  return (
    <DashboardCard
      title="Weekly Activity"
      icon={Calendar}
      actionComponent={
        <div className="px-2.5 py-1 rounded-lg text-xs font-semibold text-[#8CEBFF]"
          style={{ backgroundColor: 'var(--cb-bg)', border: '1px solid var(--cb-border)' }}>
          This Week
        </div>
      }
      className={className}
    >
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 text-[#00C8FF] animate-spin" />
        </div>
      ) : noData ? (
        <div className="py-6 text-center">
          <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" style={{ color: 'var(--cb-text-muted)' }} />
          <p className="text-xs" style={{ color: 'var(--cb-text-muted)' }}>
            Your weekly study activity will appear here.
          </p>
        </div>
      ) : (
        <svg viewBox={`0 0 ${width} ${height + 25}`} className="w-full h-auto overflow-visible">
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00C8FF" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#00C8FF" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, Math.round(maxHours * 0.33), Math.round(maxHours * 0.66), maxHours].map((val, i) => {
            const y = height - (val / maxHours) * (height - 30) - 15;
            return (
              <g key={i}>
                <line x1="20" y1={y} x2={width - 20} y2={y} stroke="var(--cb-border)" strokeDasharray="4 4" strokeWidth="1" />
                <text x="2" y={y + 3} fill="var(--cb-text-muted)" fontSize="9">{val}h</text>
              </g>
            );
          })}
          <path d={areaD} fill="url(#areaGrad)" />
          <path d={pathD} fill="none" stroke="#00C8FF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((pt, i) => (
            <circle key={i} cx={pt.x} cy={pt.y} r={pt.h === peak.h ? 5 : 3.5}
              fill={pt.h === peak.h ? '#00C8FF' : '#8CEBFF'} stroke="var(--cb-bg)" strokeWidth="2" />
          ))}
          {peak.h > 0 && (
            <g transform={`translate(${peak.x - 16}, ${peak.y - 24})`}>
              <rect width="32" height="18" rx="6" fill="#00C8FF" />
              <text x="16" y="12" fill="#101735" fontSize="10" fontWeight="bold" textAnchor="middle">{peak.h}h</text>
            </g>
          )}
          {points.map((pt, i) => (
            <text key={i} x={pt.x} y={height + 18} fill="var(--cb-text-muted)" fontSize="10" fontWeight="500" textAnchor="middle">
              {pt.day}
            </text>
          ))}
        </svg>
      )}
    </DashboardCard>
  );
}
