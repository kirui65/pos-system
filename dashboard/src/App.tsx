import { useState, useEffect, useCallback, useMemo } from 'react';
import { ToastProvider, useToast } from './components/ui/Toast';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { AuthModal } from './components/layout/AuthModal';
import { ShopModal } from './components/layout/ShopModal';

// Features
import { OverviewView } from './features/overview/OverviewView';
import { SalesView } from './features/sales/SalesView';
import { InventoryView } from './features/inventory/InventoryView';
import { ShiftsView } from './features/shifts/ShiftsView';
import { ReportsView } from './features/reports/ReportsView';
import { SettingsView } from './features/settings/SettingsView';

import { Tab, User, Shop, Product, Shift, SaleRecord, StaffMember } from './types';
import { api } from './services/api';

// Initial resilient demo seeds
const initialShops: Shop[] = [
  { id: 's-cbd', name: 'Demo CBD Shop', address: 'Moi Avenue, Nairobi', phone: '+254 700 111 222', currencyCode: 'KES', taxRateBps: 1600 },
  { id: 's-westlands', name: 'Demo Westlands Shop', address: 'Mpaka Road, Westlands', phone: '+254 700 333 444', currencyCode: 'KES', taxRateBps: 1600 },
];

const initialProducts: Product[] = [
  { id: 'p1', name: 'Milk 500ml', sku: 'MILK-500', barcode: 'MILK-500', costPriceMinor: 7000, sellingPriceMinor: 9000, stockQuantity: 84, reorderLevel: 10, trackStock: true },
  { id: 'p2', name: 'Bread Loaf 800g', sku: 'BREAD-800', barcode: 'BREAD-800', costPriceMinor: 5500, sellingPriceMinor: 7000, stockQuantity: 45, reorderLevel: 15, trackStock: true },
  { id: 'p3', name: 'Sugar 1kg', sku: 'SUGAR-1K', barcode: 'SUGAR-1K', costPriceMinor: 14000, sellingPriceMinor: 16500, stockQuantity: 62, reorderLevel: 8, trackStock: true },
  { id: 'p4', name: 'Rice 2kg', sku: 'RICE-2K', barcode: 'RICE-2K', costPriceMinor: 25000, sellingPriceMinor: 30000, stockQuantity: 8, reorderLevel: 12, trackStock: true },
  { id: 'p5', name: 'Cooking Oil 1L', sku: 'OIL-1L', barcode: 'OIL-1L', costPriceMinor: 23000, sellingPriceMinor: 27000, stockQuantity: 4, reorderLevel: 6, trackStock: true },
  { id: 'p6', name: 'Soda 500ml', sku: 'SODA-500', barcode: 'SODA-500', costPriceMinor: 4500, sellingPriceMinor: 6000, stockQuantity: 95, reorderLevel: 20, trackStock: true },
  { id: 'p7', name: 'Soap Bar 125g', sku: 'SOAP-125', barcode: 'SOAP-125', costPriceMinor: 6500, sellingPriceMinor: 8500, stockQuantity: 52, reorderLevel: 10, trackStock: true },
  { id: 'p8', name: 'Tea Leaves 250g', sku: 'TEA-250', barcode: 'TEA-250', costPriceMinor: 12000, sellingPriceMinor: 15000, stockQuantity: 40, reorderLevel: 8, trackStock: true },
  { id: 'p9', name: 'Eggs Tray (30)', sku: 'EGGS-30', barcode: 'EGGS-30', costPriceMinor: 42000, sellingPriceMinor: 50000, stockQuantity: 3, reorderLevel: 5, trackStock: true },
  { id: 'p10', name: 'Maize Flour 2kg', sku: 'FLOUR-2K', barcode: 'FLOUR-2K', costPriceMinor: 13500, sellingPriceMinor: 16000, stockQuantity: 24, reorderLevel: 14, trackStock: true },
];

const initialShift: Shift = {
  id: 'shift-demo-1',
  openedAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
  openingFloatMinor: 500000,
  cashSalesMinor: 245000,
  salesCount: 14,
  cashierName: 'Demo Manager',
};

