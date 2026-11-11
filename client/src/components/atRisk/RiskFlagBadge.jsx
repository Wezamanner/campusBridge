import React from 'react';
import { AlertTriangle, Info, XCircle, CheckCircle } from 'lucide-react';

/**
 * RiskFlagBadge — renders a flag status as a colored badge
 *
 * Phase 10 — CampusBridge SRS v2.0
 * Displays one of three flag states: flagged | not_flagged | insufficient_data
 *
 * Uses the existing CampusBridge design system (Badge component colors).
 */

const FLAG_LABEL = {
  lowProgress: 'Low Progress',
  missedDeadlines: 'Missed Deadlines',
  inactivity: 'Inactivity',
};

const STATUS_CONFIG = {
  flagged: {
    label: 'Flagged',
    icon: AlertTriangle,
    className: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    iconColor: 'text-rose-400',
  },
  not_flagged: {
    label: 'OK',
    icon: CheckCircle,
    className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    iconColor: 'text-emerald-400',
  },
  insufficient_data: {
    label: 'No Data',
    icon: Info,
    className: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    iconColor: 'text-amber-400',
  },
};

export function RiskFlagBadge({ flagKey, status, showLabel = true, size = 'md' }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.insufficient_data;
  const Icon = config.icon;
  const sizeClass = size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2.5 py-1';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded-full border tracking-wide uppercase transition-colors ${config.className} ${sizeClass}`}
      title={`${FLAG_LABEL[flagKey] || flagKey}: ${status}`}
    >
      <Icon className="w-3 h-3" />
      {showLabel && (FLAG_LABEL[flagKey] || flagKey)}
    </span>
  );
}

/**
 * RiskFlagsRow — renders all three UC-I03 flags in a horizontal row
 */
export function RiskFlagsRow({ flags, size = 'sm' }) {
  if (!flags) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {Object.entries(flags).map(([key, status]) => (
        <RiskFlagBadge key={key} flagKey={key} status={status} size={size} />
      ))}
    </div>
  );
}

/**
 * DataAvailabilityNotice — renders a compact notice about missing phase dependencies
 */
export function DataAvailabilityNotice({ dataAvailability }) {
  if (!dataAvailability) return null;

  const blockedProviders = Object.entries(dataAvailability).filter(
    ([, v]) => !v.available
  );

  if (blockedProviders.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
      <div className="flex items-start gap-2">
        <Info className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1">
            Incomplete Data — Some Indicators Unavailable
          </p>
          <p className="text-xs text-gray-400 leading-relaxed">
            The following risk indicators return <span className="text-amber-400 font-medium">No Data</span>{' '}
            because their underlying data phases are not yet active. Active flags remain accurate.
          </p>
        </div>
      </div>
      <ul className="space-y-1 ml-6">
        {blockedProviders.map(([key, provider]) => (
          <li key={key} className="text-xs text-gray-500">
            <span className="text-amber-300 font-medium capitalize">
              {key.replace(/([A-Z])/g, ' $1').trim()}
            </span>
            {provider.blockedBy && provider.blockedBy.length > 0 && (
              <span className="text-gray-600"> — requires: {provider.blockedBy.join(', ')}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default RiskFlagBadge;
