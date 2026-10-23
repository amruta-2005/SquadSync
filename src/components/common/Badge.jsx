import React from 'react';

export default function Badge({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  className = ''
}) {
  const variantStyles = {
    default: 'bg-slate-100 text-slate-700 border-slate-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    brand: 'bg-brand-50 text-brand-700 border-brand-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
  };

  const dotColors = {
    default: 'bg-slate-500',
    purple: 'bg-purple-600',
    brand: 'bg-brand-600',
    emerald: 'bg-emerald-500',
    green: 'bg-green-500',
    amber: 'bg-amber-500',
    yellow: 'bg-yellow-500',
    rose: 'bg-rose-500',
    red: 'bg-red-500',
    blue: 'bg-blue-500',
  };

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1 font-medium',
    lg: 'text-sm px-3 py-1 font-medium'
  };

  const currentVariant = variantStyles[variant] || variantStyles.default;
  const currentDot = dotColors[variant] || dotColors.default;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${currentVariant} ${sizeStyles[size]} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${currentDot}`} />}
      {children}
    </span>
  );
}
