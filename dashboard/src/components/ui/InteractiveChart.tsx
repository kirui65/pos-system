import { useState } from 'react';
import { formatKES } from '../../utils/formatters';

export interface ChartDataPoint {
  label: string;
  value: number;
  secondaryValue?: number;
}

interface InteractiveChartProps {
  data: ChartDataPoint[];
  height?: number;
  valuePrefix?: string;
  unitLabel?: string;
}

export function InteractiveChart({ data, height = 220, unitLabel = 'Revenue' }: InteractiveChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div style={{ height, display: 'grid', placeItems: 'center', color: '#90a0ae', fontSize: 13 }}>
        No trend data available
      </div>
    );
  }

  const values = data.map((d) => d.value);
  const maxValue = Math.max(...values, 1000);
  const minValue = 0;
  const paddingX = 40;
  const paddingY = 25;
  const width = 600;

  const points = data.map((d, i) => {
    const x = paddingX + (i / Math.max(data.length - 1, 1)) * (width - paddingX * 2);
    const y = height - paddingY - ((d.value - minValue) / (maxValue - minValue)) * (height - paddingY * 2);
    return { x, y, ...d };
  });

  const pathD = points.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = points[i - 1];
    const cx1 = prev.x + (p.x - prev.x) / 2;
    const cy1 = prev.y;
    const cx2 = prev.x + (p.x - prev.x) / 2;
    const cy2 = p.y;
    return `${acc} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${p.x} ${p.y}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`;

  const activePoint = hoverIndex !== null ? points[hoverIndex] : null;

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {activePoint && (
        <div
          style={{
            position: 'absolute',
            top: 10,
            left: Math.min(Math.max(activePoint.x - 70, 10), width - 150),
            background: '#102c45',
            color: '#ffffff',
            padding: '8px 12px',
            borderRadius: 8,
            boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
            fontSize: 12,
            pointerEvents: 'none',
            zIndex: 10,
            transition: 'all 0.08s ease-out',
          }}
        >
          <div style={{ fontSize: 11, color: '#9db4c8' }}>{activePoint.label}</div>
          <div style={{ fontWeight: 800, fontSize: 14, marginTop: 2 }}>{formatKES(activePoint.value)}</div>
          {activePoint.secondaryValue !== undefined && (
            <div style={{ fontSize: 11, color: '#68d8b9', marginTop: 2 }}>
              {activePoint.secondaryValue} orders
            </div>
          )}
        </div>
      )}

      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: '100%', height, overflow: 'visible' }}
        onMouseLeave={() => setHoverIndex(null)}
      >
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#147c70" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#147c70" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
          const y = paddingY + pct * (height - paddingY * 2);
          const gridVal = maxValue - pct * (maxValue - minValue);
          return (
            <g key={i}>
              <line
                x1={paddingX}
                y1={y}
                x2={width - paddingX}
                y2={y}
                stroke="#edf2f6"
                strokeDasharray={i === 4 ? undefined : '3 3'}
              />
              <text
                x={paddingX - 8}
                y={y + 3}
                textAnchor="end"
                fontSize="9"
                fill="#94a3b0"
                fontFamily="sans-serif"
              >
                {formatKES(gridVal).replace('KES ', '')}
              </text>
            </g>
          );
        })}

        {/* Area fill */}
        <path d={areaD} fill="url(#chartGradient)" />

        {/* Smooth line */}
        <path d={pathD} fill="none" stroke="#147c70" strokeWidth="2.5" strokeLinecap="round" />

        {/* Interactive points */}
        {points.map((p, i) => (
          <g key={i} onMouseEnter={() => setHoverIndex(i)} style={{ cursor: 'pointer' }}>
            <circle
              cx={p.x}
              cy={p.y}
              r={hoverIndex === i ? 6 : 3.5}
              fill="#ffffff"
              stroke="#147c70"
              strokeWidth={hoverIndex === i ? 3 : 2}
            />
            {/* invisible wider hit area for easy hover */}
            <circle cx={p.x} cy={p.y} r={18} fill="transparent" />
            {/* X-axis labels */}
            <text
              x={p.x}
              y={height - 6}
              textAnchor="middle"
              fontSize="10"
              fill={hoverIndex === i ? '#102c45' : '#8898a6'}
              fontWeight={hoverIndex === i ? '700' : '400'}
            >
              {p.label}
            </text>
          </g>
        ))}
      </svg>
      <div style={{ textAlign: 'right', fontSize: 11, color: '#90a0ae', marginTop: 4 }}>
        Showing {unitLabel} Trend
      </div>
    </div>
  );
}
