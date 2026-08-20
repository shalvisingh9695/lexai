import React from 'react';

export default function GlassCard({
  children,
  className = '',
  hoverEffect = true,
  title,
  subtitle,
  icon: Icon,
  badge,
  badgeColor = 'mint',
  id
}) {
  const badgeClasses = {
    mint: 'bg-teal-50 text-teal-700 border-teal-200',
    green: 'bg-teal-50 text-teal-700 border-teal-200',
    teal: 'bg-teal-50 text-teal-700 border-teal-200',
    orange: 'bg-amber-50 text-amber-700 border-amber-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    red: 'bg-rose-50 text-rose-700 border-rose-200',
    blue: 'bg-sky-50 text-sky-700 border-sky-200',
  };

  return (
    <div
      id={id}
      className={`bg-white rounded-xl p-5 border border-slate-200 shadow-sm ${
        hoverEffect ? 'hover:border-slate-300 hover:shadow-md transition-all duration-200' : ''
      } ${className}`}
    >
      {(title || subtitle || Icon || badge) && (
        <div className="flex items-start justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="p-2 rounded-lg bg-teal-50 border border-teal-200 text-teal-600">
                <Icon className="w-5 h-5" />
              </div>
            )}
            <div>
              {title && <h3 className="text-base font-semibold text-slate-900 tracking-tight">{title}</h3>}
              {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {badge && (
            <span
              className={`px-2.5 py-0.5 text-xs font-medium rounded-full border ${
                badgeClasses[badgeColor] || badgeClasses.teal
              }`}
            >
              {badge}
            </span>
          )}
        </div>
      )}
      {children}
    </div>
  );
}


