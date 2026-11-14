import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function DashboardCard({
  title,
  subtitle,
  icon: Icon,
  actionText,
  actionLink,
  onActionClick,
  actionComponent,
  children,
  className = '',
  headerClassName = '',
  bodyClassName = '',
}) {
  return (
    <div
      className={`rounded-2xl transition-all duration-300 flex flex-col shadow-lg ${className}`}
      style={{
        backgroundColor: 'var(--cb-surface)',
        border: '1px solid var(--cb-border)',
      }}
    >
      {/* Card Header */}
      {(title || actionText || actionComponent) && (
        <div
          className={`px-6 py-4 flex items-center justify-between ${headerClassName}`}
          style={{ borderBottom: '1px solid var(--cb-border)' }}
        >
          <div className="flex items-center space-x-2.5">
            {Icon && <Icon className="w-5 h-5 text-[#00C8FF]" />}
            <div>
              <h3
                className="font-bold text-sm md:text-base tracking-tight"
                style={{ color: 'var(--cb-text)' }}
              >
                {title}
              </h3>
              {subtitle && (
                <p className="text-xs mt-0.5" style={{ color: 'var(--cb-text-muted)' }}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <div>
            {actionComponent ? (
              actionComponent
            ) : actionText && actionLink ? (
              <Link
                to={actionLink}
                className="inline-flex items-center text-xs font-semibold text-[#00C8FF] hover:text-[#8CEBFF] transition-colors group"
              >
                <span>{actionText}</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-1" />
              </Link>
            ) : actionText && onActionClick ? (
              <button
                onClick={onActionClick}
                className="inline-flex items-center text-xs font-semibold text-[#00C8FF] hover:text-[#8CEBFF] transition-colors group"
              >
                <span>{actionText}</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-1" />
              </button>
            ) : null}
          </div>
        </div>
      )}
      {/* Card Body */}
      <div className={`p-6 flex-1 ${bodyClassName}`}>{children}</div>
    </div>
  );
}
