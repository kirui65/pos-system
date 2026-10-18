export type Tab = 'overview' | 'sales' | 'inventory' | 'shifts' | 'reports' | 'settings';

export interface User {
  id: string;
  fullName: string;
  email: string | null;
  role: 'manager' | 'cashier' | string;
  businessId?: string;
  shopId?: string;
}

export interface Shop {
  id: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  currencyCode?: string;
  taxRateBps?: number;
  receiptFooter?: string | null;
}

export interface Category {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  categoryId?: string | null;
  category?: string;
  costPriceMinor: number;
  sellingPriceMinor: number;
  stockQuantity: number;
  reorderLevel: number;
  trackStock: boolean;
}

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  totalSpentMinor: number;
  ordersCount: number;
}

export interface SaleItem {
  id: string;
  productId: string;
  name: string;
  quantity: number;
  unitPriceMinor: number;
  lineTotalMinor: number;
}

export interface SaleRecord {
  id: string;
  receiptNumber: string;
  soldAt: string;
  totalMinor: number;
  cashierName: string;
  customerName?: string | null;
  paymentMethod: 'cash' | 'mobile_money' | string;
  itemsCount: number;
  items?: SaleItem[];
  paymentReference?: string | null;
}

export interface SalePayment {
  id: string;
  method: 'cash' | 'mobile_money' | string;
  amountMinor: number;
  reference?: string | null;
}

export interface SaleDetail {
  id: string;
  receiptNumber: string;
  subtotalMinor: number;
  discountMinor: number;
  taxMinor: number;
  totalMinor: number;
  paidMinor: number;
  changeMinor: number;
  status: string;
  soldAt: string;
  cashierName: string;
  customerName?: string | null;
  shopName?: string | null;
  items: SaleItem[];
  payments: SalePayment[];
}

export interface Shift {
  id: string;
  openedAt: string;
  closedAt?: string | null;
  openingFloatMinor: number;
  cashSalesMinor: number;
  salesCount: number;
  expectedCashMinor?: number | null;
  countedCashMinor?: number | null;
  cashierName: string;
  notes?: string | null;
}

export interface StockMovement {
  id: string;
  productName: string;
  type: 'sale' | 'receive' | 'waste' | 'transfer_in' | 'transfer_out' | 'count_adjust' | string;
  quantityChange: number;
  unitCostMinor: number;
  reason: string;
  createdAt: string;
  userName: string;
}

export interface DashboardSummary {
  totalRevenueMinor: number;
  salesCount: number;
  averageTicketMinor: number;
  cashTotalMinor: number;
  mpesaTotalMinor: number;
  estimatedProfitMinor: number;
  range: string;
}

export interface DailyTrendPoint {
  day: string;
  dayOfWeek: string;
  transactionsCount: number;
  revenueMinor: number;
}

export interface TopProductItem {
  name: string;
  quantitySold: number;
  totalRevenueMinor: number;
}

export interface StaffMember {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  role: string;
  isActive: boolean;
}
