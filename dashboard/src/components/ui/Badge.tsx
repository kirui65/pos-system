import React from 'react';

export type BadgeVariant =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'cash'
  | 'mpesa'
  | 'neutral'
  | 'default';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  style?: React.CSSProperties;
}

const variantStyles: Record<BadgeVariant, { bg: string; color: string; border: string }> = {
  success: { bg: '#e8f7f2', color: '#0d7663', border: '#bce8da' },
  warning: { bg: '#fff7e6', color: '#b76e00', border: '#ffe2a8' },
  danger: { bg: '#fdeeed', color: '#c5281b', border: '#f9c5c1' },
  info: { bg: '#e8f3fc', color: '#166fb5', border: '#bdddf6' },
  cash: { bg: '#e9f6f3', color: '#127b68', border: '#c3eade' },
  mpesa: { bg: '#fbf4e8', color: '#c47d12', border: '#f7dfb9' },
  neutral: { bg: '#f1f5f8', color: '#4a5d6e', border: '#dbe4ec' },
  default: { bg: '#f1f5f8', color: '#4a5d6e', border: '#dbe4ec' },
};

export function Badge({ children, variant = 'default', style }: BadgeProps) {
  const current = variantStyles[variant] || variantStyles.default;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 9px',
        borderRadius: '6px',
        fontSize: '11px',
        fontWeight: 600,
        backgroundColor: current.bg,
        color: current.color,
        border: `1px solid ${current.border}`,
        letterSpacing: '0.3px',
        textTransform: 'uppercase',
        ...style,
      }}
    >
      {children}
    </span>
  );
}
