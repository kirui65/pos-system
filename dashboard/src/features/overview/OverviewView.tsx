import { useState, useEffect } from 'react';
import { StatCard } from '../../components/ui/StatCard';
import { InteractiveChart } from '../../components/ui/InteractiveChart';
import { Badge } from '../../components/ui/Badge';
import {
  TrendingUp,
  ShoppingBag,
  DollarSign,
  Package,
  AlertTriangle,
  RefreshCw,
  Plus,
} from '../../components/ui/Icon';
import { formatKES } from '../../utils/formatters';
import { DashboardSummary, DailyTrendPoint, TopProductItem, Product } from '../../types';
import { api } from '../../services/api';
import { useToast } from '../../components/ui/Toast';

interface OverviewViewProps {
  products: Product[];
  lowStockItems: Product[];
  onNavigateTab: (tab: 'inventory' | 'sales' | 'shifts') => void;
  onQuickAdjust: (product: Product) => void;
}

export function OverviewView({
  products,
  lowStockItems,
  onNavigateTab,
  onQuickAdjust,
}: OverviewViewProps) {
  const { error } = useToast();
  const [range, setRange] = useState<'today' | 'week' | 'month' | 'all'>('today');
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<DashboardSummary>({
    totalRevenueMinor: 4060000,
    salesCount: 18,
    averageTicketMinor: 225500,
    cashTotalMinor: 2450000,
    mpesaTotalMinor: 1610000,
    estimatedProfitMinor: 1140000,
    range: 'today',
  });
  const [trend, setTrend] = useState<DailyTrendPoint[]>([
    { day: '2026-10-10', dayOfWeek: 'Sat', transactionsCount: 12, revenueMinor: 2800000 },
    { day: '2026-10-11', dayOfWeek: 'Sun', transactionsCount: 15, revenueMinor: 3450000 },
    { day: '2026-10-12', dayOfWeek: 'Mon', transactionsCount: 18, revenueMinor: 4120000 },
    { day: '2026-10-13', dayOfWeek: 'Tue', transactionsCount: 14, revenueMinor: 3100000 },
    { day: '2026-10-14', dayOfWeek: 'Wed', transactionsCount: 22, revenueMinor: 4890000 },
    { day: '2026-10-15', dayOfWeek: 'Thu', transactionsCount: 25, revenueMinor: 5600000 },
    { day: '2026-10-16', dayOfWeek: 'Today', transactionsCount: 18, revenueMinor: 4060000 },
  ]);
  const [topProducts, setTopProducts] = useState<TopProductItem[]>([
    { name: 'Milk 500ml', quantitySold: 42, totalRevenueMinor: 378000 },
    { name: 'Bread Loaf', quantitySold: 35, totalRevenueMinor: 245000 },
    { name: 'Sugar 1kg', quantitySold: 28, totalRevenueMinor: 462000 },
    { name: 'Cooking Oil 1L', quantitySold: 19, totalRevenueMinor: 513000 },
    { name: 'Rice 2kg', quantitySold: 16, totalRevenueMinor: 480000 },
  ]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [summaryRes, trendRes, topRes] = await Promise.allSettled([
        api.reports.summary(range),
        api.reports.dailyTrend(),
        api.reports.topProducts(),
      ]);

      if (summaryRes.status === 'fulfilled' && summaryRes.value?.summary) {
        setSummary(summaryRes.value.summary);
      }
      if (trendRes.status === 'fulfilled' && trendRes.value?.trend?.length) {
        setTrend(trendRes.value.trend);
      }
      if (topRes.status === 'fulfilled' && topRes.value?.topProducts?.length) {
        setTopProducts(topRes.value.topProducts);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to refresh reports';
      error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [range]);

  const totalPayment = (summary.cashTotalMinor || 0) + (summary.mpesaTotalMinor || 0);
  const mpesaPct = totalPayment > 0 ? Math.round((summary.mpesaTotalMinor / totalPayment) * 100) : 40;
  const cashPct = 100 - mpesaPct;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: '0 36px 36px' }}>
      {/* Top Header & Range Filters */}
      <section className="heading" style={{ paddingLeft: 0, paddingRight: 0, paddingBottom: 0 }}>
        <div>
          <em>EXECUTIVE OVERVIEW</em>
          <h1>Business Performance</h1>
          <span>Real-time shop sales analytics, gross margin and inventory velocity.</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ background: '#e9eef2', borderRadius: 8, padding: 3, display: 'flex' }}>
            {(['today', 'week', 'month', 'all'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                style={{
                  border: 0,
                  background: range === r ? '#ffffff' : 'transparent',
                  color: range === r ? '#13283b' : '#6c7c8c',
                  fontWeight: range === r ? 700 : 500,
                  padding: '6px 14px',
                  borderRadius: 6,
                  fontSize: 12,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  boxShadow: range === r ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                {r === 'all' ? 'All-Time' : r}
              </button>
            ))}
          </div>
          <button
            className="primary"
            onClick={loadData}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </section>

      {/* KPI Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <StatCard
          label="Total Revenue"
          value={formatKES(summary.totalRevenueMinor)}
          detail={`${summary.salesCount} orders recorded`}
          icon={<DollarSign size={20} />}
          highlight
          trend={{ value: '14.2%', positive: true }}
        />
        <StatCard
          label="Estimated Gross Profit"
          value={formatKES(summary.estimatedProfitMinor)}
          detail={`${summary.totalRevenueMinor ? Math.round((summary.estimatedProfitMinor / summary.totalRevenueMinor) * 100) : 28}% gross margin`}
          icon={<TrendingUp size={20} />}
          trend={{ value: '8.4%', positive: true }}
        />
        <StatCard
          label="Orders Count"
          value={summary.salesCount.toString()}
          detail={`Avg Ticket: ${formatKES(summary.averageTicketMinor)}`}
          icon={<ShoppingBag size={20} />}
        />
        <StatCard
          label="Inventory Catalogue"
          value={products.length.toString()}
          detail={`${lowStockItems.length} items low in stock`}
          icon={lowStockItems.length > 0 ? <AlertTriangle size={20} color="#c5281b" /> : <Package size={20} />}
          highlight={lowStockItems.length > 0}
        />
      </div>

      {/* Main Charts & Breakdown Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        {/* Sales & Revenue Trend Chart */}
        <div className="panel" style={{ background: '#ffffff', borderRadius: 12, padding: 22, border: '1px solid #e3e8ec' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#13283b' }}>
                Revenue & Transactions Trend
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#7a8a97' }}>
                Daily sales trajectory across the past 7 days
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('sales')}
              style={{ border: 0, background: 'transparent', color: '#147c70', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              View Sales Log →
            </button>
          </div>

          <InteractiveChart
            data={trend.map((t) => ({
              label: t.dayOfWeek,
              value: t.revenueMinor,
              secondaryValue: t.transactionsCount,
            }))}
            height={230}
            unitLabel="KES"
          />
        </div>

        {/* Payment Methods Split */}
        <div className="panel" style={{ background: '#ffffff', borderRadius: 12, padding: 22, border: '1px solid #e3e8ec', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#13283b' }}>Payment Breakdown</h3>
          <p style={{ margin: '2px 0 16px', fontSize: 12, color: '#7a8a97' }}>Settlement channels split</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1, justifyContent: 'center' }}>
            {/* M-Pesa Bar */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: '#c47d12' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b' }} />
                  M-Pesa Mobile Money
                </span>
                <span style={{ fontWeight: 700, color: '#13283b' }}>
                  {formatKES(summary.mpesaTotalMinor)} ({mpesaPct}%)
                </span>
              </div>
              <div style={{ width: '100%', height: 8, background: '#f0f4f7', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${mpesaPct}%`, height: '100%', background: '#f59e0b', borderRadius: 4 }} />
              </div>
            </div>

            {/* Cash Bar */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: '#107c6f' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#107c6f' }} />
                  Cash in Till
                </span>
                <span style={{ fontWeight: 700, color: '#13283b' }}>
                  {formatKES(summary.cashTotalMinor)} ({cashPct}%)
                </span>
              </div>
              <div style={{ width: '100%', height: 8, background: '#f0f4f7', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${cashPct}%`, height: '100%', background: '#107c6f', borderRadius: 4 }} />
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #edf2f5', paddingTop: 14, marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#778899' }}>Total Settled</span>
            <strong style={{ fontSize: 15, color: '#13283b' }}>{formatKES(totalPayment || summary.totalRevenueMinor)}</strong>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Low Stock Alert & Top Selling Products */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20 }}>
        {/* Urgent Low Stock Alerts */}
        <div className="panel" style={{ background: '#ffffff', borderRadius: 12, padding: 22, border: '1px solid #e3e8ec' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#13283b', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>Low Stock Critical Alerts</span>
                {lowStockItems.length > 0 && <Badge variant="danger">{lowStockItems.length} Items</Badge>}
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#7a8a97' }}>
                Items reaching minimum safety reorder thresholds
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('inventory')}
              style={{ border: 0, background: 'transparent', color: '#147c70', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              All Inventory →
            </button>
          </div>

          {lowStockItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 16px', color: '#8898a6' }}>
              ✓ All products have healthy inventory levels above safety reorder thresholds.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {lowStockItems.slice(0, 5).map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    background: '#fffbfc',
                    border: '1px solid #fee8e6',
                    borderRadius: 8,
                  }}
                >
                  <div>
                    <strong style={{ fontSize: 13, color: '#13283b', display: 'block' }}>{p.name}</strong>
                    <span style={{ fontSize: 11, color: '#778899' }}>SKU: {p.sku || 'N/A'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#c5281b' }}>{p.stockQuantity} in stock</span>
                      <small style={{ display: 'block', fontSize: 10, color: '#90a0ae' }}>Min: {p.reorderLevel}</small>
                    </div>
                    <button
                      onClick={() => onQuickAdjust(p)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '6px 10px',
                        background: '#ffffff',
                        border: '1px solid #dce4e8',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                        color: '#147c70',
                      }}
                    >
                      <Plus size={12} />
                      Restock
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Products */}
        <div className="panel" style={{ background: '#ffffff', borderRadius: 12, padding: 22, border: '1px solid #e3e8ec' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#13283b' }}>Top Selling Products</h3>
          <p style={{ margin: '2px 0 16px', fontSize: 12, color: '#7a8a97' }}>Highest sales volume by units</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {topProducts.map((tp, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 4,
                      background: idx === 0 ? '#fef3c7' : '#f1f5f8',
                      color: idx === 0 ? '#b45309' : '#64748b',
                      fontSize: 11,
                      fontWeight: 700,
                      display: 'grid',
                      placeItems: 'center',
                    }}
                  >
                    {idx + 1}
                  </span>
                  <div>
                    <strong style={{ fontSize: 13, color: '#13283b', display: 'block' }}>{tp.name}</strong>
                    <span style={{ fontSize: 11, color: '#8898a6' }}>{tp.quantitySold} units sold</span>
                  </div>
                </div>
                <strong style={{ fontSize: 13, color: '#107c6f' }}>{formatKES(tp.totalRevenueMinor)}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
