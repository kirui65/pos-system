import { useState } from 'react';
import { StatCard } from '../../components/ui/StatCard';
import {
  TrendingUp,
  DollarSign,
  Download,
  Store,
} from '../../components/ui/Icon';
import { formatKES, exportToCSV } from '../../utils/formatters';
import { Shop } from '../../types';

interface ReportsViewProps {
  shops: Shop[];
}

export function ReportsView({ shops }: ReportsViewProps) {
  const [period, setPeriod] = useState<'this_month' | 'last_month' | 'quarter'>('this_month');

  // Simulated multi-branch comparative analytics
  const branchData = [
    {
      id: 's-cbd',
      name: 'Demo CBD Shop',
      revenueMinor: 14250000,
      orders: 680,
      avgTicketMinor: 209558,
      topItem: 'Milk 500ml',
      profitMinor: 4132500,
      growth: '+12.4%',
    },
    {
      id: 's-westlands',
      name: 'Demo Westlands Shop',
      revenueMinor: 9840000,
      orders: 395,
      avgTicketMinor: 249113,
      topItem: 'Sugar 1kg',
      profitMinor: 2853600,
      growth: '+8.1%',
    },
  ];

  const totalRevenue = branchData.reduce((acc, b) => acc + b.revenueMinor, 0);
  const totalProfit = branchData.reduce((acc, b) => acc + b.profitMinor, 0);
  const totalOrders = branchData.reduce((acc, b) => acc + b.orders, 0);
  const avgGrossMargin = Math.round((totalProfit / totalRevenue) * 100);

  // Hourly traffic estimation
  const hourlyPeak = [
    { hour: '08:00 - 10:00', label: 'Morning Commute', volume: '18% of daily sales', traffic: 'Moderate' },
    { hour: '12:00 - 14:00', label: 'Lunch Rush', volume: '34% of daily sales', traffic: 'High Peak' },
    { hour: '17:00 - 19:30', label: 'Evening Grocery Peak', volume: '38% of daily sales', traffic: 'Highest Peak' },
    { hour: '20:00 - 22:00', label: 'Late Convenience', volume: '10% of daily sales', traffic: 'Low' },
  ];

  const handleExportFinancialReport = () => {
    const headers = ['Branch / Location', 'Gross Revenue (KES)', 'Orders', 'Avg Ticket (KES)', 'Gross Profit (KES)', 'Gross Margin %'];
    const rows = branchData.map((b) => [
      b.name,
      ((b.revenueMinor || 0) / 100).toFixed(2),
      b.orders,
      ((b.avgTicketMinor || 0) / 100).toFixed(2),
      ((b.profitMinor || 0) / 100).toFixed(2),
      `${Math.round((b.profitMinor / b.revenueMinor) * 100)}%`,
    ]);
    exportToCSV('multi-branch-financial-summary', headers, rows);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: '0 36px 36px' }}>
      {/* Header */}
      <section className="heading" style={{ paddingLeft: 0, paddingRight: 0, paddingBottom: 0 }}>
        <div>
          <em>EXECUTIVE FINANCIALS & BRANCH ROLLUP</em>
          <h1>Reports & Multi-Shop Analytics</h1>
          <span>Comparative performance across retail branches, profit margins, and peak hourly volumes.</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handleExportFinancialReport}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: '#ffffff',
              border: '1px solid #dce4e8',
              borderRadius: 8,
              padding: '9px 14px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              color: '#495d6e',
            }}
          >
            <Download size={14} />
            Export Executive Report
          </button>
        </div>
      </section>

      {/* Aggregate KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <StatCard
          label="Consolidated Revenue"
          value={formatKES(totalRevenue)}
          detail={`Across ${shops.length || 2} retail locations`}
          icon={<DollarSign size={20} />}
          highlight
          trend={{ value: '10.8%', positive: true }}
        />
        <StatCard
          label="Consolidated Gross Profit"
          value={formatKES(totalProfit)}
          detail={`${avgGrossMargin}% average gross margin`}
          icon={<TrendingUp size={20} />}
          trend={{ value: '11.5%', positive: true }}
        />
        <StatCard
          label="Total Orders Completed"
          value={totalOrders.toString()}
          detail="Combined store receipts"
          icon={<Store size={20} />}
        />
        <StatCard
          label="Average Basket Size"
          value={formatKES(totalRevenue / (totalOrders || 1))}
          detail="Per completed checkout"
          icon={<DollarSign size={20} />}
        />
      </div>

      {/* Multi-Branch Side-by-Side Comparison */}
      <div className="panel" style={{ background: '#ffffff', borderRadius: 12, padding: 22, border: '1px solid #e3e8ec' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#13283b' }}>
              Branch Performance Comparison
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#7a8a97' }}>
              Side-by-side revenue, order volume, and margins
            </p>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['this_month', 'last_month', 'quarter'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                style={{
                  border: period === p ? '1px solid #147c70' : '1px solid #dce4e8',
                  background: period === p ? '#e8f7f2' : '#ffffff',
                  color: period === p ? '#147c70' : '#657788',
                  padding: '6px 12px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {p.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
          {branchData.map((b) => (
            <div
              key={b.id}
              style={{
                border: '1px solid #e2e8ec',
                borderRadius: 10,
                padding: 18,
                background: '#fafbfc',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: 15, color: '#13283b' }}>{b.name}</strong>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#107c6f', background: '#e8f7f2', padding: '2px 8px', borderRadius: 4 }}>
                  {b.growth} YoY
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 4 }}>
                <div style={{ background: '#ffffff', padding: 12, borderRadius: 8, border: '1px solid #edf2f5' }}>
                  <span style={{ fontSize: 11, color: '#778899', display: 'block' }}>Gross Revenue</span>
                  <strong style={{ fontSize: 16, color: '#13283b' }}>{formatKES(b.revenueMinor)}</strong>
                </div>
                <div style={{ background: '#ffffff', padding: 12, borderRadius: 8, border: '1px solid #edf2f5' }}>
                  <span style={{ fontSize: 11, color: '#778899', display: 'block' }}>Gross Profit</span>
                  <strong style={{ fontSize: 16, color: '#107c6f' }}>{formatKES(b.profitMinor)}</strong>
                </div>
              </div>

              <div style={{ fontSize: 12, color: '#556677', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #edf2f5', paddingTop: 10 }}>
                <span>Orders: <strong>{b.orders}</strong></span>
                <span>Avg Ticket: <strong>{formatKES(b.avgTicketMinor)}</strong></span>
                <span>Top: <strong>{b.topItem}</strong></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Peak Rush Hours Breakdown */}
      <div className="panel" style={{ background: '#ffffff', borderRadius: 12, padding: 22, border: '1px solid #e3e8ec' }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#13283b' }}>
          Rush Hour Foot-Traffic & Peak Velocity
        </h3>
        <p style={{ margin: '2px 0 16px', fontSize: 12, color: '#7a8a97' }}>
          Schedule cashier staffing according to daily peak transaction volume
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          {hourlyPeak.map((hp, i) => (
            <div
              key={i}
              style={{
                background: '#f8fafc',
                border: '1px solid #edf2f5',
                borderRadius: 8,
                padding: 14,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: 13, color: '#13283b' }}>{hp.hour}</strong>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: hp.traffic.includes('Highest') ? '#fdeeed' : hp.traffic.includes('High') ? '#fff7e6' : '#f1f5f8',
                    color: hp.traffic.includes('Highest') ? '#c5281b' : hp.traffic.includes('High') ? '#b76e00' : '#495d6f',
                  }}
                >
                  {hp.traffic}
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#445566', marginTop: 6, fontWeight: 600 }}>{hp.label}</div>
              <div style={{ fontSize: 11, color: '#8898a6', marginTop: 2 }}>{hp.volume}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