const initialShiftsHistory: Shift[] = [
  {
    id: 'shift-prev-1',
    openedAt: new Date(Date.now() - 28 * 3600 * 1000).toISOString(),
    closedAt: new Date(Date.now() - 20 * 3600 * 1000).toISOString(),
    openingFloatMinor: 500000,
    cashSalesMinor: 382000,
    salesCount: 22,
    expectedCashMinor: 882000,
    countedCashMinor: 882000,
    cashierName: 'Cashier One',
    notes: 'Shift balanced cleanly.',
  },
  {
    id: 'shift-prev-2',
    openedAt: new Date(Date.now() - 52 * 3600 * 1000).toISOString(),
    closedAt: new Date(Date.now() - 44 * 3600 * 1000).toISOString(),
    openingFloatMinor: 500000,
    cashSalesMinor: 410000,
    salesCount: 25,
    expectedCashMinor: 910000,
    countedCashMinor: 905000,
    cashierName: 'Demo Manager',
    notes: 'Shortage of KES 50 change discrepancy.',
  },
];

const initialSales: SaleRecord[] = [
  { id: 's-1', receiptNumber: 'REC-20261016-018', soldAt: new Date(Date.now() - 15 * 60000).toISOString(), totalMinor: 225000, cashierName: 'Demo Manager', customerName: 'John Kamau', paymentMethod: 'mobile_money', itemsCount: 3, paymentReference: 'QKD7104882' },
  { id: 's-2', receiptNumber: 'REC-20261016-017', soldAt: new Date(Date.now() - 42 * 60000).toISOString(), totalMinor: 160000, cashierName: 'Cashier One', customerName: null, paymentMethod: 'cash', itemsCount: 2 },
  { id: 's-3', receiptNumber: 'REC-20261016-016', soldAt: new Date(Date.now() - 75 * 60000).toISOString(), totalMinor: 500000, cashierName: 'Demo Manager', customerName: 'Mercy Wanjiku', paymentMethod: 'mobile_money', itemsCount: 1, paymentReference: 'QKD7092104' },
  { id: 's-4', receiptNumber: 'REC-20261016-015', soldAt: new Date(Date.now() - 110 * 60000).toISOString(), totalMinor: 350000, cashierName: 'Cashier Two', customerName: null, paymentMethod: 'cash', itemsCount: 4 },
  { id: 's-5', receiptNumber: 'REC-20261016-014', soldAt: new Date(Date.now() - 150 * 60000).toISOString(), totalMinor: 180000, cashierName: 'Demo Manager', customerName: 'David Omondi', paymentMethod: 'mobile_money', itemsCount: 2, paymentReference: 'QKD6981123' },
  { id: 's-6', receiptNumber: 'REC-20261016-013', soldAt: new Date(Date.now() - 210 * 60000).toISOString(), totalMinor: 270000, cashierName: 'Cashier One', customerName: null, paymentMethod: 'cash', itemsCount: 1 },
];

