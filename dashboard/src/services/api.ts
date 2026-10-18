import {
  Product,
  Customer,
  Shop,
  SaleRecord,
  SaleDetail,
  Shift,
  StockMovement,
  DashboardSummary,
  DailyTrendPoint,
  TopProductItem,
  StaffMember,
  User,
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

function getHeaders(): HeadersInit {
  const token = localStorage.getItem('pos_access_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      ...getHeaders(),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    let errMessage = `Request failed: ${res.statusText}`;
    try {
      const errData = await res.json();
      if (errData.message) errMessage = errData.message;
    } catch {
      // ignore
    }
    throw new Error(errMessage);
  }

  return res.json();
}

export const api = {
  // Auth
  auth: {
    me: () => request<{ user: User; businessId: string; shopId: string }>('/auth/me'),
    cashiers: () => request<{ cashiers: Array<{ id: string; fullName: string; role: string }> }>('/auth/cashiers'),
    login: (email: string, password: string) =>
      request<{ accessToken: string; refreshToken: string; user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    pinLogin: (userId: string, pin: string) =>
      request<{ accessToken: string; refreshToken: string; user: User }>('/auth/pin-login', {
        method: 'POST',
        body: JSON.stringify({ userId, pin }),
      }),
    switchShop: (shopId: string) =>
      request<{ accessToken: string; refreshToken: string; user: User }>('/auth/switch-shop', {
        method: 'POST',
        body: JSON.stringify({ shopId }),
      }),
  },

  // Shops
  shops: {
    list: () => request<{ shops: Shop[] }>('/shops'),
  },

  // Products & Inventory
  products: {
    list: () => request<{ products: Product[] }>('/products'),
    create: (data: Partial<Product>) =>
      request<{ product: Product }>('/products', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<Product>) =>
      request<{ product: Product }>(`/products/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: string) => request<{ message: string; id: string }>(`/products/${id}`, { method: 'DELETE' }),
  },

  inventory: {
    list: () => request<{ inventory: Array<{ id: string; name: string; sku: string | null; barcode: string | null; quantity: number; reorderLevel: number }> }>('/inventory'),
    lowStock: () => request<{ products: Array<{ id: string; name: string; sku: string | null; quantity: number; reorderLevel: number }> }>('/inventory/low-stock'),
    adjust: (data: { productId: string; quantityChange: number; type: string; reason?: string }) =>
      request<{ productId: string; newQuantity: number }>('/inventory/adjust', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    movements: () => request<{ movements: StockMovement[] }>('/inventory/movements'),
  },

  // Sales
  sales: {
    list: (limit = 50) => request<{ sales: SaleRecord[] }>(`/sales?limit=${limit}`),
    getById: (id: string) => request<{ sale: SaleDetail }>(`/sales/${id}`),
  },

  // Shifts & Till
  shifts: {
    current: () => request<{ shift: Shift | null }>('/shifts/current'),
    list: () => request<{ shifts: Shift[] }>('/shifts'),
    open: (openingFloatMinor: number) =>
      request<{ shift: Shift }>('/shifts/open', {
        method: 'POST',
        body: JSON.stringify({ openingFloatMinor }),
      }),
    close: (shiftId: string, countedCashMinor: number, notes?: string) =>
      request<{ shift: Shift; differenceMinor: number }>('/shifts/close', {
        method: 'POST',
        body: JSON.stringify({ shiftId, countedCashMinor, notes }),
      }),
  },

  // Reports
  reports: {
    summary: (range: 'today' | 'week' | 'month' | 'all' = 'today') =>
      request<{ summary: DashboardSummary }>(`/reports/summary?range=${range}`),
    topProducts: () => request<{ topProducts: TopProductItem[] }>('/reports/top-products'),
    dailyTrend: () => request<{ trend: DailyTrendPoint[] }>('/reports/daily-trend'),
  },

  // Settings
  settings: {
    get: () => request<{ shop: Shop }>('/settings'),
    updateShop: (data: Partial<Shop>) =>
      request<{ shop: Shop }>('/settings/shop', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    staff: () => request<{ staff: StaffMember[] }>('/staff'),
  },
};
