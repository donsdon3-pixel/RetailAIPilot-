'use client';

import React, { useState, useEffect } from 'react';
import { AppStore, AppState } from '@/lib/store';
import { Product, PaymentMethod, PaymentRecord, SalesOrder, Customer } from '@/lib/types';
import { LedgerService } from '@/lib/ledger-service';
import { formatCurrency, CURRENCY_SYMBOL } from '@/lib/format';
import {
  Search,
  Barcode,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CreditCard,
  Banknote,
  Smartphone,
  Award,
  CheckCircle2,
  Printer,
  FileText,
  RotateCcw,
  Sparkles,
  UserPlus,
} from 'lucide-react';

export default function POSTerminal() {
  const [state, setState] = useState<AppState>(AppStore.getState());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [discountPercent, setDiscountPercent] = useState<number>(0);

  // Split Payment Modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [splitPayments, setSplitPayments] = useState<{ method: PaymentMethod; amount: number }[]>([
    { method: 'CASH', amount: 0 },
  ]);

  // Invoice / Receipt Modal State
  const [completedOrder, setCompletedOrder] = useState<SalesOrder | null>(null);
  const [showScannerModal, setShowScannerModal] = useState(false);

  useEffect(() => {
    AppStore.initClient();
    setState({ ...AppStore.getState() });
    return AppStore.subscribe(() => {
      setState({ ...AppStore.getState() });
    });
  }, []);

  const currentOrg = state.organizations.find((o) => o.id === state.currentOrgId);
  const currentStore = state.stores.find((s) => s.id === state.currentStoreId);
  const orgProducts = state.products.filter((p) => p.organization_id === state.currentOrgId);
  const orgCategories = state.categories.filter((c) => c.organization_id === state.currentOrgId);
  const orgCustomers = state.customers.filter((c) => c.organization_id === state.currentOrgId);

  // Calculate live stock balances
  const balances = LedgerService.calculateStockBalances(
    state.currentOrgId,
    state.currentStoreId,
    state.ledgerEntries,
    state.products
  );

  const getStockForProduct = (prodId: string) => {
    const b = balances.find((bal) => bal.product_id === prodId);
    return b ? b.current_stock : 0;
  };

  // Filter products
  const filteredProducts = orgProducts.filter((p) => {
    const matchesSearch =
      (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.sku || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.barcode || '').includes(searchQuery);
    const matchesCat = selectedCategory === 'ALL' || p.category_id === selectedCategory;
    return matchesSearch && matchesCat;
  });

  // Cart operations
  const addToCart = (product: Product) => {
    const currentInCart = cart.find((i) => i.product.id === product.id)?.quantity || 0;
    const availableStock = getStockForProduct(product.id);

    if (currentInCart + 1 > availableStock) {
      alert(`Cannot add: Only ${availableStock} units in stock for ${product.name}!`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            const available = getStockForProduct(productId);
            if (newQty > available) {
              alert(`Only ${available} units available in stock!`);
              return item;
            }
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as { product: Product; quantity: number }[];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.product.selling_price * item.quantity, 0);
  const discountAmount = (subtotal * discountPercent) / 100;
  const taxableSubtotal = subtotal - discountAmount;
  const taxRate = currentOrg?.tax_rate ?? 12.0;
  const taxAmount = (taxableSubtotal * taxRate) / 100;
  const totalAmount = taxableSubtotal + taxAmount;
  const totalCOGS = cart.reduce((sum, item) => sum + item.product.unit_cost * item.quantity, 0);

  // Split Payment calculations
  const totalPaid = splitPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const remainingDue = Math.max(0, parseFloat((totalAmount - totalPaid).toFixed(2)));

  const handleOpenPayment = () => {
    if (cart.length === 0) return;
    setSplitPayments([{ method: 'CASH', amount: parseFloat(totalAmount.toFixed(2)) }]);
    setShowPaymentModal(true);
  };

  const handleAddPaymentSplit = () => {
    if (remainingDue <= 0) return;
    setSplitPayments((prev) => [...prev, { method: 'CREDIT_CARD', amount: remainingDue }]);
  };

  const handleCompleteSale = () => {
    if (Math.abs(totalPaid - totalAmount) > 0.05) {
      alert(`Payment discrepancy: Total due is ${formatCurrency(totalAmount)}, paid ${formatCurrency(totalPaid)}`);
      return;
    }

    const cust = orgCustomers.find((c) => c.id === selectedCustomerId);
    const invoiceNum = `INV-${Date.now().toString().slice(-6)}`;

    const salesOrder: SalesOrder = {
      id: `ord_${Date.now()}`,
      organization_id: state.currentOrgId,
      store_id: state.currentStoreId,
      store_name: currentStore?.name,
      customer_id: selectedCustomerId || undefined,
      customer_name: cust?.name,
      cashier_id: state.currentUser.id,
      cashier_name: state.currentUser.full_name,
      invoice_number: invoiceNum,
      subtotal: parseFloat(subtotal.toFixed(2)),
      discount_amount: parseFloat(discountAmount.toFixed(2)),
      tax_amount: parseFloat(taxAmount.toFixed(2)),
      total_amount: parseFloat(totalAmount.toFixed(2)),
      cogs_amount: parseFloat(totalCOGS.toFixed(2)),
      status: 'COMPLETED',
      payments: splitPayments.map((p, idx) => ({
        id: `pay_${Date.now()}_${idx}`,
        sales_order_id: `ord_${Date.now()}`,
        payment_method: p.method,
        amount: Number(p.amount),
        reference_transaction_id: `TXN-${p.method}-${Date.now().toString().slice(-4)}`,
        created_at: new Date().toISOString(),
      })),
      items: cart.map((item, idx) => ({
        id: `item_${Date.now()}_${idx}`,
        sales_order_id: `ord_${Date.now()}`,
        product_id: item.product.id,
        product_name: item.product.name,
        sku: item.product.sku,
        quantity: item.quantity,
        unit_cost: item.product.unit_cost,
        unit_price: item.product.selling_price,
        subtotal: parseFloat((item.quantity * item.product.selling_price).toFixed(2)),
        cogs: parseFloat((item.quantity * item.product.unit_cost).toFixed(2)),
      })),
      created_at: new Date().toISOString(),
    };

    // Execute atomic checkout with immutable ledger deduction
    AppStore.processCheckout(salesOrder);

    // Persist to backend API & Supabase
    fetch('/api/pos/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(salesOrder),
    })
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          console.warn('[POS API Persistence Failed]:', errData);
        } else {
          console.log('[POS Sale Persisted to Supabase Successfully]');
        }
      })
      .catch((err) => console.warn('[POS API Persistence Error]', err));

    // Show receipt modal and reset cart
    setCompletedOrder(salesOrder);
    setShowPaymentModal(false);
    setCart([]);
    setDiscountPercent(0);
  };

  return (
    <div className="h-[calc(100vh-6.5rem)] flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto">
      {/* Product Catalog & Search (Left) */}
      <div className="flex-1 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Search & Category Filter Bar */}
        <div className="p-4 border-b border-slate-100 space-y-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="text"
                aria-label="Search SKU, Product Name, or Barcode"
                placeholder="Search SKU, Product Name, or Barcode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-500 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none transition"
              />
            </div>
            <button
              type="button"
              aria-label="Open Barcode Scanner Modal"
              onClick={() => setShowScannerModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
            >
              <Barcode className="w-4 h-4 text-emerald-400" />
              <span>Scan Barcode</span>
            </button>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none ${
                selectedCategory === 'ALL'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All Categories
            </button>
            {orgCategories.map((c) => (
              <button
                type="button"
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none ${
                  selectedCategory === c.id
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredProducts.map((p) => {
            const stock = getStockForProduct(p.id);
            const isOutOfStock = stock <= 0;
            const isLow = stock <= p.reorder_point;

            return (
              <button
                type="button"
                key={p.id}
                onClick={() => !isOutOfStock && addToCart(p)}
                disabled={isOutOfStock}
                aria-label={`Add ${p.name} to order cart. Price: ${formatCurrency(p.selling_price)}, Stock: ${stock}`}
                className={`p-3.5 rounded-xl border transition flex flex-col justify-between text-left group focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none ${
                  isOutOfStock
                    ? 'bg-slate-50 border-slate-200 opacity-50 cursor-not-allowed'
                    : 'bg-white hover:border-emerald-500 hover:shadow-md border-slate-200 cursor-pointer'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 mb-1">
                    <span className="font-mono">{p.sku}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded font-bold ${
                        isOutOfStock
                          ? 'bg-rose-100 text-rose-800'
                          : isLow
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-emerald-50 text-emerald-800'
                      }`}
                    >
                      {stock} in stock
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 line-clamp-2 group-hover:text-emerald-700 transition">
                    {p.name}
                  </h4>
                </div>

                <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100 w-full">
                  <div className="text-sm font-black text-slate-900 font-mono">
                    {formatCurrency(p.selling_price)}
                  </div>
                  <span
                    className="w-7 h-7 rounded-lg bg-emerald-50 group-hover:bg-emerald-600 text-emerald-700 group-hover:text-white flex items-center justify-center transition"
                  >
                    <Plus className="w-4 h-4" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Cart & Split Payment Checkout (Right) */}
      <div className="w-full lg:w-96 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Cart Header & Customer Selector */}
        <div className="p-4 border-b border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-emerald-600" /> Active Order Cart
            </h3>
            <span className="text-xs bg-slate-100 text-slate-800 font-bold px-2 py-0.5 rounded-full">
              {cart.reduce((s, i) => s + i.quantity, 0)} items
            </span>
          </div>

          {/* Customer Attachment */}
          <div className="flex items-center gap-2">
            <label htmlFor="pos-customer-select" className="sr-only">Attach Registered Customer</label>
            <select
              id="pos-customer-select"
              aria-label="Attach Registered Customer"
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
            >
              <option value="">Walk-in Guest Customer</option>
              {orgCustomers.map((cust) => (
                <option key={cust.id} value={cust.id}>
                  {cust.name} ({cust.loyalty_points} pts)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2 py-12">
              <ShoppingCart className="w-10 h-10 stroke-1 text-slate-400" />
              <p className="text-xs font-semibold text-slate-700">Cart is empty</p>
              <p className="text-[10px] text-slate-600">Click products or scan barcode to add items.</p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.product.id}
                className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3"
              >
                <div className="overflow-hidden flex-1">
                  <div className="text-xs font-bold text-slate-900 truncate">{item.product.name}</div>
                  <div className="text-[10px] text-slate-600 font-mono font-medium">
                    {formatCurrency(item.product.selling_price)} each
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-white border border-slate-300 rounded-lg p-0.5 shadow-sm">
                    <button
                      type="button"
                      aria-label={`Decrease quantity of ${item.product.name}`}
                      onClick={() => updateQuantity(item.product.id, -1)}
                      className="p-1 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded transition focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center text-xs font-bold font-mono text-slate-900">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      aria-label={`Increase quantity of ${item.product.name}`}
                      onClick={() => updateQuantity(item.product.id, 1)}
                      className="p-1 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded transition focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <button
                    type="button"
                    aria-label={`Remove ${item.product.name} from cart`}
                    onClick={() => removeFromCart(item.product.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-600 transition focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Order Summary & Checkout Trigger */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 space-y-3">
          <div className="space-y-1.5 text-xs text-slate-700">
            <div className="flex justify-between font-medium">
              <span>Subtotal:</span>
              <span className="font-mono font-bold text-slate-900">{formatCurrency(subtotal)}</span>
            </div>

            {/* Discount selector */}
            <div className="flex justify-between items-center">
              <label htmlFor="pos-discount-select" className="font-medium">VIP Discount:</label>
              <select
                id="pos-discount-select"
                aria-label="VIP Discount percentage"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(Number(e.target.value))}
                className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs font-mono font-bold text-slate-900 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
              >
                <option value="0">0%</option>
                <option value="5">5% Off</option>
                <option value="10">10% Off</option>
                <option value="15">15% VIP</option>
              </select>
            </div>

            <div className="flex justify-between font-medium">
              <span>Tax ({taxRate}%):</span>
              <span className="font-mono font-bold text-slate-900">{formatCurrency(taxAmount)}</span>
            </div>
            <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
              <span>Total Due:</span>
              <span className="font-mono text-emerald-700 font-bold">{formatCurrency(totalAmount)}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenPayment}
            disabled={cart.length === 0}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-lg shadow-emerald-600/20 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
          >
            <CreditCard className="w-4 h-4" />
            Proceed to Split Checkout ({formatCurrency(totalAmount)})
          </button>
        </div>
      </div>

      {/* Split Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-base text-slate-900">Multi-Method Split Payment</h3>
                <p className="text-xs text-slate-700">
                  Total Amount Due: <span className="font-bold text-emerald-700 font-mono">{formatCurrency(totalAmount)}</span>
                </p>
              </div>
              <button
                type="button"
                aria-label="Cancel split payment modal"
                onClick={() => setShowPaymentModal(false)}
                className="text-xs text-slate-600 hover:text-slate-900 font-semibold focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
              >
                Cancel
              </button>
            </div>

            {/* Split Tenders */}
            <div className="space-y-3">
              {splitPayments.map((p, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-300"
                >
                  <label htmlFor={`pos-split-method-${idx}`} className="sr-only">Payment Tender Method</label>
                  <select
                    id={`pos-split-method-${idx}`}
                    aria-label={`Payment Tender Method ${idx + 1}`}
                    value={p.method}
                    onChange={(e) => {
                      const newMethod = e.target.value as PaymentMethod;
                      setSplitPayments((prev) =>
                        prev.map((item, i) => (i === idx ? { ...item, method: newMethod } : item))
                      );
                    }}
                    className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                  >
                    <option value="CASH">💵 Cash</option>
                    <option value="CREDIT_CARD">💳 Credit Card</option>
                    <option value="DEBIT_CARD">💳 Debit Card</option>
                    <option value="UPI">📱 UPI / QR</option>
                    <option value="LOYALTY_POINTS">⭐ Loyalty Points</option>
                  </select>

                  <div className="relative flex-1">
                    <span className="absolute left-3 top-2 text-xs font-bold text-slate-600">{CURRENCY_SYMBOL}</span>
                    <input
                      type="number"
                      step="0.01"
                      aria-label={`Payment Tender Amount ${idx + 1}`}
                      value={p.amount}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setSplitPayments((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, amount: val } : item))
                        );
                      }}
                      className="w-full pl-7 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                    />
                  </div>

                  {splitPayments.length > 1 && (
                    <button
                      type="button"
                      aria-label={`Delete payment split ${idx + 1}`}
                      onClick={() =>
                        setSplitPayments((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="text-rose-600 hover:text-rose-800 p-1 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}

              {remainingDue > 0 && (
                <button
                  type="button"
                  onClick={handleAddPaymentSplit}
                  className="text-xs text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1.5 py-1 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Another Split Tender (Remaining: {formatCurrency(remainingDue)})
                </button>
              )}
            </div>

            {/* Total Balance Status */}
            <div className="p-3 rounded-xl bg-slate-100 flex items-center justify-between text-xs font-medium">
              <div>
                <span className="text-slate-700">Total Paid: </span>
                <span className="font-bold font-mono text-slate-900">{formatCurrency(totalPaid)}</span>
              </div>
              <div>
                <span className="text-slate-700">Remaining: </span>
                <span
                  className={`font-bold font-mono ${
                    remainingDue === 0 ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {formatCurrency(remainingDue)}
                </span>
              </div>
            </div>

            {/* Complete Transaction Button */}
            <button
              type="button"
              onClick={handleCompleteSale}
              disabled={remainingDue > 0.05 || totalPaid < totalAmount - 0.05}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition shadow-lg shadow-emerald-600/20 disabled:opacity-50 flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
            >
              <CheckCircle2 className="w-4 h-4" />
              Complete Sale & Deduct Immutable Stock
            </button>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal Simulation */}
      {showScannerModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Barcode className="w-4 h-4 text-emerald-600" /> Barcode Camera Viewport
              </h3>
              <button
                type="button"
                aria-label="Close Barcode Scanner Modal"
                onClick={() => setShowScannerModal(false)}
                className="text-xs text-slate-600 hover:text-slate-900 font-semibold focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
              >
                Close
              </button>
            </div>

            {/* Scanner Viewport Simulation */}
            <div className="relative h-48 bg-slate-900 rounded-xl overflow-hidden flex flex-col items-center justify-center text-slate-200">
              <div className="w-48 h-28 border-2 border-emerald-500 rounded-lg relative flex items-center justify-center">
                <div className="absolute inset-x-0 top-1/2 h-0.5 bg-rose-500 animate-pulse"></div>
                <span className="text-[10px] text-emerald-400 font-mono font-bold">SCANNING ACTIVE</span>
              </div>
              <p className="text-[11px] text-slate-300 mt-2 font-medium">Simulating high-speed optical barcode reader</p>
            </div>

            {/* Quick barcode simulation buttons */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold text-slate-700 uppercase">Simulate SKU Scan:</div>
              <div className="grid grid-cols-2 gap-2">
                {orgProducts.slice(0, 4).map((prod) => (
                  <button
                    type="button"
                    key={prod.id}
                    onClick={() => {
                      addToCart(prod);
                      setShowScannerModal(false);
                    }}
                    className="p-2 rounded-lg bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 border border-slate-200 text-left text-xs transition focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                  >
                    <div className="font-bold text-slate-900 truncate">{prod.name}</div>
                    <div className="text-[10px] font-mono text-emerald-700 font-semibold">{prod.barcode}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Thermal Invoice & Digital Receipt Modal */}
      {completedOrder && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-sm text-slate-900">Sale Completed</h3>
              </div>
              <button
                type="button"
                aria-label="Close Receipt Modal"
                onClick={() => setCompletedOrder(null)}
                className="text-xs text-slate-700 hover:text-slate-900 font-bold focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
              >
                ✕ Close
              </button>
            </div>

            {/* Printable Thermal Receipt Box */}
            <div
              id="thermal-receipt"
              className="p-4 bg-slate-50 border border-slate-300 rounded-xl font-mono text-[11px] text-slate-900 space-y-2"
            >
              <div className="text-center pb-2 border-b border-dashed border-slate-400">
                <div className="font-bold text-xs text-slate-950">{currentOrg?.name}</div>
                <div className="text-[10px] text-slate-700 font-semibold">{currentStore?.name}</div>
                <div className="text-[10px] text-slate-700">{currentStore?.address}</div>
                <div className="text-[10px] text-slate-800 font-bold">Invoice: {completedOrder.invoice_number}</div>
                <div className="text-[10px] text-slate-600">Date: {new Date(completedOrder.created_at).toLocaleString()}</div>
              </div>

              <div className="divide-y divide-dashed divide-slate-300 py-1">
                {completedOrder.items.map((item, i) => (
                  <div key={i} className="py-1 flex justify-between">
                    <div>
                      <div className="font-semibold text-slate-900">{item.product_name}</div>
                      <div className="text-[10px] text-slate-700">{item.quantity} x {formatCurrency(item.unit_price)}</div>
                    </div>
                    <div className="font-bold text-slate-900">{formatCurrency(item.subtotal)}</div>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-dashed border-slate-400 space-y-1">
                <div className="flex justify-between font-medium">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(completedOrder.subtotal)}</span>
                </div>
                {completedOrder.discount_amount > 0 && (
                  <div className="flex justify-between text-emerald-800 font-bold">
                    <span>Discount:</span>
                    <span>-{formatCurrency(completedOrder.discount_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-medium">
                  <span>Tax:</span>
                  <span>{formatCurrency(completedOrder.tax_amount)}</span>
                </div>
                <div className="flex justify-between font-bold text-xs pt-1 border-t border-slate-300 text-slate-950">
                  <span>TOTAL:</span>
                  <span>{formatCurrency(completedOrder.total_amount)}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-dashed border-slate-400">
                <div className="font-bold text-[10px] text-slate-900">Payment Tenders:</div>
                {completedOrder.payments.map((p, i) => (
                  <div key={i} className="flex justify-between text-[10px] text-slate-800 font-medium">
                    <span>{p.payment_method}:</span>
                    <span>{formatCurrency(p.amount)}</span>
                  </div>
                ))}
              </div>

              <div className="text-center pt-2 text-[10px] text-slate-700 font-medium">
                Stock ledger automatically updated. Thank you for shopping with us!
              </div>
            </div>

            {/* Print / Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
              >
                <Printer className="w-4 h-4 text-emerald-400" />
                Print Thermal Receipt
              </button>
              <button
                type="button"
                onClick={() => {
                  alert(`Digital e-receipt sent to registered customer portal!`);
                  setCompletedOrder(null);
                }}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
              >
                <FileText className="w-4 h-4" />
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
