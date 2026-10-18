import { useState, useMemo } from 'react';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Search, Download, Receipt, RefreshCw } from '../../components/ui/Icon';
import { formatKES, formatDateTime, exportToCSV } from '../../utils/formatters';
import { SaleRecord, SaleDetail } from '../../types';
import { api } from '../../services/api';
import { useToast } from '../../components/ui/Toast';

interface SalesViewProps {
  sales: SaleRecord[];
  onRefresh: () => void;
  loading: boolean;
}

export function SalesView({ sales, onRefresh, loading }: SalesViewProps) {
  const { error } = useToast();
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState<'all' | 'cash' | 'mobile_money'>('all');
  const [selectedSale, setSelectedSale] = useState<SaleDetail | null>(null);
  const [loadingSale, setLoadingSale] = useState(false);

  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const matchSearch =
        s.receiptNumber.toLowerCase().includes(search.toLowerCase()) ||
        s.cashierName.toLowerCase().includes(search.toLowerCase()) ||
        (s.customerName && s.customerName.toLowerCase().includes(search.toLowerCase()));

      const matchMethod =
        methodFilter === 'all'
          ? true
          : methodFilter === 'cash'
          ? s.paymentMethod === 'cash'
          : s.paymentMethod === 'mobile_money';

      return matchSearch && matchMethod;
    });
  }, [sales, search, methodFilter]);

  const handleOpenSale = async (id: string) => {
    try {
      setLoadingSale(true);
      const res = await api.sales.getById(id);
      setSelectedSale(res.sale);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load sale details';
      error(message);
    } finally {
      setLoadingSale(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Receipt #', 'Date & Time', 'Total (KES)', 'Method', 'Cashier', 'Customer', 'Items Count'];
    const rows = filteredSales.map((s) => [
      s.receiptNumber,
      formatDateTime(s.soldAt),
      ((s.totalMinor || 0) / 100).toFixed(2),
      s.paymentMethod === 'mobile_money' ? 'M-Pesa' : 'Cash',
      s.cashierName,
      s.customerName || 'Walk-in',
      s.itemsCount || 1,
    ]);
    exportToCSV('sales-transactions', headers, rows);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '0 36px 36px' }}>
      {/* Heading */}
      <section className="heading" style={{ paddingLeft: 0, paddingRight: 0, paddingBottom: 0 }}>
        <div>
          <em>AUDIT & TRANSACTION LOG</em>
          <h1>Sales Ledger</h1>
          <span>Inspect completed customer orders, payment channels, and digital receipts.</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handleExportCSV}
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
            Export CSV
          </button>
          <button
            className="primary"
            onClick={onRefresh}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </section>

      {/* Filter & Search Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          background: '#ffffff',
          padding: '14px 18px',
          borderRadius: 10,
          border: '1px solid #e3e8ec',
        }}
      >
        <div style={{ position: 'relative', flex: 1, maxWidth: 380 }}>
          <Search size={15} color="#899ba8" style={{ position: 'absolute', left: 12, top: 11 }} />
          <input
            type="text"
            placeholder="Search receipt #, cashier, or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px 9px 36px',
              border: '1px solid #dce4e8',
              borderRadius: 7,
              fontSize: 12,
              outline: 'none',
              background: '#f8fafc',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          {(['all', 'cash', 'mobile_money'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMethodFilter(m)}
              style={{
                border: methodFilter === m ? '1px solid #147c70' : '1px solid #dce4e8',
                background: methodFilter === m ? '#e8f7f2' : '#ffffff',
                color: methodFilter === m ? '#147c70' : '#657788',
                padding: '7px 12px',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {m === 'all' ? 'All Channels' : m === 'cash' ? 'Cash Only' : 'M-Pesa Only'}
            </button>
          ))}
        </div>
      </div>

      {/* Sales Table */}
      <div className="panel" style={{ background: '#ffffff', borderRadius: 12, padding: 0, border: '1px solid #e3e8ec', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', margin: 0 }}>
          <thead>
            <tr style={{ background: '#f8fafb', borderBottom: '1px solid #e8eff4' }}>
              <th style={{ padding: '12px 18px', fontSize: 11, color: '#7a8a97', textAlign: 'left', fontWeight: 700 }}>Receipt #</th>
              <th style={{ padding: '12px 18px', fontSize: 11, color: '#7a8a97', textAlign: 'left', fontWeight: 700 }}>Date & Time</th>
              <th style={{ padding: '12px 18px', fontSize: 11, color: '#7a8a97', textAlign: 'left', fontWeight: 700 }}>Cashier</th>
              <th style={{ padding: '12px 18px', fontSize: 11, color: '#7a8a97', textAlign: 'left', fontWeight: 700 }}>Customer</th>
              <th style={{ padding: '12px 18px', fontSize: 11, color: '#7a8a97', textAlign: 'left', fontWeight: 700 }}>Channel</th>
              <th style={{ padding: '12px 18px', fontSize: 11, color: '#7a8a97', textAlign: 'right', fontWeight: 700 }}>Total (KES)</th>
              <th style={{ padding: '12px 18px', fontSize: 11, color: '#7a8a97', textAlign: 'center', fontWeight: 700 }}>Receipt</th>
            </tr>
          </thead>
          <tbody>
            {filteredSales.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: '#8898a6' }}>
                  No transactions match the selected filter.
                </td>
              </tr>
            ) : (
              filteredSales.map((s) => (
                <tr key={s.id} style={{ borderBottom: '1px solid #f0f3f6' }}>
                  <td style={{ padding: '14px 18px', fontWeight: 700, color: '#13283b', fontSize: 13 }}>
                    {s.receiptNumber}
                  </td>
                  <td style={{ padding: '14px 18px', color: '#667788', fontSize: 12 }}>
                    {formatDateTime(s.soldAt)}
                  </td>
                  <td style={{ padding: '14px 18px', color: '#334455', fontSize: 12 }}>
                    {s.cashierName}
                  </td>
                  <td style={{ padding: '14px 18px', color: '#667788', fontSize: 12 }}>
                    {s.customerName || 'Walk-in Customer'}
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    <Badge variant={s.paymentMethod === 'mobile_money' ? 'mpesa' : 'cash'}>
                      {s.paymentMethod === 'mobile_money' ? 'M-Pesa' : 'Cash'}
                    </Badge>
                  </td>
                  <td style={{ padding: '14px 18px', textAlign: 'right', fontWeight: 700, color: '#107c6f', fontSize: 13 }}>
                    {formatKES(s.totalMinor)}
                  </td>
                  <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                    <button
                      onClick={() => handleOpenSale(s.id)}
                      disabled={loadingSale}
                      style={{
                        border: '1px solid #dce4e8',
                        background: '#ffffff',
                        borderRadius: 6,
                        padding: '6px 10px',
                        cursor: 'pointer',
                        fontSize: 11,
                        fontWeight: 600,
                        color: '#147c70',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <Receipt size={13} />
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Sale Detail / Receipt Modal */}
      {selectedSale && (
        <Modal
          isOpen={!!selectedSale}
          onClose={() => setSelectedSale(null)}
          title={`Order Receipt: ${selectedSale.receiptNumber}`}
          subtitle={`Processed by ${selectedSale.cashierName} on ${formatDateTime(selectedSale.soldAt)}`}
          maxWidth={460}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div
              style={{
                background: '#fafbfc',
                border: '1px dashed #d5dee5',
                borderRadius: 8,
                padding: '16px',
                fontFamily: 'Courier New, monospace',
                fontSize: 12,
              }}
            >
              <div style={{ textAlign: 'center', marginBottom: 12, fontFamily: 'sans-serif' }}>
                <h3 style={{ margin: '0 0 2px', fontSize: 16, color: '#13283b' }}>{selectedSale.shopName || 'pesaPOS Store'}</h3>
                <p style={{ margin: 0, fontSize: 11, color: '#778899' }}>Official Customer Receipt</p>
              </div>

              <div style={{ borderBottom: '1px dashed #c0cdd8', margin: '10px 0' }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {selectedSale.items?.map((item) => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <div>{item.name}</div>
                      <small style={{ color: '#8899a6' }}>
                        {item.quantity} x {formatKES(item.unitPriceMinor)}
                      </small>
                    </div>
                    <strong>{formatKES(item.lineTotalMinor)}</strong>
                  </div>
                ))}
              </div>

              <div style={{ borderBottom: '1px dashed #c0cdd8', margin: '12px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0' }}>
                <span>Subtotal:</span>
                <span>{formatKES(selectedSale.subtotalMinor)}</span>
              </div>
              {selectedSale.discountMinor > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0', color: '#c5281b' }}>
                  <span>Discount:</span>
                  <span>-{formatKES(selectedSale.discountMinor)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0', color: '#667788' }}>
                <span>VAT Tax Included:</span>
                <span>{formatKES(selectedSale.taxMinor)}</span>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  margin: '10px 0 0',
                  paddingTop: 8,
                  borderTop: '1px solid #13283b',
                  fontSize: 15,
                  fontWeight: 800,
                  fontFamily: 'sans-serif',
                }}
              >
                <span>TOTAL PAID:</span>
                <span>{formatKES(selectedSale.totalMinor)}</span>
              </div>

              <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px dashed #c0cdd8', fontSize: 11, color: '#687888' }}>
                {selectedSale.payments?.map((p) => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span>Payment via {p.method === 'mobile_money' ? 'M-Pesa' : 'Cash'}</span>
                    <span>
                      {formatKES(p.amountMinor)} {p.reference ? `(Ref: ${p.reference})` : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <button
              className="primary"
              onClick={() => window.print()}
              style={{ width: '100%', padding: '12px', fontSize: 13 }}
            >
              Print Receipt
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