function DashboardInner() {
  const { error, info } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // User & Shop state
  const [user, setUser] = useState<User | null>({
    id: 'u-manager',
    fullName: 'Demo Manager',
    email: 'manager@demo.local',
    role: 'manager',
  });
  const [shops, setShops] = useState<Shop[]>(initialShops);
  const [currentShop, setCurrentShop] = useState<Shop | null>(initialShops[0]);

  // Business state
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [currentShift, setCurrentShift] = useState<Shift | null>(initialShift);
  const [shiftsHistory, setShiftsHistory] = useState<Shift[]>(initialShiftsHistory);
  const [salesList, setSalesList] = useState<SaleRecord[]>(initialSales);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(false);

  // Target item for quick restock from overview
  const [targetAdjustProduct, setTargetAdjustProduct] = useState<Product | null>(null);

  // Modals
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [shopModalOpen, setShopModalOpen] = useState(false);

  // Load backend data
  const loadAllData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('pos_access_token');
      if (!token) return;

      const [userRes, shopsRes, prodRes, shiftRes, shiftsListRes, salesRes, staffRes] =
        await Promise.allSettled([
          api.auth.me(),
          api.shops.list(),
          api.products.list(),
          api.shifts.current(),
          api.shifts.list(),
          api.sales.list(50),
          api.settings.staff(),
        ]);

      if (userRes.status === 'fulfilled' && userRes.value?.user) {
        setUser(userRes.value.user);
      }
      if (shopsRes.status === 'fulfilled' && shopsRes.value?.shops?.length) {
        setShops(shopsRes.value.shops);
        if (!currentShop) setCurrentShop(shopsRes.value.shops[0]);
      }
      if (prodRes.status === 'fulfilled' && prodRes.value?.products?.length) {
        setProducts(prodRes.value.products);
      }
      if (shiftRes.status === 'fulfilled') {
        setCurrentShift(shiftRes.value.shift);
      }
      if (shiftsListRes.status === 'fulfilled' && shiftsListRes.value?.shifts?.length) {
        setShiftsHistory(shiftsListRes.value.shifts);
      }
      if (salesRes.status === 'fulfilled' && salesRes.value?.sales?.length) {
        setSalesList(salesRes.value.sales);
      }
      if (staffRes.status === 'fulfilled' && staffRes.value?.staff?.length) {
        setStaffList(staffRes.value.staff);
      }
    } catch {
      // Fallback data remains active
    } finally {
      setLoading(false);
    }
  }, [currentShop]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const lowStockItems = useMemo(() => {
    return products.filter((p) => p.stockQuantity <= p.reorderLevel);
  }, [products]);

  const handleSwitchShop = async (shopId: string) => {
    try {
      const target = shops.find((s) => s.id === shopId);
      if (target) {
        setCurrentShop(target);
        info(`Switched active context to ${target.name}`);
        await api.auth.switchShop(shopId);
        loadAllData();
      }
    } catch {
      // Offline fallback still switches context
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('pos_access_token');
    localStorage.removeItem('pos_refresh_token');
    setAuthModalOpen(true);
  };

  const handleQuickAdjustFromOverview = (product: Product) => {
    setTargetAdjustProduct(product);
    setActiveTab('inventory');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f7f9fb' }}>
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        user={user}
        currentShop={currentShop}
        onOpenShopModal={() => setShopModalOpen(true)}
        onLogout={handleLogout}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <main style={{ flex: 1, minWidth: 0 }}>
        <Header
          currentShop={currentShop}
          currentShift={currentShift}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onOpenShopModal={() => setShopModalOpen(true)}
        />

        <div style={{ paddingTop: 20 }}>
          {activeTab === 'overview' && (
            <OverviewView
              products={products}
              lowStockItems={lowStockItems}
              onNavigateTab={(tab) => setActiveTab(tab)}
              onQuickAdjust={handleQuickAdjustFromOverview}
            />
          )}

          {activeTab === 'sales' && (
            <SalesView
              sales={salesList}
              onRefresh={loadAllData}
              loading={loading}
            />
          )}

          {activeTab === 'inventory' && (
            <InventoryView
              products={products}
              onRefresh={loadAllData}
              loading={loading}
              targetProduct={targetAdjustProduct}
              onClearTargetProduct={() => setTargetAdjustProduct(null)}
            />
          )}

          {activeTab === 'shifts' && (
            <ShiftsView
              currentShift={currentShift}
              shiftsHistory={shiftsHistory}
              onRefresh={loadAllData}
              loading={loading}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView shops={shops} />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              currentShop={currentShop}
              staffList={staffList}
              onUpdateShop={(updated) => setCurrentShop(updated)}
              onOpenShopModal={() => setShopModalOpen(true)}
            />
          )}
        </div>
      </main>

      {/* Modals */}
      <AuthModal
        isOpen={authModalOpen}
        onSuccess={(u) => {
          setUser(u);
          loadAllData();
        }}
        onClose={() => setAuthModalOpen(false)}
      />

      <ShopModal
        isOpen={shopModalOpen}
        shops={shops}
        currentShop={currentShop}
        onSelectShop={handleSwitchShop}
        onClose={() => setShopModalOpen(false)}
      />
    </div>
  );
}

export function App() {
  return (
    <ToastProvider>
      <DashboardInner />
    </ToastProvider>
  );
}
