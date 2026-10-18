import {
  TrendingUp,
  Receipt,
  Package,
  Clock,
  BarChart3,
  Settings,
  Store,
  LogOut,
} from '../ui/Icon';
import { Tab, User, Shop } from '../../types';

interface SidebarProps {
  activeTab: Tab;
  onSelectTab: (tab: Tab) => void;
  user: User | null;
  currentShop: Shop | null;
  onOpenShopModal: () => void;
  onLogout: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({
  activeTab,
  onSelectTab,
  user,
  currentShop,
  onOpenShopModal,
  onLogout,
  isOpenMobile,
  onCloseMobile,
}: SidebarProps) {
  const navItems = [
    { id: 'overview' as Tab, label: 'Overview', icon: <TrendingUp size={18} /> },
    { id: 'sales' as Tab, label: 'Sales Ledger', icon: <Receipt size={18} /> },
    { id: 'inventory' as Tab, label: 'Inventory & Stock', icon: <Package size={18} /> },
    { id: 'shifts' as Tab, label: 'Shifts & Till', icon: <Clock size={18} /> },
    { id: 'reports' as Tab, label: 'Reports & Branches', icon: <BarChart3 size={18} /> },
    { id: 'settings' as Tab, label: 'Settings & Staff', icon: <Settings size={18} /> },
  ];

  return (
    <aside className={`sidebar ${isOpenMobile ? 'open' : ''}`}>
      {/* Brand Logo */}
      <div className="logo" style={{ display: 'flex', alignItems: 'center' }}>
        <b>P</b> pesa<span>POS</span>
      </div>

      {/* Shop Location Pill */}
      <div
        className="shop"
        onClick={onOpenShopModal}
        style={{ cursor: 'pointer', transition: 'background 0.15s ease' }}
        title="Click to switch active branch location"
      >
        <Store size={18} color="#61d6b5" />
        <div>
          <strong>{currentShop?.name || 'Demo CBD Shop'}</strong>
          <small>Tap to switch location</small>
        </div>
      </div>

      {/* Navigation Menu */}
      <p style={{ fontSize: 10, letterSpacing: '1px', fontWeight: 700, color: '#7796ae', margin: '14px 10px 8px' }}>
        MAIN NAVIGATION
      </p>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              className={`nav ${isActive ? 'active' : ''}`}
              onClick={() => {
                onSelectTab(item.id);
                onCloseMobile();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                cursor: 'pointer',
                border: 0,
                textAlign: 'left',
              }}
            >
              {item.icon}
              <span style={{ fontSize: 13, fontWeight: isActive ? 700 : 500 }}>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Signed-in Manager Profile */}
      <div className="user" style={{ marginTop: 'auto', borderTop: '1px solid #1c4566', paddingTop: 14 }}>
        <b>{user?.fullName?.charAt(0) || 'M'}</b>
        <div style={{ flex: 1, minWidth: 0 }}>
          <strong style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {user?.fullName || 'Demo Manager'}
          </strong>
          <small style={{ color: '#65d6b5', fontWeight: 700 }}>
            {(user?.role || 'MANAGER').toUpperCase()}
          </small>
        </div>
        <button
          onClick={onLogout}
          style={{
            border: 0,
            background: 'transparent',
            color: '#b0c3d4',
            cursor: 'pointer',
            padding: 4,
          }}
          title="Sign out"
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}
