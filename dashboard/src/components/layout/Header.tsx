import { Search, Clock, CheckCircle2 } from '../ui/Icon';
import { Shop, Shift } from '../../types';

interface HeaderProps {
  currentShop: Shop | null;
  currentShift: Shift | null;
  onOpenMobileMenu: () => void;
  onOpenShopModal: () => void;
}

export function Header({
  currentShop,
  currentShift,
  onOpenMobileMenu,
  onOpenShopModal,
}: HeaderProps) {
  const currentDate = new Date().toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <header>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="hamburger" onClick={onOpenMobileMenu} style={{ cursor: 'pointer' }}>
          ☰
        </button>
        <span style={{ fontSize: 13, color: '#556677' }}>
          Branch: <strong onClick={onOpenShopModal} style={{ color: '#147c70', cursor: 'pointer', textDecoration: 'underline' }}>{currentShop?.name || 'Demo CBD Shop'}</strong>
        </span>
        <i>|</i>
        <span style={{ fontSize: 12, color: '#8898a6' }}>{currentDate}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} color="#94a3b0" style={{ position: 'absolute', left: 10, top: 9 }} />
          <input
            type="text"
            placeholder="Search products or orders..."
            style={{
              paddingLeft: 30,
              border: '1px solid #e1e7ec',
              background: '#f8fafc',
              borderRadius: 6,
              fontSize: 12,
              width: 220,
              outline: 'none',
            }}
          />
        </div>

        {/* Till Status Pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 12px',
            borderRadius: 20,
            fontSize: 11,
            fontWeight: 700,
            background: currentShift ? '#e8f7f2' : '#f1f5f8',
            color: currentShift ? '#107c6f' : '#64748b',
            border: `1px solid ${currentShift ? '#bce8da' : '#e2e8f0'}`,
          }}
        >
          {currentShift ? <CheckCircle2 size={13} /> : <Clock size={13} />}
          <span>{currentShift ? 'TILL SHIFT ACTIVE' : 'TILL CLOSED'}</span>
        </div>
      </div>
    </header>
  );
}
