import { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  FlatList,
  Modal,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

type Product = {
  id: string;
  name: string;
  sku: string;
  category: string;
  sellingPriceMinor: number;
  stock: number;
};

type CartItem = {
  product: Product;
  quantity: number;
};

type Shift = {
  id: string;
  openedAt: string;
  openingFloatMinor: number;
  cashSalesMinor: number;
  salesCount: number;
  cashierName: string;
};

type CompletedSale = {
  receiptNumber: string;
  soldAt: string;
  totalMinor: number;
  paidMinor: number;
  changeMinor: number;
  paymentMethod: 'cash' | 'mobile_money';
  reference?: string;
  items: CartItem[];
  cashierName: string;
};

const initialProducts: Product[] = [
  { id: '1', name: 'Milk 500ml', sku: 'MILK-500', category: 'Groceries', sellingPriceMinor: 9000, stock: 84 },
  { id: '2', name: 'Bread Loaf 800g', sku: 'BREAD-800', category: 'Groceries', sellingPriceMinor: 7000, stock: 45 },
  { id: '3', name: 'Sugar 1kg', sku: 'SUGAR-1K', category: 'Groceries', sellingPriceMinor: 16500, stock: 62 },
  { id: '4', name: 'Rice 2kg', sku: 'RICE-2K', category: 'Groceries', sellingPriceMinor: 30000, stock: 38 },
  { id: '5', name: 'Cooking Oil 1L', sku: 'OIL-1L', category: 'Groceries', sellingPriceMinor: 27000, stock: 19 },
  { id: '6', name: 'Soda 500ml', sku: 'SODA-500', category: 'Drinks', sellingPriceMinor: 6000, stock: 95 },
  { id: '7', name: 'Tea Leaves 250g', sku: 'TEA-250', category: 'Drinks', sellingPriceMinor: 15000, stock: 40 },
  { id: '8', name: 'Soap Bar 125g', sku: 'SOAP-125', category: 'Household', sellingPriceMinor: 8500, stock: 52 },
  { id: '9', name: 'Eggs Tray (30)', sku: 'EGGS-30', category: 'Groceries', sellingPriceMinor: 50000, stock: 14 },
  { id: '10', name: 'Maize Flour 2kg', sku: 'FLOUR-2K', category: 'Groceries', sellingPriceMinor: 16000, stock: 77 },
];

function formatKES(minor: number): string {
  return `KES ${(minor / 100).toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export default function App() {
  // Cashier State
  const [cashierLoggedIn, setCashierLoggedIn] = useState(false);
  const [cashierName, setCashierName] = useState('Cashier One');
  const [enteredPin, setEnteredPin] = useState('');

  // Shift & Till State
  const [currentShift, setCurrentShift] = useState<Shift | null>({
    id: 'shift-1',
    openedAt: new Date().toISOString(),
    openingFloatMinor: 500000,
    cashSalesMinor: 0,
    salesCount: 0,
    cashierName: 'Cashier One',
  });
  const [openShiftModal, setOpenShiftModal] = useState(false);
  const [closeShiftModal, setCloseShiftModal] = useState(false);
  const [openingFloatInput, setOpeningFloatInput] = useState('5000');
  const [countedCashInput, setCountedCashInput] = useState('');

  // Register Products & Cart State
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Checkout & Tender State
  const [cartModalVisible, setCartModalVisible] = useState(false);
  const [checkoutModalVisible, setCheckoutModalVisible] = useState(false);
  const [tenderMethod, setTenderMethod] = useState<'cash' | 'mobile_money'>('mobile_money');
  const [tenderedCash, setTenderedCash] = useState<number>(0);
  const [mpesaCode, setMpesaCode] = useState('');
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [lastSale, setLastSale] = useState<CompletedSale | null>(null);

  // Keypad PIN handling
  const handleKeypadPress = (val: string) => {
    if (val === 'C') {
      setEnteredPin('');
      return;
    }
    if (val === '⌫') {
      setEnteredPin((prev) => prev.slice(0, -1));
      return;
    }
    if (enteredPin.length < 4) {
      const nextPin = enteredPin + val;
      setEnteredPin(nextPin);
      if (nextPin.length === 4) {
        if (nextPin === '1234') {
          setTimeout(() => {
            setCashierLoggedIn(true);
            setEnteredPin('');
          }, 200);
        } else {
          Alert.alert('Invalid PIN', 'Please enter your 4-digit cashier PIN (Demo: 1234).');
          setEnteredPin('');
        }
      }
    }
  };

  // Cart actions
  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateCartQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const nextQty = item.quantity + delta;
            return nextQty > 0 ? { ...item, quantity: nextQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[],
    );
  };

  const removeCartItem = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const cartTotalMinor = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.product.sellingPriceMinor * item.quantity, 0);
  }, [cart]);

  const cartCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  // Filter products
  const filteredProducts = useMemo(() => {
    let list = products;
    if (selectedCategory !== 'All') {
      list = list.filter((p) => p.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q),
      );
    }
    return list;
  }, [products, searchQuery, selectedCategory]);

  const handleOpenCheckout = () => {
    setTenderedCash(cartTotalMinor / 100);
    setMpesaCode(`MP-${Math.floor(100000 + Math.random() * 900000)}`);
    setCartModalVisible(false);
    setCheckoutModalVisible(true);
  };

  const handleCompleteSale = () => {
    const paidMinor = tenderMethod === 'cash' ? Math.round(tenderedCash * 100) : cartTotalMinor;
    const changeMinor = paidMinor > cartTotalMinor ? paidMinor - cartTotalMinor : 0;
    const receiptNum = `RS-${Date.now().toString().slice(-6)}`;

    const saleRecord: CompletedSale = {
      receiptNumber: receiptNum,
      soldAt: new Date().toLocaleTimeString(),
      totalMinor: cartTotalMinor,
      paidMinor,
      changeMinor,
      paymentMethod: tenderMethod,
      reference: tenderMethod === 'mobile_money' ? mpesaCode : undefined,
      items: [...cart],
      cashierName,
    };

    // Update stock levels
    setProducts((prev) =>
      prev.map((p) => {
        const sold = cart.find((c) => c.product.id === p.id);
        return sold ? { ...p, stock: Math.max(0, p.stock - sold.quantity) } : p;
      }),
    );

    // Update shift metrics
    if (currentShift) {
      setCurrentShift({
        ...currentShift,
        salesCount: currentShift.salesCount + 1,
        cashSalesMinor: currentShift.cashSalesMinor + (tenderMethod === 'cash' ? cartTotalMinor : 0),
      });
    }

    setLastSale(saleRecord);
    setCart([]);
    setCheckoutModalVisible(false);
    setReceiptModalVisible(true);
  };

  // Shift Management Handlers
  const handleOpenShift = () => {
    const floatMinor = Math.round(Number(openingFloatInput) * 100);
    setCurrentShift({
      id: `shift-${Date.now()}`,
      openedAt: new Date().toISOString(),
      openingFloatMinor: floatMinor,
      cashSalesMinor: 0,
      salesCount: 0,
      cashierName,
    });
    setOpenShiftModal(false);
    Alert.alert('Shift Started', `Till opened with ${formatKES(floatMinor)} float.`);
  };

  const handleCloseShift = () => {
    if (!currentShift) return;
    const countedMinor = Math.round(Number(countedCashInput) * 100);
    const expectedMinor = currentShift.openingFloatMinor + currentShift.cashSalesMinor;
    const diff = countedMinor - expectedMinor;

    Alert.alert(
      'Till Reconciled & Closed',
      `Expected Cash: ${formatKES(expectedMinor)}\nCounted Cash: ${formatKES(countedMinor)}\nVariance: ${formatKES(diff)}`,
      [
        {
          text: 'Done',
          onPress: () => {
            setCurrentShift(null);
            setCloseShiftModal(false);
            setCountedCashInput('');
            setCashierLoggedIn(false);
          },
        },
      ],
    );
  };

  // ================= 1. CASHIER PIN LOGIN SCREEN =================
  if (!cashierLoggedIn) {
    return (
      <SafeAreaView style={styles.loginContainer}>
        <StatusBar style="light" />
        <View style={styles.loginHeader}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoBadgeText}>P</Text>
          </View>
          <Text style={styles.appTitle}>PesaPOS Terminal</Text>
          <Text style={styles.shopSubtitle}>Demo CBD Shop · Cashier APK</Text>
        </View>

        <View style={styles.cashierSelectRow}>
          <TouchableOpacity
            style={[styles.cashierChip, cashierName === 'Cashier One' && styles.cashierChipActive]}
            onPress={() => setCashierName('Cashier One')}
          >
            <Text style={[styles.cashierChipText, cashierName === 'Cashier One' && styles.cashierChipTextActive]}>
              Cashier One
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.cashierChip, cashierName === 'Cashier Two' && styles.cashierChipActive]}
            onPress={() => setCashierName('Cashier Two')}
          >
            <Text style={[styles.cashierChipText, cashierName === 'Cashier Two' && styles.cashierChipTextActive]}>
              Cashier Two
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.pinPrompt}>Enter 4-Digit Cashier PIN</Text>
        <View style={styles.pinDotsRow}>
          {[0, 1, 2, 3].map((idx) => (
            <View
              key={idx}
              style={[styles.pinDot, enteredPin.length > idx && styles.pinDotFilled]}
            />
          ))}
        </View>

        {/* Touch Keypad */}
        <View style={styles.keypadGrid}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((key) => (
            <TouchableOpacity
              key={key}
              style={styles.keypadKey}
              onPress={() => handleKeypadPress(key)}
            >
              <Text style={styles.keypadKeyText}>{key}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.quickPinBtn}
          onPress={() => {
            setEnteredPin('1234');
            setTimeout(() => setCashierLoggedIn(true), 200);
          }}
        >
          <Text style={styles.quickPinText}>Tap to autofill demo PIN: 1234</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ================= 2. ACTIVE POS REGISTER SCREEN =================
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Top Cashier Status Bar */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.topBarTitle}>🛒 {cashierName}</Text>
          <Text style={styles.topBarShop}>CBD Branch · Till Active</Text>
        </View>

        <View style={styles.topBarActions}>
          {currentShift ? (
            <TouchableOpacity
              style={styles.shiftPill}
              onPress={() => setCloseShiftModal(true)}
            >
              <Text style={styles.shiftPillText}>Till: {formatKES(currentShift.cashSalesMinor)}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.shiftPill, { backgroundColor: '#ffebe6' }]}
              onPress={() => setOpenShiftModal(true)}
            >
              <Text style={[styles.shiftPillText, { color: '#c05e50' }]}>Till Closed</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.lockBtn}
            onPress={() => setCashierLoggedIn(false)}
          >
            <Text style={styles.lockBtnText}>🔒 Lock</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search & Category Pills */}
      <View style={styles.filterBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="⌕  Scan barcode or search product..."
          placeholderTextColor="#8a99a8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          {['All', 'Groceries', 'Drinks', 'Household'].map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.categoryPill, selectedCategory === cat && styles.categoryPillActive]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text
                style={[
                  styles.categoryPillText,
                  selectedCategory === cat && styles.categoryPillTextActive,
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Product Catalog Grid */}
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.productList}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.productCard}
            onPress={() => addToCart(item)}
            activeOpacity={0.7}
          >
            <View>
              <Text style={styles.productName}>{item.name}</Text>
              <Text style={styles.productSku}>{item.sku}</Text>
            </View>

            <View style={styles.productCardFooter}>
              <Text style={styles.productPrice}>{formatKES(item.sellingPriceMinor)}</Text>
              <Text style={[styles.productStock, item.stock <= 20 && styles.productStockLow]}>
                {item.stock} left
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Floating Bottom Cart Bar */}
      {cartCount > 0 && (
        <View style={styles.bottomCartBar}>
          <TouchableOpacity
            style={styles.cartBarBtn}
            onPress={() => setCartModalVisible(true)}
            activeOpacity={0.8}
          >
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartCount}</Text>
            </View>
            <Text style={styles.cartBarTotal}>Total: {formatKES(cartTotalMinor)}</Text>
            <Text style={styles.cartBarCheckout}>View Basket →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ================= MODAL: CART & ORDER DETAILS ================= */}
      <Modal visible={cartModalVisible} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Active Order ({cartCount} items)</Text>
            <TouchableOpacity onPress={() => setCartModalVisible(false)}>
              <Text style={styles.modalCloseText}>Done</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={cart}
            keyExtractor={(item) => item.product.id}
            contentContainerStyle={styles.cartList}
            renderItem={({ item }) => (
              <View style={styles.cartItemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cartItemName}>{item.product.name}</Text>
                  <Text style={styles.cartItemUnitPrice}>{formatKES(item.product.sellingPriceMinor)}</Text>
                </View>

                <View style={styles.qtyControlRow}>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => updateCartQuantity(item.product.id, -1)}
                  >
                    <Text style={styles.qtyBtnText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.qtyText}>{item.quantity}</Text>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => updateCartQuantity(item.product.id, 1)}
                  >
                    <Text style={styles.qtyBtnText}>+</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.cartItemTotal}>
                  {formatKES(item.product.sellingPriceMinor * item.quantity)}
                </Text>

                <TouchableOpacity
                  style={styles.cartRemoveBtn}
                  onPress={() => removeCartItem(item.product.id)}
                >
                  <Text style={styles.cartRemoveText}>×</Text>
                </TouchableOpacity>
              </View>
            )}
          />

          <View style={styles.cartFooter}>
            <View style={styles.cartSummaryRow}>
              <Text style={styles.cartSummaryLabel}>Subtotal</Text>
              <Text style={styles.cartSummaryVal}>{formatKES(cartTotalMinor)}</Text>
            </View>
            <View style={[styles.cartSummaryRow, { marginTop: 4, marginBottom: 12 }]}>
              <Text style={styles.cartSummaryLabelTotal}>Total Due</Text>
              <Text style={styles.cartSummaryValTotal}>{formatKES(cartTotalMinor)}</Text>
            </View>

            <TouchableOpacity style={styles.checkoutBtn} onPress={handleOpenCheckout}>
              <Text style={styles.checkoutBtnText}>Proceed to Payment ({formatKES(cartTotalMinor)})</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* ================= MODAL: PAYMENT TENDER ================= */}
      <Modal visible={checkoutModalVisible} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Tender Settlement</Text>
            <TouchableOpacity onPress={() => setCheckoutModalVisible(false)}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ padding: 20 }}>
            <View style={styles.tenderTotalBox}>
              <Text style={styles.tenderTotalLabel}>TOTAL AMOUNT DUE</Text>
              <Text style={styles.tenderTotalValue}>{formatKES(cartTotalMinor)}</Text>
            </View>

            {/* Tender Method Switcher */}
            <View style={styles.tenderTabs}>
              <TouchableOpacity
                style={[styles.tenderTab, tenderMethod === 'mobile_money' && styles.tenderTabActive]}
                onPress={() => setTenderMethod('mobile_money')}
              >
                <Text style={[styles.tenderTabText, tenderMethod === 'mobile_money' && styles.tenderTabTextActive]}>
                  📱 M-Pesa Mobile
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tenderTab, tenderMethod === 'cash' && styles.tenderTabActive]}
                onPress={() => setTenderMethod('cash')}
              >
                <Text style={[styles.tenderTabText, tenderMethod === 'cash' && styles.tenderTabTextActive]}>
                  💵 Cash Drawer
                </Text>
              </TouchableOpacity>
            </View>

            {tenderMethod === 'cash' ? (
              <View>
                <Text style={styles.fieldLabel}>Amount Tendered (KES)</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="numeric"
                  value={tenderedCash.toString()}
                  onChangeText={(val) => setTenderedCash(Number(val) || 0)}
                />

                <View style={styles.quickCashGrid}>
                  {[
                    { label: 'Exact', val: cartTotalMinor / 100 },
                    { label: '+100', val: (cartTotalMinor / 100) + 100 },
                    { label: '+500', val: (cartTotalMinor / 100) + 500 },
                    { label: '1,000', val: 1000 },
                    { label: '2,000', val: 2000 },
                  ].map((chip) => (
                    <TouchableOpacity
                      key={chip.label}
                      style={styles.chipBtn}
                      onPress={() => setTenderedCash(chip.val)}
                    >
                      <Text style={styles.chipBtnText}>{chip.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {tenderedCash >= cartTotalMinor / 100 && (
                  <View style={styles.changeBanner}>
                    <Text style={styles.changeBannerText}>
                      Change Due: {formatKES(Math.round(tenderedCash * 100 - cartTotalMinor))}
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <View>
                <Text style={styles.fieldLabel}>M-Pesa Transaction Code</Text>
                <TextInput
                  style={styles.textInput}
                  value={mpesaCode}
                  onChangeText={setMpesaCode}
                  placeholder="e.g. QHK894129"
                />
                <Text style={{ fontSize: 12, color: '#778899', marginTop: 8 }}>
                  Verify transaction SMS on customer phone before finalizing.
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.checkoutBtn, { marginTop: 24 }]}
              onPress={handleCompleteSale}
            >
              <Text style={styles.checkoutBtnText}>Complete Sale & Print Receipt</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ================= MODAL: RECEIPT CONFIRMATION ================= */}
      {lastSale && (
        <Modal visible={receiptModalVisible} animationType="fade">
          <SafeAreaView style={[styles.modalContainer, { backgroundColor: '#f0f4f8' }]}>
            <View style={{ padding: 24, flex: 1, justifyContent: 'center' }}>
              <View style={styles.receiptCard}>
                <Text style={styles.receiptShopName}>DEMO SUPERMARKET</Text>
                <Text style={styles.receiptShopSub}>CBD Shop · Nairobi, Kenya</Text>
                <Text style={styles.receiptShopSub}>Receipt: {lastSale.receiptNumber}</Text>
                <Text style={styles.receiptShopSub}>Cashier: {lastSale.cashierName}</Text>
                <View style={styles.dashedLine} />

                {lastSale.items.map((it, idx) => (
                  <View key={idx} style={styles.receiptRow}>
                    <Text style={styles.receiptItemName}>{it.product.name} x{it.quantity}</Text>
                    <Text style={styles.receiptItemPrice}>
                      {formatKES(it.product.sellingPriceMinor * it.quantity)}
                    </Text>
                  </View>
                ))}

                <View style={styles.dashedLine} />
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptGrandLabel}>TOTAL DUE:</Text>
                  <Text style={styles.receiptGrandVal}>{formatKES(lastSale.totalMinor)}</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptSub}>Paid ({lastSale.paymentMethod === 'mobile_money' ? 'M-Pesa' : 'Cash'}):</Text>
                  <Text style={styles.receiptSub}>{formatKES(lastSale.paidMinor)}</Text>
                </View>
                {lastSale.changeMinor > 0 && (
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptSub}>Change:</Text>
                    <Text style={styles.receiptSub}>{formatKES(lastSale.changeMinor)}</Text>
                  </View>
                )}

                <Text style={styles.receiptFooterText}>Thank you for shopping with us!</Text>
              </View>

              <TouchableOpacity
                style={[styles.checkoutBtn, { marginTop: 20 }]}
                onPress={() => setReceiptModalVisible(false)}
              >
                <Text style={styles.checkoutBtnText}>New Order</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Modal>
      )}

      {/* ================= MODAL: OPEN SHIFT ================= */}
      <Modal visible={openShiftModal} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Open Cash Register</Text>
            <TouchableOpacity onPress={() => setOpenShiftModal(false)}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
          <View style={{ padding: 20 }}>
            <Text style={styles.fieldLabel}>Opening Float in Drawer (KES)</Text>
            <TextInput
              style={styles.textInput}
              keyboardType="numeric"
              value={openingFloatInput}
              onChangeText={setOpeningFloatInput}
              placeholder="e.g. 5000"
            />
            <TouchableOpacity
              style={[styles.checkoutBtn, { marginTop: 20 }]}
              onPress={handleOpenShift}
            >
              <Text style={styles.checkoutBtnText}>Start Shift</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* ================= MODAL: CLOSE SHIFT ================= */}
      {currentShift && (
        <Modal visible={closeShiftModal} animationType="slide">
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Close Register Till</Text>
              <TouchableOpacity onPress={() => setCloseShiftModal(false)}>
                <Text style={styles.modalCloseText}>Cancel</Text>
              </TouchableOpacity>
            </View>
            <View style={{ padding: 20 }}>
              <View style={styles.shiftAuditBox}>
                <Text style={styles.auditRow}>Opening Float: {formatKES(currentShift.openingFloatMinor)}</Text>
                <Text style={styles.auditRow}>Cash Sales: {formatKES(currentShift.cashSalesMinor)}</Text>
                <Text style={[styles.auditRow, { fontWeight: 'bold', color: '#147c70' }]}>
                  Expected Total: {formatKES(currentShift.openingFloatMinor + currentShift.cashSalesMinor)}
                </Text>
              </View>

              <Text style={styles.fieldLabel}>Counted Physical Cash in Drawer (KES)</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                value={countedCashInput}
                onChangeText={setCountedCashInput}
                placeholder="e.g. 5000"
              />

              <TouchableOpacity
                style={[styles.checkoutBtn, { marginTop: 20 }]}
                onPress={handleCloseShift}
              >
                <Text style={styles.checkoutBtnText}>Reconcile & Close Till</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // PIN Login Screen Styles
  loginContainer: { flex: 1, backgroundColor: '#0d253d', alignItems: 'center', justifyContent: 'center', padding: 24 },
  loginHeader: { alignItems: 'center', marginBottom: 20 },
  logoBadge: { width: 50, height: 50, borderRadius: 12, backgroundColor: '#5fd6b5', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  logoBadgeText: { fontSize: 28, fontWeight: '900', color: '#0d253d' },
  appTitle: { fontSize: 24, fontWeight: '800', color: '#ffffff' },
  shopSubtitle: { fontSize: 13, color: '#90aabf', marginTop: 4 },
  cashierSelectRow: { flexDirection: 'row', gap: 10, marginVertical: 14 },
  cashierChip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#183c5b' },
  cashierChipActive: { backgroundColor: '#147c70' },
  cashierChipText: { color: '#9bb4c6', fontSize: 12, fontWeight: '600' },
  cashierChipTextActive: { color: '#ffffff', fontWeight: 'bold' },
  pinPrompt: { fontSize: 13, color: '#bdd0df', marginTop: 10 },
  pinDotsRow: { flexDirection: 'row', gap: 14, marginVertical: 16 },
  pinDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: '#5fd6b5' },
  pinDotFilled: { backgroundColor: '#5fd6b5' },
  keypadGrid: { width: 280, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  keypadKey: { width: 80, height: 60, borderRadius: 10, backgroundColor: '#183c5b', alignItems: 'center', justifyContent: 'center' },
  keypadKeyText: { fontSize: 22, fontWeight: 'bold', color: '#ffffff' },
  quickPinBtn: { marginTop: 20, padding: 10 },
  quickPinText: { color: '#5fd6b5', fontSize: 12, textDecorationLine: 'underline' },

  // Register Screen Styles
  container: { flex: 1, backgroundColor: '#f6f8fa' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#eef2f5' },
  topBarTitle: { fontSize: 16, fontWeight: '800', color: '#162b3d' },
  topBarShop: { fontSize: 11, color: '#7c8e9d' },
  topBarActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  shiftPill: { backgroundColor: '#e5f6f0', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 },
  shiftPillText: { fontSize: 11, fontWeight: '700', color: '#147c70' },
  lockBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#f0f3f6' },
  lockBtnText: { fontSize: 11, fontWeight: '600', color: '#556677' },

  filterBar: { padding: 12, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#edf1f4' },
  searchInput: { backgroundColor: '#f4f7f9', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, fontSize: 13, color: '#112233' },
  categoryScroll: { marginTop: 10 },
  categoryPill: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 16, backgroundColor: '#f0f4f7', marginRight: 8 },
  categoryPillActive: { backgroundColor: '#147c70' },
  categoryPillText: { fontSize: 12, color: '#596b7a', fontWeight: '600' },
  categoryPillTextActive: { color: '#ffffff' },

  productList: { padding: 10 },
  productCard: { flex: 1, backgroundColor: '#ffffff', borderRadius: 10, padding: 12, margin: 6, minHeight: 110, justifyContent: 'space-between', borderWidth: 1, borderColor: '#e4ebf0' },
  productName: { fontSize: 13, fontWeight: '700', color: '#192b3a' },
  productSku: { fontSize: 11, color: '#8898a6', marginTop: 2 },
  productCardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 10 },
  productPrice: { fontSize: 14, fontWeight: '800', color: '#147c70' },
  productStock: { fontSize: 10, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: '#f0f4f7', color: '#556677' },
  productStockLow: { backgroundColor: '#ffebe6', color: '#c05e50', fontWeight: 'bold' },

  bottomCartBar: { position: 'absolute', bottom: 20, left: 16, right: 16 },
  cartBarBtn: { backgroundColor: '#147c70', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6 },
  cartBadge: { backgroundColor: '#ffffff', width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  cartBadgeText: { color: '#147c70', fontWeight: '800', fontSize: 12 },
  cartBarTotal: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
  cartBarCheckout: { color: '#5fd6b5', fontWeight: '700', fontSize: 13 },

  // Modal Styles
  modalContainer: { flex: 1, backgroundColor: '#ffffff' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#edf1f4' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#182b3c' },
  modalCloseText: { fontSize: 14, fontWeight: '700', color: '#147c70' },
  cartList: { padding: 16 },
  cartItemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f4f7' },
  cartItemName: { fontSize: 14, fontWeight: '700', color: '#1a2c3b' },
  cartItemUnitPrice: { fontSize: 12, color: '#8293a1', marginTop: 2 },
  qtyControlRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f4f7f9', borderRadius: 6, paddingHorizontal: 4 },
  qtyBtn: { paddingHorizontal: 10, paddingVertical: 4 },
  qtyBtnText: { fontSize: 16, fontWeight: 'bold', color: '#334455' },
  qtyText: { fontSize: 13, fontWeight: '700', minWidth: 20, textAlign: 'center' },
  cartItemTotal: { fontSize: 14, fontWeight: '800', color: '#147c70', minWidth: 70, textAlign: 'right' },
  cartRemoveBtn: { paddingLeft: 12 },
  cartRemoveText: { fontSize: 18, color: '#a2b1be' },

  cartFooter: { padding: 20, borderTopWidth: 1, borderTopColor: '#edf1f4', backgroundColor: '#fafcfd' },
  cartSummaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  cartSummaryLabel: { fontSize: 13, color: '#667788' },
  cartSummaryVal: { fontSize: 13, fontWeight: '600', color: '#223344' },
  cartSummaryLabelTotal: { fontSize: 17, fontWeight: '800', color: '#142535' },
  cartSummaryValTotal: { fontSize: 18, fontWeight: '800', color: '#147c70' },
  checkoutBtn: { backgroundColor: '#147c70', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  checkoutBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '800' },

  // Tender Screen Styles
  tenderTotalBox: { backgroundColor: '#f4faf8', borderRadius: 10, padding: 18, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#d3eee6' },
  tenderTotalLabel: { fontSize: 11, color: '#147c70', fontWeight: '700', letterSpacing: 1 },
  tenderTotalValue: { fontSize: 26, fontWeight: '900', color: '#147c70', marginTop: 4 },
  tenderTabs: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  tenderTab: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#dbe3e8', alignItems: 'center' },
  tenderTabActive: { backgroundColor: '#e5f6f0', borderColor: '#147c70' },
  tenderTabText: { fontSize: 13, fontWeight: '600', color: '#556677' },
  tenderTabTextActive: { color: '#147c70', fontWeight: '800' },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#2b3d4f', marginBottom: 6 },
  textInput: { borderWidth: 1, borderColor: '#d8e1e7', borderRadius: 8, padding: 12, fontSize: 15, backgroundColor: '#ffffff', color: '#112233' },
  quickCashGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  chipBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, backgroundColor: '#f0f4f7', borderWidth: 1, borderColor: '#dbe4ea' },
  chipBtnText: { fontSize: 12, fontWeight: '700', color: '#334455' },
  changeBanner: { marginTop: 16, backgroundColor: '#e5f6f0', padding: 14, borderRadius: 8, alignItems: 'center' },
  changeBannerText: { fontSize: 16, fontWeight: '800', color: '#147c70' },

  // Receipt Styles
  receiptCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 22, borderWidth: 1, borderColor: '#d8e2e9' },
  receiptShopName: { fontSize: 18, fontWeight: '800', textAlign: 'center', color: '#112233' },
  receiptShopSub: { fontSize: 11, color: '#778899', textAlign: 'center', marginTop: 2 },
  dashedLine: { borderBottomWidth: 1, borderBottomColor: '#c8d4dc', borderStyle: 'dashed', marginVertical: 12 },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 3 },
  receiptItemName: { fontSize: 12, color: '#223344' },
  receiptItemPrice: { fontSize: 12, fontWeight: '600', color: '#223344' },
  receiptGrandLabel: { fontSize: 15, fontWeight: '800', color: '#112233' },
  receiptGrandVal: { fontSize: 16, fontWeight: '800', color: '#147c70' },
  receiptSub: { fontSize: 12, color: '#667788' },
  receiptFooterText: { textAlign: 'center', fontSize: 11, color: '#8899aa', marginTop: 16 },

  // Shift Audit Box
  shiftAuditBox: { backgroundColor: '#f6f9fb', padding: 14, borderRadius: 8, marginBottom: 16 },
  auditRow: { fontSize: 13, color: '#334455', marginVertical: 3 },
});
