import React, { useState } from 'react';
import { Badge } from '../../components/ui/Badge';
import { Store, Users } from '../../components/ui/Icon';
import { Shop, StaffMember } from '../../types';
import { api } from '../../services/api';
import { useToast } from '../../components/ui/Toast';

interface SettingsViewProps {
  currentShop: Shop | null;
  staffList: StaffMember[];
  onUpdateShop: (shop: Shop) => void;
  onOpenShopModal: () => void;
}

export function SettingsView({
  currentShop,
  staffList,
  onUpdateShop,
  onOpenShopModal,
}: SettingsViewProps) {
  const { success, error } = useToast();
  const [name, setName] = useState(currentShop?.name || 'Demo CBD Shop');
  const [address, setAddress] = useState(currentShop?.address || 'Nairobi, Kenya');
  const [phone, setPhone] = useState(currentShop?.phone || '+254 700 000 000');
  const [receiptFooter, setReceiptFooter] = useState(
    currentShop?.receiptFooter || 'Thank you for shopping with us! Returns accepted within 7 days.'
  );
  const [taxRatePct, setTaxRatePct] = useState(
    ((currentShop?.taxRateBps || 1600) / 100).toString()
  );
  const [saving, setSaving] = useState(false);

  const handleSaveShopSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const taxRateBps = Math.round(Number(taxRatePct) * 100);
      const res = await api.settings.updateShop({
        name,
        address,
        phone,
        receiptFooter,
        taxRateBps,
      });
      if (res.shop) onUpdateShop(res.shop);
      success('Shop configuration and tax settings saved.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save settings';
      error(msg);
    } finally {
      setSaving(false);
    }
  };

  const defaultStaff: StaffMember[] = [
    { id: '1', fullName: 'Demo Manager', role: 'manager', email: 'manager@demo.local', phone: null, isActive: true },
    { id: '2', fullName: 'Cashier One', role: 'cashier', email: null, phone: '+254 711 111 111', isActive: true },
    { id: '3', fullName: 'Cashier Two', role: 'cashier', email: null, phone: '+254 722 222 222', isActive: true },
  ];

  const displayStaff = staffList.length ? staffList : defaultStaff;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: '0 36px 36px' }}>
      {/* Header */}
      <section className="heading" style={{ paddingLeft: 0, paddingRight: 0, paddingBottom: 0 }}>
        <div>
          <em>ADMINISTRATIVE CONTROLS</em>
          <h1>Shop Settings & Staff</h1>
          <span>Manage store identity, receipt footer templates, tax rates, and authorized personnel.</span>
        </div>
        <button
          onClick={onOpenShopModal}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            border: '1px solid #147c70',
            background: '#e9f6f3',
            color: '#147c70',
            borderRadius: 8,
            padding: '9px 14px',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          <Store size={14} />
          Switch Branch Location
        </button>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>
        {/* Branch Profile & Tax */}
        <div className="panel" style={{ background: '#ffffff', borderRadius: 12, padding: 24, border: '1px solid #e3e8ec' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#13283b' }}>
            Store Profile & Tax Setup
          </h3>

          <form onSubmit={handleSaveShopSettings} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#334455' }}>
              Store / Branch Name *
              <input
                required
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ width: '100%', marginTop: 6, padding: '9px 12px', border: '1px solid #dce4e8', borderRadius: 7, fontSize: 13 }}
              />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#334455' }}>
                Physical Address
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  style={{ width: '100%', marginTop: 6, padding: '9px 12px', border: '1px solid #dce4e8', borderRadius: 7, fontSize: 13 }}
                />
              </label>

              <label style={{ fontSize: 12, fontWeight: 700, color: '#334455' }}>
                Contact Phone
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{ width: '100%', marginTop: 6, padding: '9px 12px', border: '1px solid #dce4e8', borderRadius: 7, fontSize: 13 }}
                />
              </label>
            </div>

            <label style={{ fontSize: 12, fontWeight: 700, color: '#334455' }}>
              Standard VAT Tax Rate (%)
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={taxRatePct}
                onChange={(e) => setTaxRatePct(e.target.value)}
                style={{ width: '100%', marginTop: 6, padding: '9px 12px', border: '1px solid #dce4e8', borderRadius: 7, fontSize: 13 }}
              />
              <span style={{ fontSize: 11, color: '#8899a6', marginTop: 4, display: 'block' }}>
                Applied to sales receipts where VAT is configured.
              </span>
            </label>

            <label style={{ fontSize: 12, fontWeight: 700, color: '#334455' }}>
              Customer Receipt Footer Text
              <textarea
                rows={3}
                value={receiptFooter}
                onChange={(e) => setReceiptFooter(e.target.value)}
                style={{ width: '100%', marginTop: 6, padding: '8px 12px', border: '1px solid #dce4e8', borderRadius: 7, fontSize: 12 }}
              />
            </label>

            <button
              type="submit"
              className="primary"
              disabled={saving}
              style={{ padding: 12, marginTop: 8 }}
            >
              {saving ? 'Saving Changes...' : 'Save Store Settings'}
            </button>
          </form>
        </div>

        {/* Authorized Staff & Roles */}
        <div className="panel" style={{ background: '#ffffff', borderRadius: 12, padding: 24, border: '1px solid #e3e8ec', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#13283b' }}>
                Authorized Staff
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#7a8a97' }}>
                Assigned team members at this location
              </p>
            </div>
            <Users size={18} color="#8898a6" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
            {displayStaff.map((st) => (
              <div
                key={st.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 14px',
                  background: '#f8fafc',
                  border: '1px solid #edf2f5',
                  borderRadius: 8,
                }}
              >
                <div>
                  <strong style={{ fontSize: 13, color: '#13283b', display: 'block' }}>{st.fullName}</strong>
                  <small style={{ fontSize: 11, color: '#7a8a97' }}>
                    {st.email ? st.email : '4-Digit PIN Access'}
                  </small>
                </div>
                <Badge variant={st.role.toLowerCase() === 'manager' ? 'success' : 'info'}>
                  {st.role.toUpperCase()}
                </Badge>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid #edf2f5', fontSize: 11, color: '#8898a6' }}>
            Note: Managers have full administrative authority across all shop locations and reports.
          </div>
        </div>
      </div>
    </div>
  );
}
