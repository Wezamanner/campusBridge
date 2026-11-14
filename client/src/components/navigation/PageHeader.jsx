import React from 'react';

export default function PageHeader({
  title,
  subtitle,
  actions,
  badge,
  className = '',
}) {
  return (
    <div
      className={`flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#1C2948] dark:border-[#1C2948] light:border-gray-200 ${className}`}
    >
      <div className="space-y-1">
        <div className="flex items-center space-x-3">
          <h1 className="text-2xl md:text-3xl font-extrabold text-white dark:text-white light:text-gray-900 tracking-tight">
            {title}
          </h1>
          {badge}
        </div>
        {subtitle && (
          <p className="text-xs md:text-sm text-[#8CEBFF]/80 dark:text-[#8CEBFF]/80 light:text-gray-600 max-w-2xl">
            {subtitle}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex items-center space-x-3 flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
