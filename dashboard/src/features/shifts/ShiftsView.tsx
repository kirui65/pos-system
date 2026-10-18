import React, { useState } from 'react';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Clock, RefreshCw, CheckCircle2, AlertTriangle, ArrowRightLeft } from '../../components/ui/Icon';
import { formatKES, formatDateTime, formatRelativeTime } from '../../utils/formatters';
import { Shift } from '../../types';
import { api } from '../../services/api';
import { useToast } from '../../components/ui/Toast';

interface ShiftsViewProps {
  currentShift: Shift | null;
  shiftsHistory: Shift[];
  onRefresh: () => void;
  loading: boolean;
}

export function ShiftsView({
  currentShift,
  shiftsHistory,
  onRefresh,
  loading,
}: ShiftsViewProps) {
  const { success, error, warning } = useToast();

  // Modals
  const [openModal, setOpenModal] = useState(false);
  const [openingFloat, setOpeningFloat] = useState('5000');
  const [opening, setOpening] = useState(false);

  const [closeModal, setCloseModal] = useState(false);
  const [countedCash, setCountedCash] = useState('');
  const [closeNotes, setCloseNotes] = useState('');
  const [closing, setClosing] = useState(false);

  const [payoutModal, setPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutReason, setPayoutReason] = useState('');

  // Calculations for close shift
  const openingMinor = currentShift ? currentShift.openingFloatMinor : 0;
  const cashSalesMinor = currentShift ? currentShift.cashSalesMinor || 0 : 0;
  const expectedTotalMinor = openingMinor + cashSalesMinor;
  const countedMinor = countedCash ? Math.round(Number(countedCash) * 100) : null;
  const varianceMinor = countedMinor !== null ? countedMinor - expectedTotalMinor : null;

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setOpening(true);
      const floatMinor = Math.round(Number(openingFloat) * 100);
      await api.shifts.open(floatMinor);
      success('Till shift successfully opened.');
      setOpenModal(false);
      onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to open shift';
      error(msg);
    } finally {
      setOpening(false);
    }
  };

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentShift) return;
    try {
      setClosing(true);
      const counted = Math.round(Number(countedCash) * 100);
      const res = await api.shifts.close(currentShift.id, counted, closeNotes);
      if (res.differenceMinor !== 0) {
        warning(
          `Shift closed with variance of ${formatKES(res.differenceMinor)} (${res.differenceMinor > 0 ? 'Cash Overage' : 'Cash Shortage'})`
        );
      } else {
        success('Shift reconciled and closed with zero variance!');
      }
      setCloseModal(false);
      setCountedCash('');
      setCloseNotes('');
      onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to close shift';
      error(msg);
    } finally {
      setClosing(false);
    }
  };

  const handleRecordPayout = (e: React.FormEvent) => {
    e.preventDefault();
    success(`Cash payout of KES ${Number(payoutAmount).toFixed(2)} logged: ${payoutReason}`);
    setPayoutModal(false);
    setPayoutAmount('');
    setPayoutReason('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: '0 36px 36px' }}>
      {/* Heading */}
      <section className="heading" style={{ paddingLeft: 0, paddingRight: 0, paddingBottom: 0 }}>
        <div>
          <em>CASH DRAWER RECONCILIATION</em>
          <h1>Shifts & Till Management</h1>
          <span>Control till opening float, cash takings, physical counts, and variance reconciliation.</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {currentShift ? (
            <>
              <button
                onClick={() => setPayoutModal(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  border: '1px solid #dce4e8',
                  background: '#ffffff',
                  borderRadius: 8,
                  padding: '9px 14px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  color: '#495d6e',
                }}
              >
                <ArrowRightLeft size={14} />
                Cash Drop / Payout
              </button>
              <button
                className="primary"
                onClick={() => {
                  setCountedCash(((expectedTotalMinor) / 100).toString());
                  setCloseModal(true);
                }}
                style={{ background: '#c5281b', borderColor: '#c5281b' }}
              >
                Close Active Shift & Reconcile
              </button>
            </>
          ) : (
            <button className="primary" onClick={() => setOpenModal(true)}>
              Open New Till Shift
            </button>
          )}
          <button
            onClick={onRefresh}
            disabled={loading}
            style={{
              border: '1px solid #dce4e8',
              background: '#ffffff',
              borderRadius: 8,
              padding: '9px 12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              color: '#495d6e',
            }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            Refresh
          </button>
        </div>
      </section>

      {/* Active Shift Banner Card */}
      {currentShift ? (
        <div
          className="panel"
          style={{
            background: '#ffffff',
            borderRadius: 12,
            padding: 24,
            border: '2px solid #147c70',
            boxShadow: '0 4px 20px rgba(20, 124, 112, 0.08)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: '#107c6f',
                    boxShadow: '0 0 0 4px #e0f2ee',
                  }}
                />
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#13283b' }}>
                  ACTIVE TILL SHIFT
                </h2>
                <Badge variant="success">Open & Active</Badge>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#667788' }}>
                Opened {formatRelativeTime(currentShift.openedAt)} by{' '}
                <strong>{currentShift.cashierName || 'Demo Manager'}</strong>
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: 11, color: '#8898a6' }}>Opened At</span>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#13283b' }}>
                {formatDateTime(currentShift.openedAt)}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #edf2f5' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#778899', display: 'block' }}>
                OPENING FLOAT
              </span>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#13283b', marginTop: 4 }}>
                {formatKES(currentShift.openingFloatMinor)}
              </div>
              <small style={{ fontSize: 11, color: '#8898a6' }}>Base change in drawer</small>
            </div>

            <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #edf2f5' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#778899', display: 'block' }}>
                CASH TAKINGS
              </span>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#107c6f', marginTop: 4 }}>
                {formatKES(currentShift.cashSalesMinor || 0)}
              </div>
              <small style={{ fontSize: 11, color: '#8898a6' }}>{currentShift.salesCount || 0} cash orders</small>
            </div>

            <div style={{ background: '#e9f6f3', padding: 16, borderRadius: 8, border: '1px solid #c2eade' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#147c70', display: 'block' }}>
                EXPECTED CASH IN DRAWER
              </span>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#107c6f', marginTop: 4 }}>
                {formatKES(expectedTotalMinor)}
              </div>
              <small style={{ fontSize: 11, color: '#147c70' }}>Opening float + takings</small>
            </div>
          </div>
        </div>
      ) : (
        <div
          style={{
            background: '#ffffff',
            borderRadius: 12,
            padding: '36px 24px',
            border: '1px dashed #d1dde5',
            textAlign: 'center',
          }}
        >
          <Clock size={36} color="#8898a6" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ margin: '0 0 6px', fontSize: 17, color: '#13283b' }}>
            No Shift Currently Open at This Location
          </h3>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: '#778899' }}>
            Start a shift before processing customer cash drawer sales.
          </p>
          <button className="primary" onClick={() => setOpenModal(true)}>
            Open Till Shift Now
          </button>
        </div>
      )}

      {/* Shifts History Log */}
      <div className="panel" style={{ background: '#ffffff', borderRadius: 12, padding: 0, border: '1px solid #e3e8ec', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #edf2f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#13283b' }}>
              Historical Reconciled Shifts
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#778899' }}>
              Past cash drawer closes with variance over/short audits
            </p>
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', margin: 0 }}>
          <thead>
            <tr style={{ background: '#f8fafb', borderBottom: '1px solid #e8eff4' }}>
              <th style={{ padding: '12px 18px', fontSize: 11, color: '#7a8a97', textAlign: 'left', fontWeight: 700 }}>Opened / Closed</th>
              <th style={{ padding: '12px 18px', fontSize: 11, color: '#7a8a97', textAlign: 'left', fontWeight: 700 }}>Cashier</th>
              <th style={{ padding: '12px 18px', fontSize: 11, color: '#7a8a97', textAlign: 'right', fontWeight: 700 }}>Float</th>
              <th style={{ padding: '12px 18px', fontSize: 11, color: '#7a8a97', textAlign: 'right', fontWeight: 700 }}>Expected</th>
              <th style={{ padding: '12px 18px', fontSize: 11, color: '#7a8a97', textAlign: 'right', fontWeight: 700 }}>Counted</th>
              <th style={{ padding: '12px 18px', fontSize: 11, color: '#7a8a97', textAlign: 'center', fontWeight: 700 }}>Reconciliation Variance</th>
              <th style={{ padding: '12px 18px', fontSize: 11, color: '#7a8a97', textAlign: 'left', fontWeight: 700 }}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {shiftsHistory.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: '#8898a6' }}>
                  No closed shifts in record history.
                </td>
              </tr>
            ) : (
              shiftsHistory.map((s) => {
                const diff = (s.countedCashMinor ?? 0) - (s.expectedCashMinor ?? 0);
                const isBalanced = diff === 0;
                return (
                  <tr key={s.id} style={{ borderBottom: '1px solid #f0f3f6' }}>
                    <td style={{ padding: '12px 18px', fontSize: 12 }}>
                      <strong style={{ color: '#13283b', display: 'block' }}>{formatDateTime(s.openedAt)}</strong>
                      <small style={{ color: '#8898a6' }}>Closed: {s.closedAt ? formatDateTime(s.closedAt) : 'Open'}</small>
                    </td>
                    <td style={{ padding: '12px 18px', fontSize: 12, color: '#334455' }}>
                      {s.cashierName || 'Demo Manager'}
                    </td>
                    <td style={{ padding: '12px 18px', textAlign: 'right', fontSize: 12, color: '#657788' }}>
                      {formatKES(s.openingFloatMinor)}
                    </td>
                    <td style={{ padding: '12px 18px', textAlign: 'right', fontSize: 12, color: '#657788' }}>
                      {s.expectedCashMinor ? formatKES(s.expectedCashMinor) : '—'}
                    </td>
                    <td style={{ padding: '12px 18px', textAlign: 'right', fontWeight: 700, fontSize: 12, color: '#13283b' }}>
                      {s.countedCashMinor ? formatKES(s.countedCashMinor) : '—'}
                    </td>
                    <td style={{ padding: '12px 18px', textAlign: 'center' }}>
                      {s.closedAt ? (
                        <Badge variant={isBalanced ? 'success' : diff > 0 ? 'warning' : 'danger'}>
                          {isBalanced ? 'BALANCED' : diff > 0 ? `+${formatKES(diff)} OVER` : `${formatKES(diff)} SHORT`}
                        </Badge>
                      ) : (
                        <Badge variant="info">Active</Badge>
                      )}
                    </td>
                    <td style={{ padding: '12px 18px', fontSize: 12, color: '#778899' }}>
                      {s.notes || '—'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Open Shift */}
      {openModal && (
        <Modal
          isOpen={openModal}
          onClose={() => setOpenModal(false)}
          title="Open Till Shift"
          subtitle="Declare opening change float before taking sales"
          maxWidth={420}
        >
          <form onSubmit={handleOpenShift} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#334455' }}>
              Opening Drawer Float (KES) *
              <input
                required
                type="number"
                min="0"
                step="50"
                placeholder="e.g. 5000"
                value={openingFloat}
                onChange={(e) => setOpeningFloat(e.target.value)}
                autoFocus
                style={{ width: '100%', marginTop: 6, padding: '10px 12px', border: '1px solid #dce4e8', borderRadius: 7, fontSize: 14 }}
              />
            </label>
            <p style={{ margin: 0, fontSize: 12, color: '#778899' }}>
              Physically count the cash bills and coin float in your drawer before opening.
            </p>
            <button
              type="submit"
              className="primary"
              disabled={opening}
              style={{ padding: 12, marginTop: 10 }}
            >
              {opening ? 'Opening Shift...' : 'Start Till Shift'}
            </button>
          </form>
        </Modal>
      )}

      {/* Modal: Close Shift & Reconcile */}
      {closeModal && currentShift && (
        <Modal
          isOpen={closeModal}
          onClose={() => setCloseModal(false)}
          title="Close Till & Cash Reconciliation"
          subtitle="Compare physically counted cash against system recorded sales"
          maxWidth={480}
        >
          <form onSubmit={handleCloseShift} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Expected Summary Box */}
            <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #edf2f5', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#657788' }}>
                <span>Opening Float:</span>
                <strong>{formatKES(openingMinor)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#657788' }}>
                <span>Cash Sales Recorded:</span>
                <strong>{formatKES(cashSalesMinor)}</strong>
              </div>
              <div style={{ borderTop: '1px solid #e1e7ec', paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#13283b' }}>
                <strong>SYSTEM EXPECTED CASH:</strong>
                <strong style={{ color: '#107c6f', fontSize: 16 }}>{formatKES(expectedTotalMinor)}</strong>
              </div>
            </div>

            {/* Counted Cash Input */}
            <label style={{ fontSize: 12, fontWeight: 700, color: '#334455' }}>
              Physically Counted Drawer Cash (KES) *
              <input
                required
                type="number"
                min="0"
                step="1"
                placeholder="Enter physical drawer count"
                value={countedCash}
                onChange={(e) => setCountedCash(e.target.value)}
                autoFocus
                style={{ width: '100%', marginTop: 6, padding: '10px 12px', border: '1px solid #dce4e8', borderRadius: 7, fontSize: 16, fontWeight: 700 }}
              />
            </label>

            {/* Live Variance Highlight */}
            {varianceMinor !== null && (
              <div
                style={{
                  padding: 12,
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: varianceMinor === 0 ? '#e8f7f2' : varianceMinor > 0 ? '#fff7e6' : '#fdeeed',
                  color: varianceMinor === 0 ? '#0d7663' : varianceMinor > 0 ? '#b76e00' : '#c5281b',
                  border: `1px solid ${varianceMinor === 0 ? '#bce8da' : varianceMinor > 0 ? '#ffe2a8' : '#f9c5c1'}`,
                }}
              >
                <span>
                  {varianceMinor === 0
                    ? '✓ Drawer perfectly balanced'
                    : varianceMinor > 0
                    ? '▲ Cash Overage in Drawer'
                    : '▼ Cash Shortage in Drawer'}
                </span>
                <span style={{ fontSize: 15 }}>
                  {varianceMinor > 0 ? `+${formatKES(varianceMinor)}` : formatKES(varianceMinor)}
                </span>
              </div>
            )}

            <label style={{ fontSize: 12, fontWeight: 700, color: '#334455' }}>
              Closing Notes / Variance Reason
              <textarea
                rows={2}
                placeholder="Optional explanation for discrepancy or banking drop..."
                value={closeNotes}
                onChange={(e) => setCloseNotes(e.target.value)}
                style={{ width: '100%', marginTop: 6, padding: '8px 12px', border: '1px solid #dce4e8', borderRadius: 7, fontSize: 12 }}
              />
            </label>

            <button
              type="submit"
              className="primary"
              disabled={closing}
              style={{ padding: 12, marginTop: 6 }}
            >
              {closing ? 'Reconciling...' : 'Confirm Reconciliation & Lock Shift'}
            </button>
          </form>
        </Modal>
      )}

      {/* Modal: Cash Drop / Payout */}
      {payoutModal && (
        <Modal
          isOpen={payoutModal}
          onClose={() => setPayoutModal(false)}
          title="Record Drawer Cash Drop / Payout"
          subtitle="Deduct cash from physical till for banking or petty expense"
          maxWidth={420}
        >
          <form onSubmit={handleRecordPayout} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#334455' }}>
              Payout Amount (KES) *
              <input
                required
                type="number"
                min="1"
                placeholder="e.g. 2000"
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
                style={{ width: '100%', marginTop: 6, padding: '10px 12px', border: '1px solid #dce4e8', borderRadius: 7, fontSize: 14 }}
              />
            </label>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#334455' }}>
              Reason / Purpose *
              <input
                required
                type="text"
                placeholder="e.g. Bread supplier cash payment, Mid-day banking drop"
                value={payoutReason}
                onChange={(e) => setPayoutReason(e.target.value)}
                style={{ width: '100%', marginTop: 6, padding: '10px 12px', border: '1px solid #dce4e8', borderRadius: 7, fontSize: 13 }}
              />
            </label>
            <button type="submit" className="primary" style={{ padding: 12, marginTop: 8 }}>
              Record Till Payout
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
