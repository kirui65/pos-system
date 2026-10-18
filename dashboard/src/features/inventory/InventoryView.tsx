import React, { useState, useMemo, useEffect } from 'react';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import {
  Search,
  Plus,
  Download,
  AlertTriangle,
  RefreshCw,
  ArrowRightLeft,
} from '../../components/ui/Icon';
import { formatKES, formatDateTime, calculateMargin, exportToCSV } from '../../utils/formatters';
import { Product, StockMovement } from '../../types';
import { api } from '../../services/api';
import { useToast } from '../../components/ui/Toast';

interface InventoryViewProps {
  products: Product[];
  onRefresh: () => void;
  loading: boolean;
  targetProduct?: Product | null;
  onClearTargetProduct?: () => void;
}

export function InventoryView({
  products,
  onRefresh,
  loading,
  targetProduct,
  onClearTargetProduct,
}: InventoryViewProps) {
  const { success, error } = useToast();
  const [subTab, setSubTab] = useState<'catalogue' | 'movements'>('catalogue');
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Modals
  const [adjustModal, setAdjustModal] = useState<Product | null>(null);
  const [adjustQty, setAdjustQty] = useState('10');
  const [adjustType, setAdjustType] = useState<'receive' | 'waste' | 'count_adjust'>('receive');
  const [adjustReason, setAdjustReason] = useState('Supplier restock');
  const [adjusting, setAdjusting] = useState(false);

  const [createModal, setCreateModal] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdSku, setNewProdSku] = useState('');
  const [newProdBarcode, setNewProdBarcode] = useState('');
  const [newProdCost, setNewProdCost] = useState('');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdReorder, setNewProdReorder] = useState('10');
  const [creating, setCreating] = useState(false);

  // Movements audit log
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(false);

  // If a target product is passed from overview quick adjust:
  useEffect(() => {
    if (targetProduct) {
      setAdjustModal(targetProduct);
      if (onClearTargetProduct) onClearTargetProduct();
    }
  }, [targetProduct, onClearTargetProduct]);

  const loadMovements = async () => {
    try {
      setLoadingMovements(true);
      const res = await api.inventory.movements();
      if (res.movements) setMovements(res.movements);
    } catch {
      // Fallback demo movements
      setMovements([
        { id: 'sm-1', productName: 'Milk 500ml', type: 'receive', quantityChange: 50, unitCostMinor: 7000, reason: 'Supplier delivery', createdAt: new Date(Date.now() - 3600000).toISOString(), userName: 'Demo Manager' },
        { id: 'sm-2', productName: 'Eggs Tray', type: 'waste', quantityChange: -2, unitCostMinor: 42000, reason: 'Broken in transit', createdAt: new Date(Date.now() - 7200000).toISOString(), userName: 'Demo Manager' },
        { id: 'sm-3', productName: 'Sugar 1kg', type: 'receive', quantityChange: 20, unitCostMinor: 14000, reason: 'Bulk replenishment', createdAt: new Date(Date.now() - 86400000).toISOString(), userName: 'Demo Manager' },
      ]);
    } finally {
      setLoadingMovements(false);
    }
  };

  useEffect(() => {
    if (subTab === 'movements') {
      loadMovements();
    }
  }, [subTab]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(search.toLowerCase())) ||
        (p.barcode && p.barcode.toLowerCase().includes(search.toLowerCase()));

      const matchLowStock = lowStockOnly ? p.stockQuantity <= p.reorderLevel : true;
      return matchSearch && matchLowStock;
    });
  }, [products, search, lowStockOnly]);

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustModal) return;
    try {
      setAdjusting(true);
      const qtyChange = Number(adjustQty) * (adjustType === 'waste' ? -1 : 1);
      await api.inventory.adjust({
        productId: adjustModal.id,
        quantityChange: qtyChange,
        type: adjustType,
        reason: adjustReason,
      });
      success(`Updated stock for ${adjustModal.name}`);
      setAdjustModal(null);
      setAdjustQty('10');
      onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Adjustment failed';
      error(msg);
    } finally {
      setAdjusting(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreating(true);
      const costMinor = Math.round(Number(newProdCost) * 100);
      const priceMinor = Math.round(Number(newProdPrice) * 100);
      await api.products.create({
        name: newProdName,
        sku: newProdSku || null,
        barcode: newProdBarcode || null,
        costPriceMinor: costMinor,
        sellingPriceMinor: priceMinor,
        reorderLevel: Number(newProdReorder) || 10,
        trackStock: true,
      });
      success(`Product "${newProdName}" added to catalogue.`);
      setCreateModal(false);
      setNewProdName('');
      setNewProdSku('');
      setNewProdBarcode('');
      setNewProdCost('');
      setNewProdPrice('');
      onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add product';
      error(msg);
    } finally {
      setCreating(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Product Name', 'SKU', 'Barcode', 'Cost (KES)', 'Selling Price (KES)', 'Stock', 'Min Level', 'Margin %'];
    const rows = filteredProducts.map((p) => [
      p.name,
      p.sku || '',
      p.barcode || '',
      ((p.costPriceMinor || 0) / 100).toFixed(2),
      ((p.sellingPriceMinor || 0) / 100).toFixed(2),
      p.stockQuantity,
      p.reorderLevel,
      `${calculateMargin(p.costPriceMinor, p.sellingPriceMinor)}%`,
    ]);
    exportToCSV('inventory-catalogue', headers, rows);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '0 36px 36px' }}>
      {/* Header */}
      <section className="heading" style={{ paddingLeft: 0, paddingRight: 0, paddingBottom: 0 }}>
        <div>
          <em>CATALOGUE & STOCK LEDGER</em>
          <h1>Inventory Management</h1>
          <span>Manage SKU items, reorder thresholds, gross profit margins, and stock audits.</span>
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
            onClick={() => setCreateModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={15} />
            Add Product
          </button>
        </div>
      </section>

      {/* View Switcher: Catalogue vs Movements */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e1e7ec', gap: 24 }}>
        <button
          onClick={() => setSubTab('catalogue')}
          style={{
            border: 0,
            background: 'transparent',
            padding: '10px 4px 14px',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            color: subTab === 'catalogue' ? '#147c70' : '#778899',
            borderBottom: subTab === 'catalogue' ? '3px solid #147c70' : '3px solid transparent',
          }}
        >
          Product Catalogue ({products.length})
        </button>
        <button
          onClick={() => setSubTab('movements')}
          style={{
            border: 0,
            background: 'transparent',
            padding: '10px 4px 14px',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            color: subTab === 'movements' ? '#147c70' : '#778899',
            borderBottom: subTab === 'movements' ? '3px solid #147c70' : '3px solid transparent',
          }}
        >
          Stock Movement Audit Trail
        </button>
      </div>

      {subTab === 'catalogue' ? (
        <>
          {/* Search & Filter Bar */}
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
                placeholder="Search products by name, SKU, or barcode..."
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

            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button
                onClick={() => setLowStockOnly(!lowStockOnly)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  border: lowStockOnly ? '1px solid #c5281b' : '1px solid #dce4e8',
                  background: lowStockOnly ? '#fdeeed' : '#ffffff',
                  color: lowStockOnly ? '#c5281b' : '#657788',
                  padding: '8px 14px',
                  borderRadius: 7,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <AlertTriangle size={14} />
                Low Stock Only
              </button>

              <button
                onClick={onRefresh}
                disabled={loading}
                style={{
                  border: '1px solid #dce4e8',
                  background: '#ffffff',
                  borderRadius: 7,
                  padding: '8px 12px',
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
          </div>

          {/* Products Table */}
          <div className="panel" style={{ background: '#ffffff', borderRadius: 12, padding: 0, border: '1px solid #e3e8ec', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', margin: 0 }}>
              <thead>
                <tr style={{ background: '#f8fafb', borderBottom: '1px solid #e8eff4' }}>
                  <th style={{ padding: '12px 18px', fontSize: 11, color: '#7a8a97', textAlign: 'left', fontWeight: 700 }}>Item Name</th>
                  <th style={{ padding: '12px 18px', fontSize: 11, color: '#7a8a97', textAlign: 'left', fontWeight: 700 }}>SKU / Barcode</th>
                  <th style={{ padding: '12px 18px', fontSize: 11, color: '#7a8a97', textAlign: 'right', fontWeight: 700 }}>Cost Price</th>
                  <th style={{ padding: '12px 18px', fontSize: 11, color: '#7a8a97', textAlign: 'right', fontWeight: 700 }}>Selling Price</th>
                  <th style={{ padding: '12px 18px', fontSize: 11, color: '#7a8a97', textAlign: 'center', fontWeight: 700 }}>Gross Margin</th>
                  <th style={{ padding: '12px 18px', fontSize: 11, color: '#7a8a97', textAlign: 'center', fontWeight: 700 }}>Stock Level</th>
                  <th style={{ padding: '12px 18px', fontSize: 11, color: '#7a8a97', textAlign: 'center', fontWeight: 700 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: '#8898a6' }}>
                      No items match your search or filter.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => {
                    const isLow = p.stockQuantity <= p.reorderLevel;
                    const margin = calculateMargin(p.costPriceMinor, p.sellingPriceMinor);
                    return (
                      <tr key={p.id} style={{ borderBottom: '1px solid #f0f3f6' }}>
                        <td style={{ padding: '14px 18px' }}>
                          <strong style={{ fontSize: 13, color: '#13283b', display: 'block' }}>{p.name}</strong>
                          <span style={{ fontSize: 11, color: '#8898a6' }}>Min Threshold: {p.reorderLevel}</span>
                        </td>
                        <td style={{ padding: '14px 18px', color: '#556677', fontSize: 12 }}>
                          {p.sku || p.barcode || '—'}
                        </td>
                        <td style={{ padding: '14px 18px', textAlign: 'right', color: '#667788', fontSize: 12 }}>
                          {formatKES(p.costPriceMinor)}
                        </td>
                        <td style={{ padding: '14px 18px', textAlign: 'right', fontWeight: 700, color: '#107c6f', fontSize: 13 }}>
                          {formatKES(p.sellingPriceMinor)}
                        </td>
                        <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                          <Badge variant={margin >= 25 ? 'success' : margin > 10 ? 'warning' : 'danger'}>
                            {margin}%
                          </Badge>
                        </td>
                        <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              color: isLow ? '#c5281b' : '#13283b',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                            }}
                          >
                            {isLow && <AlertTriangle size={13} color="#c5281b" />}
                            {p.stockQuantity}
                          </span>
                        </td>
                        <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                          <button
                            onClick={() => setAdjustModal(p)}
                            style={{
                              border: '1px solid #dce4e8',
                              background: '#ffffff',
                              borderRadius: 6,
                              padding: '6px 12px',
                              cursor: 'pointer',
                              fontSize: 11,
                              fontWeight: 600,
                              color: '#147c70',
                            }}
                          >
                            Adjust Stock
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        /* Stock Movements Audit Trail Tab */
        <div className="panel" style={{ background: '#ffffff', borderRadius: 12, padding: 0, border: '1px solid #e3e8ec', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #edf2f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#13283b' }}>
                Stock Movements Ledger
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#778899' }}>
                Immutable historical timeline of receives, count corrections, and shrinkage
              </p>
            </div>
            <button
              onClick={loadMovements}
              disabled={loadingMovements}
              style={{
                border: '1px solid #dce4e8',
                background: '#ffffff',
                borderRadius: 7,
                padding: '6px 12px',
                cursor: 'pointer',
                fontSize: 11,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <RefreshCw size={12} className={loadingMovements ? 'spin' : ''} />
              Refresh Log
            </button>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', margin: 0 }}>
            <thead>
              <tr style={{ background: '#f8fafb', borderBottom: '1px solid #e8eff4' }}>
                <th style={{ padding: '12px 18px', fontSize: 11, color: '#7a8a97', textAlign: 'left', fontWeight: 700 }}>Timestamp</th>
                <th style={{ padding: '12px 18px', fontSize: 11, color: '#7a8a97', textAlign: 'left', fontWeight: 700 }}>Product Name</th>
                <th style={{ padding: '12px 18px', fontSize: 11, color: '#7a8a97', textAlign: 'left', fontWeight: 700 }}>Movement Type</th>
                <th style={{ padding: '12px 18px', fontSize: 11, color: '#7a8a97', textAlign: 'right', fontWeight: 700 }}>Quantity Delta</th>
                <th style={{ padding: '12px 18px', fontSize: 11, color: '#7a8a97', textAlign: 'left', fontWeight: 700 }}>Reason / Note</th>
                <th style={{ padding: '12px 18px', fontSize: 11, color: '#7a8a97', textAlign: 'left', fontWeight: 700 }}>Authorized By</th>
              </tr>
            </thead>
            <tbody>
              {movements.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: '#8898a6' }}>
                    No stock movements recorded yet.
                  </td>
                </tr>
              ) : (
                movements.map((sm) => {
                  const isPositive = sm.quantityChange > 0;
                  return (
                    <tr key={sm.id} style={{ borderBottom: '1px solid #f0f3f6' }}>
                      <td style={{ padding: '12px 18px', fontSize: 12, color: '#657788' }}>
                        {formatDateTime(sm.createdAt)}
                      </td>
                      <td style={{ padding: '12px 18px', fontWeight: 700, color: '#13283b', fontSize: 13 }}>
                        {sm.productName}
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        <Badge variant={sm.type === 'receive' ? 'success' : sm.type === 'waste' ? 'danger' : 'info'}>
                          {sm.type}
                        </Badge>
                      </td>
                      <td style={{ padding: '12px 18px', textAlign: 'right', fontWeight: 700, fontSize: 13, color: isPositive ? '#107c6f' : '#c5281b' }}>
                        {isPositive ? `+${sm.quantityChange}` : sm.quantityChange}
                      </td>
                      <td style={{ padding: '12px 18px', fontSize: 12, color: '#445566' }}>
                        {sm.reason}
                      </td>
                      <td style={{ padding: '12px 18px', fontSize: 12, color: '#657788' }}>
                        {sm.userName}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {adjustModal && (
        <Modal
          isOpen={!!adjustModal}
          onClose={() => setAdjustModal(null)}
          title={`Adjust Stock: ${adjustModal.name}`}
          subtitle={`Current stock: ${adjustModal.stockQuantity} units`}
          maxWidth={440}
        >
          <form onSubmit={handleAdjustStock} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#334455' }}>
              Movement Action
              <select
                value={adjustType}
                onChange={(e) => setAdjustType(e.target.value as any)}
                style={{ width: '100%', marginTop: 6, padding: '9px 12px', border: '1px solid #dce4e8', borderRadius: 7, fontSize: 13 }}
              >
                <option value="receive">Restock / Receive Delivery (+)</option>
                <option value="waste">Damaged / Spoilage / Expired (-)</option>
                <option value="count_adjust">Inventory Count Correction (+/-)</option>
              </select>
            </label>

            <label style={{ fontSize: 12, fontWeight: 700, color: '#334455' }}>
              Quantity Units
              <input
                type="number"
                required
                min="1"
                value={adjustQty}
                onChange={(e) => setAdjustQty(e.target.value)}
                style={{ width: '100%', marginTop: 6, padding: '9px 12px', border: '1px solid #dce4e8', borderRadius: 7, fontSize: 13 }}
              />
            </label>

            <label style={{ fontSize: 12, fontWeight: 700, color: '#334455' }}>
              Reason for Adjustment
              <input
                type="text"
                required
                placeholder="e.g. Supplier order PO-902, Broken bottle"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                style={{ width: '100%', marginTop: 6, padding: '9px 12px', border: '1px solid #dce4e8', borderRadius: 7, fontSize: 13 }}
              />
            </label>

            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: 8, fontSize: 12, color: '#556677' }}>
              Resulting Stock Level:{' '}
              <strong style={{ color: '#13283b', fontSize: 14 }}>
                {adjustType === 'waste'
                  ? adjustModal.stockQuantity - Number(adjustQty || 0)
                  : adjustModal.stockQuantity + Number(adjustQty || 0)}{' '}
                units
              </strong>
            </div>

            <button
              type="submit"
              className="primary"
              disabled={adjusting}
              style={{ padding: 12, marginTop: 8 }}
            >
              {adjusting ? 'Updating Stock...' : 'Confirm Stock Adjustment'}
            </button>
          </form>
        </Modal>
      )}

      {/* Add Product Modal */}
      {createModal && (
        <Modal
          isOpen={createModal}
          onClose={() => setCreateModal(false)}
          title="Add New Catalogue Item"
          subtitle="Add an item to the business price book"
          maxWidth={480}
        >
          <form onSubmit={handleCreateProduct} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#334455' }}>
              Item Name *
              <input
                required
                type="text"
                placeholder="e.g. Washing Powder 500g"
                value={newProdName}
                onChange={(e) => setNewProdName(e.target.value)}
                style={{ width: '100%', marginTop: 6, padding: '9px 12px', border: '1px solid #dce4e8', borderRadius: 7, fontSize: 13 }}
              />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#334455' }}>
                SKU Code
                <input
                  type="text"
                  placeholder="e.g. WASH-500"
                  value={newProdSku}
                  onChange={(e) => setNewProdSku(e.target.value)}
                  style={{ width: '100%', marginTop: 6, padding: '9px 12px', border: '1px solid #dce4e8', borderRadius: 7, fontSize: 13 }}
                />
              </label>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#334455' }}>
                Barcode
                <input
                  type="text"
                  placeholder="e.g. 616400012345"
                  value={newProdBarcode}
                  onChange={(e) => setNewProdBarcode(e.target.value)}
                  style={{ width: '100%', marginTop: 6, padding: '9px 12px', border: '1px solid #dce4e8', borderRadius: 7, fontSize: 13 }}
                />
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#334455' }}>
                Cost Price (KES) *
                <input
                  required
                  type="number"
                  step="0.5"
                  placeholder="e.g. 120"
                  value={newProdCost}
                  onChange={(e) => setNewProdCost(e.target.value)}
                  style={{ width: '100%', marginTop: 6, padding: '9px 12px', border: '1px solid #dce4e8', borderRadius: 7, fontSize: 13 }}
                />
              </label>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#334455' }}>
                Selling Price (KES) *
                <input
                  required
                  type="number"
                  step="0.5"
                  placeholder="e.g. 150"
                  value={newProdPrice}
                  onChange={(e) => setNewProdPrice(e.target.value)}
                  style={{ width: '100%', marginTop: 6, padding: '9px 12px', border: '1px solid #dce4e8', borderRadius: 7, fontSize: 13 }}
                />
              </label>
            </div>

            <label style={{ fontSize: 12, fontWeight: 700, color: '#334455' }}>
              Reorder Warning Threshold
              <input
                type="number"
                min="0"
                value={newProdReorder}
                onChange={(e) => setNewProdReorder(e.target.value)}
                style={{ width: '100%', marginTop: 6, padding: '9px 12px', border: '1px solid #dce4e8', borderRadius: 7, fontSize: 13 }}
              />
            </label>

            {newProdCost && newProdPrice && (
              <div style={{ background: '#e8f7f2', padding: 12, borderRadius: 8, fontSize: 12, color: '#107c6f' }}>
                Estimated Margin:{' '}
                <strong>
                  {calculateMargin(Number(newProdCost) * 100, Number(newProdPrice) * 100)}%
                </strong>{' '}
                (Profit: KES {(Number(newProdPrice) - Number(newProdCost)).toFixed(2)} per unit)
              </div>
            )}

            <button
              type="submit"
              className="primary"
              disabled={creating}
              style={{ padding: 12, marginTop: 8 }}
            >
              {creating ? 'Saving...' : 'Add Item to Catalogue'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
