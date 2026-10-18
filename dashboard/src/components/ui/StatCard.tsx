import React from 'react';

interface StatCardProps {
  label: string;
  value: string;
  detail?: string;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    positive?: boolean;
  };
  highlight?: boolean;
}

export function StatCard({ label, value, detail, icon, trend, highlight }: StatCardProps) {
  return (
    <div
      className="card"
      style={{
        background: '#ffffff',
        border: highlight ? '1px solid #147c70' : '1px solid #e3e8ec',
        borderRadius: 12,
        padding: '20px',
        boxShadow: highlight
          ? '0 4px 16px rgba(20, 124, 112, 0.08)'
          : '0 1px 3px rgba(0, 0, 0, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        transition: 'all 0.15s ease',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#687784', letterSpacing: '0.2px' }}>
          {label}
        </span>
        {icon && (
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: highlight ? '#e3f5f1' : '#f0f4f7',
              color: highlight ? '#147c70' : '#495d6f',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            {icon}
          </div>
        )}
      </div>

      <div style={{ margin: '12px 0 6px' }}>
        <div style={{ fontSize: 24, fontWeight: 800, color: '#13283b', fontFamily: 'Manrope, sans-serif' }}>
          {value}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: '#7a8a97' }}>
        <span>{detail}</span>
        {trend && (
          <span
            style={{
              fontWeight: 700,
              fontSize: 11,
              color: trend.positive ? '#107c6f' : '#d32f2f',
              background: trend.positive ? '#e8f7f2' : '#fdeeed',
              padding: '2px 6px',
              borderRadius: 4,
            }}
          >
            {trend.positive ? '+' : ''}{trend.value}
          </span>
        )}
      </div>
    </div>
  );
}
