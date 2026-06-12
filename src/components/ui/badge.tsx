import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'gray';
  size?: 'sm' | 'md';
  className?: string;
}

export function Badge({
  children,
  variant = 'default',
  size = 'sm',
  className = ''
}: BadgeProps) {
  const variants = {
    default: 'bg-gray-100 text-gray-700',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-700',
    danger: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700',
    gray: 'bg-gray-100 text-gray-600'
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm'
  };

  return (
    <span
      className={`
        inline-flex items-center font-medium rounded-full
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}

interface ChipProps {
  children: React.ReactNode;
  selected?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

export function Chip({
  children,
  selected = false,
  onClick,
  onRemove,
  variant = 'default'
}: ChipProps) {
  const variants = {
    default: selected ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-gray-50 text-gray-700 border-gray-200',
    success: 'bg-green-50 text-green-700 border-green-200',
    warning: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    danger: 'bg-red-50 text-red-700 border-red-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200'
  };

  return (
    <span
      onClick={onClick}
      className={`
        inline-flex items-center gap-1.5 px-3 py-1 text-sm font-medium rounded-full border
        ${variants[variant]}
        ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}
      `}
    >
      {children}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 text-current opacity-60 hover:opacity-100"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </span>
  );
}

interface ScoreBadgeProps {
  score: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function ScoreBadge({ score, showLabel = false, size = 'md' }: ScoreBadgeProps) {
  let color = 'bg-red-100 text-red-700';
  let label = 'Needs Review';

  if (score >= 80) {
    color = 'bg-emerald-100 text-emerald-700';
    label = 'Excellent';
  } else if (score >= 60) {
    color = 'bg-blue-100 text-blue-700';
    label = 'Good';
  } else if (score >= 40) {
    color = 'bg-yellow-100 text-yellow-700';
    label = 'Average';
  }

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base'
  };

  return (
    <span className={`inline-flex items-center gap-1 font-semibold rounded-full ${color} ${sizes[size]}`}>
      {score}%
      {showLabel && <span className="font-normal opacity-80">{label}</span>}
    </span>
  );
}

interface AvatarProps {
  name: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Avatar({ name, src, size = 'md' }: AvatarProps) {
  const sizes = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
    xl: 'w-14 h-14 text-lg'
  };

  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`${sizes[size]} rounded-full object-cover`}
      />
    );
  }

  return (
    <div
      className={`
        ${sizes[size]} rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600
        flex items-center justify-center text-white font-medium
      `}
    >
      {initials}
    </div>
  );
}
